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
    // user_gestao agora é JSON array, usar JSON_CONTAINS
    const verificacao = await executeQuery(`
      SELECT id
      FROM unidades
      WHERE id = ?
        AND ativo = TRUE
        AND (
          JSON_CONTAINS(user_gestao, CAST(? AS JSON), '$')
          OR user_gestao = ?
        )
    `, [unidadeId, gestorId, gestorId]) as any[]

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
    let mes: number
    let ano: number
    
    if (dataInicio && dataFim) {
      primeiraDataMes = dataInicio
      ultimaDataMes = dataFim
      // Extrair mês e ano da data de início para a query de meta
      const dataInicioObj = new Date(dataInicio)
      mes = dataInicioObj.getMonth() + 1
      ano = dataInicioObj.getFullYear()
    } else {
      // Fallback para mês atual
      const dataAtual = new Date()
      ano = dataAtual.getFullYear()
      mes = dataAtual.getMonth() + 1
      primeiraDataMes = `${ano}-${String(mes).padStart(2, '0')}-01`
      ultimaDataMes = dataAtual.toISOString().split('T')[0]
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
    // Contar criadas (baseado em createDate) - GMT-3
    const criadas = await executeQuery(`
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE CAST(o.user AS UNSIGNED) IN (${vendedorIds.join(',')})
        AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) >= DATE(?)
        AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) <= DATE(?)
    `, [primeiraDataMes, ultimaDataMes]) as any[]
    
    // Contar ganhas (baseado em gain_date) - GMT-3
    const ganhas = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor
      FROM oportunidades o
      WHERE CAST(o.user AS UNSIGNED) IN (${vendedorIds.join(',')})
        AND o.status = 'gain'
        AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) >= DATE(?)
        AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) <= DATE(?)
    `, [primeiraDataMes, ultimaDataMes]) as any[]
    
    // Contar perdidas (baseado em lost_date) - GMT-3
    const perdidas = await executeQuery(`
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE CAST(o.user AS UNSIGNED) IN (${vendedorIds.join(',')})
        AND o.status = 'lost'
        AND DATE(CONVERT_TZ(o.lost_date, '+00:00', '-03:00')) >= DATE(?)
        AND DATE(CONVERT_TZ(o.lost_date, '+00:00', '-03:00')) <= DATE(?)
    `, [primeiraDataMes, ultimaDataMes]) as any[]
    
    // Contar abertas (criadas no período e ainda abertas) - GMT-3
    const abertas = await executeQuery(`
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE CAST(o.user AS UNSIGNED) IN (${vendedorIds.join(',')})
        AND o.status IN ('open', 'aberta', 'active')
        AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) >= DATE(?)
        AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) <= DATE(?)
    `, [primeiraDataMes, ultimaDataMes]) as any[]
    
    const stats = [{
      oportunidades_criadas: criadas[0]?.total || 0,
      oportunidades_ganhas: ganhas[0]?.total || 0,
      valor_ganho: ganhas[0]?.valor || 0,
      oportunidades_perdidas: perdidas[0]?.total || 0,
      oportunidades_abertas: abertas[0]?.total || 0
    }]

    // Estatísticas por vendedor
    const vendedoresStats = await Promise.all(
      vendedores.map(async (vendedor) => {
        // Criadas (baseado em createDate) - GMT-3
        const criadasVendedor = await executeQuery(`
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.user = ?
            AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) >= DATE(?)
            AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) <= DATE(?)
        `, [vendedor.id, primeiraDataMes, ultimaDataMes]) as any[]
        
        // Ganhas (baseado em gain_date) - GMT-3
        const ganhasVendedor = await executeQuery(`
          SELECT 
            COUNT(*) as total,
            COALESCE(SUM(o.value), 0) as valor
          FROM oportunidades o
          WHERE o.user = ?
            AND o.status = 'gain'
            AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) >= DATE(?)
            AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) <= DATE(?)
        `, [vendedor.id, primeiraDataMes, ultimaDataMes]) as any[]
        
        // Perdidas (baseado em lost_date) - GMT-3
        const perdidasVendedor = await executeQuery(`
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.user = ?
            AND o.status = 'lost'
            AND DATE(CONVERT_TZ(o.lost_date, '+00:00', '-03:00')) >= DATE(?)
            AND DATE(CONVERT_TZ(o.lost_date, '+00:00', '-03:00')) <= DATE(?)
        `, [vendedor.id, primeiraDataMes, ultimaDataMes]) as any[]
        
        // Abertas (criadas no período e ainda abertas) - GMT-3
        const abertasVendedor = await executeQuery(`
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.user = ?
            AND o.status IN ('open', 'aberta', 'active')
            AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) >= DATE(?)
            AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) <= DATE(?)
        `, [vendedor.id, primeiraDataMes, ultimaDataMes]) as any[]

        // Buscar meta do vendedor
        const meta = await executeQuery(`
          SELECT COALESCE(meta_valor, 0) as meta
          FROM metas_mensais
          WHERE vendedor_id = ?
            AND unidade_id = ?
            AND mes = ?
            AND ano = ?
            AND status = 'ativa'
        `, [vendedor.id, unidadeId, mes, ano]) as any[]

        return {
          id: vendedor.id,
          name: vendedor.name,
          lastName: vendedor.lastName,
          oportunidades_criadas: criadasVendedor[0]?.total || 0,
          oportunidades_ganhas: ganhasVendedor[0]?.total || 0,
          valor_ganho: parseFloat(ganhasVendedor[0]?.valor) || 0,
          oportunidades_perdidas: perdidasVendedor[0]?.total || 0,
          oportunidades_abertas: abertasVendedor[0]?.total || 0,
          meta: meta[0]?.meta || 0
        }
      })
    )

    // Buscar meta total da unidade
    const metaTotal = vendedoresStats.reduce((acc, v) => acc + v.meta, 0)

    // Buscar distribuição por etapas do funil - GMT-3
    const etapasFunil = await executeQuery(`
      SELECT 
        cf.id,
        cf.nome as nome_coluna,
        cf.ordem as sequencia,
        COUNT(DISTINCT o.id) as total_oportunidades,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      WHERE CAST(o.user AS UNSIGNED) IN (${vendedorIds.join(',')})
        AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) >= DATE(?)
        AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) <= DATE(?)
        AND o.status IN ('open', 'aberta', 'active')
      GROUP BY cf.id, cf.nome, cf.ordem
      ORDER BY cf.ordem
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

