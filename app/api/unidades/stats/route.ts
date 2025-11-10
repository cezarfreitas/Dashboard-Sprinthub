import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar estatísticas por unidade
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes') || new Date().getMonth() + 1
    const ano = searchParams.get('ano') || new Date().getFullYear()
    const vendedorId = searchParams.get('vendedorId')
    const unidadeId = searchParams.get('unidadeId')

    // Buscar unidades com filtros
    let unidadesQuery = `
      SELECT id, nome, responsavel 
      FROM unidades 
    `
    let unidadesParams: any[] = []

    // Se filtro por unidade específica
    if (unidadeId) {
      unidadesQuery += ' WHERE id = ?'
      unidadesParams.push(parseInt(unidadeId))
    }

    unidadesQuery += ' ORDER BY nome'

    const unidades = await executeQuery(unidadesQuery, unidadesParams) as Array<{
      id: number
      nome: string
      responsavel: string
    }>

    // Buscar estatísticas para cada unidade
    const unidadesComStats = await Promise.all(unidades.map(async (unidade) => {
      // Total de vendedores na unidade (contar do campo JSON users)
      let totalVendedores = 0
      const unidadeData = await executeQuery(`
        SELECT users FROM unidades WHERE id = ?
      `, [unidade.id]) as any[]
      
      if (unidadeData.length > 0 && unidadeData[0].users) {
        try {
          const parsed = typeof unidadeData[0].users === 'string' 
            ? JSON.parse(unidadeData[0].users) 
            : unidadeData[0].users
          if (Array.isArray(parsed)) {
            totalVendedores = parsed.length
          }
        } catch (e) {
          console.warn(`Erro ao parsear users da unidade ${unidade.id}:`, e)
        }
      }

      // Vendedores na fila
      const vendedoresNaFila = await executeQuery(`
        SELECT COUNT(DISTINCT fr.vendedor_id) as total
        FROM fila_roleta fr
        JOIN roletas r ON fr.roleta_id = r.id
        WHERE r.unidade_id = ?
      `, [unidade.id]) as Array<{ total: number }>

      // Construir filtros para vendedor
      let vendedorFilter = ''
      let vendedorParams: any[] = []
      
      if (vendedorId) {
        vendedorFilter = ' AND o.user = ?'
        vendedorParams.push(parseInt(vendedorId))
      }

      // Oportunidades criadas no mês
      const oportunidadesCriadas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades o
        JOIN vendedores_unidades vu ON o.user = vu.vendedor_id
        WHERE vu.unidade_id = ? 
          AND MONTH(o.createDate) = ? 
          AND YEAR(o.createDate) = ?
          ${vendedorFilter}
      `, [unidade.id, mes, ano, ...vendedorParams]) as Array<{ total: number }>

      // Oportunidades ganhas no mês
      const oportunidadesGanhas = await executeQuery(`
        SELECT COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total
        FROM oportunidades o
        JOIN vendedores_unidades vu ON o.user = vu.vendedor_id
        WHERE vu.unidade_id = ? 
          AND o.status = 'gain'
          AND MONTH(o.gain_date) = ? 
          AND YEAR(o.gain_date) = ?
          ${vendedorFilter}
      `, [unidade.id, mes, ano, ...vendedorParams]) as Array<{ total: number, valor_total: number }>

      // Oportunidades perdidas no mês
      const oportunidadesPerdidas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades o
        JOIN vendedores_unidades vu ON o.user = vu.vendedor_id
        WHERE vu.unidade_id = ? 
          AND o.status = 'lost'
          AND MONTH(o.lost_date) = ? 
          AND YEAR(o.lost_date) = ?
          ${vendedorFilter}
      `, [unidade.id, mes, ano, ...vendedorParams]) as Array<{ total: number }>

      // Oportunidades abertas
      const oportunidadesAbertas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades o
        JOIN vendedores_unidades vu ON o.user = vu.vendedor_id
        WHERE vu.unidade_id = ? 
          AND o.status IN ('open', 'aberta', 'active')
          ${vendedorFilter}
      `, [unidade.id, ...vendedorParams]) as Array<{ total: number }>

      // Meta total da unidade para o mês
      const metaUnidade = await executeQuery(`
        SELECT COALESCE(SUM(meta_valor), 0) as meta_total
        FROM metas_mensais m
        WHERE m.unidade_id = ? 
          AND m.mes = ? 
          AND m.ano = ? 
          AND m.status = 'ativa'
      `, [unidade.id, mes, ano]) as Array<{ meta_total: number }>

      // Buscar etapas do funil para a unidade
      let etapasFunilQuery = `
        SELECT 
          cf.id,
          cf.nome_coluna,
          cf.sequencia,
          COUNT(o.id) as total_oportunidades,
          COALESCE(SUM(o.value), 0) as valor_total
        FROM colunas_funil cf
        LEFT JOIN oportunidades o ON cf.id = o.crm_column 
          AND o.user IN (
            SELECT v.id FROM vendedores v 
            JOIN vendedores_unidades vu ON v.id = vu.vendedor_id 
            WHERE vu.unidade_id = ?
          )
          AND o.status = 'open'
      `
      
      let etapasFunilParams: any[] = [unidade.id]
      
      // Adicionar filtro de vendedor se especificado
      if (vendedorId) {
        etapasFunilQuery += ' AND o.user = ?'
        etapasFunilParams.push(parseInt(vendedorId))
      }
      
      etapasFunilQuery += `
        WHERE cf.id_funil = 4
        GROUP BY cf.id, cf.nome_coluna, cf.sequencia
        ORDER BY cf.sequencia ASC
      `

      const etapasFunil = await executeQuery(etapasFunilQuery, etapasFunilParams) as Array<{
        id: number
        nome_coluna: string
        sequencia: number
        total_oportunidades: number
        valor_total: number
      }>

      // Total de negócios abertos (todas as etapas do funil)
      const totalNegociosAbertos = etapasFunil.reduce((sum, etapa) => sum + etapa.total_oportunidades, 0)

      const vendedoresNaFilaTotal = vendedoresNaFila[0]?.total ?? 0
      const oportunidadesCriadasTotal = oportunidadesCriadas[0]?.total ?? 0
      const oportunidadesGanhasTotal = oportunidadesGanhas[0]?.total ?? 0
      const valorGanhoTotal = oportunidadesGanhas[0]?.valor_total ?? 0
      const oportunidadesPerdidasTotal = oportunidadesPerdidas[0]?.total ?? 0
      const oportunidadesAbertasTotal = oportunidadesAbertas[0]?.total ?? 0
      const metaMesTotal = metaUnidade[0]?.meta_total ?? 0

      return {
        id: unidade.id,
        nome: unidade.nome,
        responsavel: unidade.responsavel,
        stats: {
          total_vendedores: totalVendedores,
          vendedores_na_fila: vendedoresNaFilaTotal,
          oportunidades_criadas: oportunidadesCriadasTotal,
          oportunidades_ganhas: oportunidadesGanhasTotal,
          valor_ganho: valorGanhoTotal,
          oportunidades_perdidas: oportunidadesPerdidasTotal,
          oportunidades_abertas: oportunidadesAbertasTotal,
          meta_mes: metaMesTotal,
          total_negocios_abertos: totalNegociosAbertos,
          etapas_funil: etapasFunil
        }
      }
    }))

    return NextResponse.json({
      success: true,
      mes: Number(mes),
      ano: Number(ano),
      unidades: unidadesComStats
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas das unidades:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar estatísticas das unidades',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
