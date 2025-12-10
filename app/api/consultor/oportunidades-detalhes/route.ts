import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar detalhes das oportunidades de uma coluna específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedorId = searchParams.get('vendedor_id')
    const colunaFunilId = searchParams.get('coluna_funil_id') // Opcional agora
    const status = searchParams.get('status') || 'open'
    const comValor = searchParams.get('com_valor') === '1'
    const diasAberta = searchParams.get('dias_aberta') // '10' ou '30'

    if (!vendedorId) {
      return NextResponse.json(
        { success: false, message: 'vendedor_id é obrigatório' },
        { status: 400 }
      )
    }

    let query = `
      SELECT 
        o.id,
        o.title,
        o.value,
        o.createDate,
        o.crm_column,
        o.status,
        DATEDIFF(NOW(), o.createDate) as dias_aberta
      FROM oportunidades o
      WHERE o.user = ?
        AND o.status = ?
    `

    const params: any[] = [vendedorId, status]

    // Se coluna_funil_id foi fornecida, adiciona ao filtro
    if (colunaFunilId) {
      query += ` AND o.coluna_funil_id = ?`
      params.push(colunaFunilId)
    }

    if (comValor) {
      query += ` AND o.value > 0`
    }

    if (diasAberta) {
      const dias = parseInt(diasAberta)
      query += ` AND DATEDIFF(NOW(), o.createDate) > ?`
      params.push(dias)
    }

    query += ` ORDER BY o.createDate DESC`

    const oportunidades = await executeQuery(query, params) as Array<{
      id: number
      title: string
      value: number
      createDate: string
      crm_column: string
      status: string
    }>

    return NextResponse.json({
      success: true,
      data: oportunidades
    })

  } catch (error) {
    console.error('❌ Erro ao buscar detalhes das oportunidades:', error)
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

