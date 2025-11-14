import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Obter estatísticas da unidade do gestor
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gestorId = searchParams.get('gestorId')
    const unidadeId = searchParams.get('unidadeId')

    if (!gestorId || !unidadeId) {
      return NextResponse.json(
        { success: false, message: 'gestorId e unidadeId são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o gestor é realmente gestor da unidade
    const verificacao = await executeQuery(`
      SELECT id
      FROM unidades
      WHERE id = ?
        AND user_gestao = ?
        AND ativo = TRUE
    `, [unidadeId, gestorId]) as any[]

    if (verificacao.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado: você não é gestor desta unidade' },
        { status: 403 }
      )
    }

    // Obter período das query params ou usar mês atual como padrão
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    
    let primeiraDataMes: string
    let ultimaDataMes: string
    
    if (dataInicio && dataFim) {
      primeiraDataMes = dataInicio
      ultimaDataMes = dataFim
      console.log('=== API gestor/stats - Período ===')
      console.log('Data Início:', primeiraDataMes)
      console.log('Data Fim:', ultimaDataMes)
    } else {
      // Fallback para mês atual
      const dataAtual = new Date()
      const ano = dataAtual.getFullYear()
      const mes = dataAtual.getMonth() + 1
      primeiraDataMes = `${ano}-${String(mes).padStart(2, '0')}-01`
      ultimaDataMes = dataAtual.toISOString().split('T')[0]
      console.log('=== API gestor/stats - Usando mês atual ===')
      console.log('Data Início:', primeiraDataMes)
      console.log('Data Fim:', ultimaDataMes)
    }

    // Buscar vendedores da unidade (exceto o gestor)
    // Buscar tanto pela coluna unidade_id (se existir) quanto pelo campo users da unidade
    const vendedores = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName
      FROM vendedores v
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE (v.unidade_id = ? OR u.id = ?)
        AND v.id != ?
    `, [unidadeId, unidadeId, gestorId]) as Array<{
      id: number
      name: string
      lastName: string
    }>

    const vendedorIds = vendedores.map(v => v.id)

    // Se não houver vendedores, retornar estatísticas vazias
    if (vendedorIds.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total_vendedores: 0,
          oportunidades_criadas: 0,
          oportunidades_ganhas: 0,
          valor_ganho: 0,
          oportunidades_perdidas: 0,
          oportunidades_abertas: 0,
          vendedores: [],
          meta_total: 0,
          etapas_funil: []
        }
      })
    }

    // Estatísticas gerais da equipe
    console.log('Executando query stats com:', { primeiraDataMes, ultimaDataMes, vendedorIds })
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as oportunidades_criadas,
        SUM(CASE WHEN o.ganho = 1 THEN 1 ELSE 0 END) as oportunidades_ganhas,
        SUM(CASE WHEN o.ganho = 1 THEN o.valor ELSE 0 END) as valor_ganho,
        SUM(CASE WHEN o.perda = 1 THEN 1 ELSE 0 END) as oportunidades_perdidas,
        SUM(CASE WHEN o.ganho = 0 AND o.perda = 0 THEN 1 ELSE 0 END) as oportunidades_abertas
      FROM oportunidades o
      WHERE o.vendedor_id IN (${vendedorIds.join(',')})
        AND DATE(o.created_date) >= DATE(?)
        AND DATE(o.created_date) <= DATE(?)
    `, [primeiraDataMes, ultimaDataMes]) as any[]
    console.log('Resultado stats:', stats)

    // Estatísticas por vendedor
    const vendedoresStats = await Promise.all(
      vendedores.map(async (vendedor) => {
        const vendedorStats = await executeQuery(`
          SELECT 
            COUNT(*) as oportunidades_criadas,
            SUM(CASE WHEN o.ganho = 1 THEN 1 ELSE 0 END) as oportunidades_ganhas,
            SUM(CASE WHEN o.ganho = 1 THEN o.valor ELSE 0 END) as valor_ganho,
            SUM(CASE WHEN o.perda = 1 THEN 1 ELSE 0 END) as oportunidades_perdidas,
            SUM(CASE WHEN o.ganho = 0 AND o.perda = 0 THEN 1 ELSE 0 END) as oportunidades_abertas
          FROM oportunidades o
          WHERE o.vendedor_id = ?
            AND DATE(o.created_date) >= DATE(?)
            AND DATE(o.created_date) <= DATE(?)
        `, [vendedor.id, primeiraDataMes, ultimaDataMes]) as any[]

        // Buscar meta do vendedor
        const meta = await executeQuery(`
          SELECT valor_meta
          FROM vendedores_metas
          WHERE vendedor_id = ?
            AND mes = ?
            AND ano = ?
        `, [vendedor.id, mes, ano]) as any[]

        return {
          id: vendedor.id,
          name: vendedor.name,
          lastName: vendedor.lastName,
          oportunidades_criadas: vendedorStats[0].oportunidades_criadas || 0,
          oportunidades_ganhas: vendedorStats[0].oportunidades_ganhas || 0,
          valor_ganho: parseFloat(vendedorStats[0].valor_ganho) || 0,
          oportunidades_perdidas: vendedorStats[0].oportunidades_perdidas || 0,
          oportunidades_abertas: vendedorStats[0].oportunidades_abertas || 0,
          meta: meta.length > 0 ? parseFloat(meta[0].valor_meta) : 0
        }
      })
    )

    // Buscar meta total da unidade
    const metaTotal = vendedoresStats.reduce((acc, v) => acc + v.meta, 0)

    // Buscar distribuição por etapas do funil
    const etapasFunil = await executeQuery(`
      SELECT 
        c.id,
        c.nome_coluna,
        c.sequencia,
        COUNT(DISTINCT o.id) as total_oportunidades,
        SUM(o.valor) as valor_total
      FROM oportunidades o
      JOIN colunas c ON o.coluna_id = c.id
      WHERE o.vendedor_id IN (${vendedorIds.join(',')})
        AND DATE(o.created_date) >= DATE(?)
        AND DATE(o.created_date) <= DATE(?)
        AND o.ganho = 0
        AND o.perda = 0
      GROUP BY c.id, c.nome_coluna, c.sequencia
      ORDER BY c.sequencia
    `, [primeiraDataMes, ultimaDataMes]) as any[]

    return NextResponse.json({
      success: true,
      stats: {
        total_vendedores: vendedores.length,
        oportunidades_criadas: stats[0].oportunidades_criadas || 0,
        oportunidades_ganhas: stats[0].oportunidades_ganhas || 0,
        valor_ganho: parseFloat(stats[0].valor_ganho) || 0,
        oportunidades_perdidas: stats[0].oportunidades_perdidas || 0,
        oportunidades_abertas: stats[0].oportunidades_abertas || 0,
        vendedores: vendedoresStats,
        meta_total: metaTotal,
        etapas_funil: etapasFunil.map(e => ({
          id: e.id,
          nome_coluna: e.nome_coluna,
          sequencia: e.sequencia,
          total_oportunidades: e.total_oportunidades,
          valor_total: parseFloat(e.valor_total) || 0
        }))
      }
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas do gestor:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

