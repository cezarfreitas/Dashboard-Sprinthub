import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const unidadeId = searchParams.get('unidade_id')
    const data = searchParams.get('data')
    const tipo = searchParams.get('tipo') || 'criadas'

    if (!unidadeId || !data) {
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
      WHERE v.unidade_id = ?
    `

    const params: any[] = [parseInt(unidadeId)]

    if (tipo === 'criadas') {
      query += ` AND DATE(o.createDate) = ?`
      params.push(data)
    } else if (tipo === 'perdidas') {
      query += ` AND DATE(o.lost_date) = ?`
      params.push(data)
    } else if (tipo === 'ganhas') {
      query += ` AND DATE(o.gain_date) = ?`
      params.push(data)
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

