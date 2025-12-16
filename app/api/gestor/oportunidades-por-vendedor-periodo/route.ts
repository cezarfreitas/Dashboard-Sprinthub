import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const unidadeId = searchParams.get('unidade_id')
    const vendedorId = searchParams.get('vendedor_id')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const tipo = searchParams.get('tipo') || 'criadas'

    if (!unidadeId || !vendedorId || !dataInicio || !dataFim) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      )
    }

    let query = `
      SELECT 
        o.id,
        o.title,
        o.value,
        o.createDate,
        o.lost_date,
        o.gain_date,
        o.status,
        CONCAT(v.name, ' ', v.lastName) as vendedor_nome
      FROM oportunidades o
      LEFT JOIN vendedores v ON o.user = v.id
      WHERE o.user = ?
    `

    const params: any[] = [parseInt(vendedorId)]

    if (tipo === 'criadas') {
      query += ` AND DATE(o.createDate) BETWEEN ? AND ?`
      params.push(dataInicio, dataFim)
    } else if (tipo === 'perdidas') {
      query += ` AND DATE(o.lost_date) BETWEEN ? AND ?`
      params.push(dataInicio, dataFim)
    } else if (tipo === 'ganhas') {
      query += ` AND DATE(o.gain_date) BETWEEN ? AND ?`
      params.push(dataInicio, dataFim)
    }

    query += ` ORDER BY o.createDate DESC`

    const result = await executeQuery(query, params)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
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

