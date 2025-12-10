import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidades abertas do vendedor agrupadas por coluna do funil
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedorId = searchParams.get('vendedor_id')
    const funilId = searchParams.get('funil_id') || '4' // Default: funil de vendas

    if (!vendedorId) {
      return NextResponse.json(
        { success: false, message: 'vendedor_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar oportunidades abertas (status = 'open') do vendedor agrupadas por coluna_funil_id
    const query = `
      SELECT 
        o.coluna_funil_id,
        cf.nome_coluna,
        cf.sequencia,
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total,
        SUM(CASE WHEN o.value > 0 THEN 1 ELSE 0 END) as total_com_valor,
        COALESCE(SUM(CASE WHEN o.value > 0 THEN o.value ELSE 0 END), 0) as valor_total_com_valor,
        SUM(CASE WHEN DATEDIFF(NOW(), o.createDate) > 10 THEN 1 ELSE 0 END) as total_abertas_10_dias,
        SUM(CASE WHEN DATEDIFF(NOW(), o.createDate) > 30 THEN 1 ELSE 0 END) as total_abertas_30_dias
      FROM oportunidades o
      INNER JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      WHERE o.status = 'open'
        AND o.user = ?
        AND cf.id_funil = ?
        AND o.coluna_funil_id IS NOT NULL
      GROUP BY o.coluna_funil_id, cf.nome_coluna, cf.sequencia
      ORDER BY cf.sequencia ASC
    `

    const resultados = await executeQuery(query, [vendedorId, funilId]) as Array<{
      coluna_funil_id: number
      nome_coluna: string
      sequencia: number
      total: number
      valor_total: number
      total_com_valor: number
      valor_total_com_valor: number
      total_abertas_10_dias: number
      total_abertas_30_dias: number
    }>

    return NextResponse.json({
      success: true,
      data: resultados
    })

  } catch (error) {
    console.error('❌ Erro ao buscar oportunidades por coluna:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

