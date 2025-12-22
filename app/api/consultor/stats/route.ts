import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar estatísticas do consultor
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const consultorId = searchParams.get('consultorId')

    if (!consultorId) {
      return NextResponse.json(
        { success: false, message: 'ID do consultor é obrigatório' },
        { status: 400 }
      )
    }

    // Usar mês e ano atual
    const dataAtual = new Date()
    const mes = dataAtual.getMonth() + 1
    const ano = dataAtual.getFullYear()

    // Oportunidades criadas no mês
    const oportunidadesCriadas = await executeQuery(`
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE o.user = ? 
        AND MONTH(o.createDate) = ? 
        AND YEAR(o.createDate) = ?
    `, [parseInt(consultorId), mes, ano]) as Array<{ total: number }>

    // Oportunidades ganhas no mês
    const oportunidadesGanhas = await executeQuery(`
      SELECT COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.user = ? 
        AND o.status = 'gain'
        AND MONTH(o.gain_date) = ? 
        AND YEAR(o.gain_date) = ?
    `, [parseInt(consultorId), mes, ano]) as Array<{ total: number, valor_total: number }>

    // Oportunidades perdidas no mês
    const oportunidadesPerdidas = await executeQuery(`
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE o.user = ? 
        AND o.status = 'lost'
        AND MONTH(o.lost_date) = ? 
        AND YEAR(o.lost_date) = ?
    `, [parseInt(consultorId), mes, ano]) as Array<{ total: number }>

    // Oportunidades abertas
    const oportunidadesAbertas = await executeQuery(`
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE o.user = ? 
        AND o.status IN ('open', 'aberta', 'active')
    `, [parseInt(consultorId)]) as Array<{ total: number }>

    // Meta do consultor para o mês
    const metaConsultor = await executeQuery(`
      SELECT COALESCE(SUM(meta_valor), 0) as meta_total
      FROM metas_mensais m
      WHERE m.vendedor_id = ? 
        AND m.mes = ? 
        AND m.ano = ? 
    `, [parseInt(consultorId), mes, ano]) as Array<{ meta_total: number }>

    // Buscar etapas do funil para o consultor
    const etapasFunil = await executeQuery(`
      SELECT 
        cf.id,
        cf.nome_coluna,
        cf.sequencia,
        COUNT(o.id) as total_oportunidades,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM colunas_funil cf
      LEFT JOIN oportunidades o ON cf.id = o.crm_column 
        AND o.user = ?
        AND o.status = 'open'
      WHERE cf.id_funil = 4
      GROUP BY cf.id, cf.nome_coluna, cf.sequencia
      ORDER BY cf.sequencia ASC
    `, [parseInt(consultorId)]) as Array<{
      id: number
      nome_coluna: string
      sequencia: number
      total_oportunidades: number
      valor_total: number
    }>

    return NextResponse.json({
      success: true,
      mes: mes,
      ano: ano,
      stats: {
        oportunidades_criadas: oportunidadesCriadas[0]?.total || 0,
        oportunidades_ganhas: oportunidadesGanhas[0]?.total || 0,
        valor_ganho: oportunidadesGanhas[0]?.valor_total || 0,
        oportunidades_perdidas: oportunidadesPerdidas[0]?.total || 0,
        oportunidades_abertas: oportunidadesAbertas[0]?.total || 0,
        meta_mes: metaConsultor[0]?.meta_total || 0,
        etapas_funil: etapasFunil
      }
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas do consultor:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar estatísticas do consultor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}






























