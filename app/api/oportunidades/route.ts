import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const colunaId = searchParams.get('colunaId')

    let query = 'SELECT * FROM oportunidades'
    const params: any[] = []
    const conditions: string[] = []

    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }

    if (colunaId) {
      conditions.push('coluna_funil_id = ?')
      params.push(colunaId)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY createDate DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const oportunidades = await executeQuery(query, params)

    // Contar total
    let countQuery = 'SELECT COUNT(*) as total FROM oportunidades'
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ')
    }
    const countResult = await executeQuery(countQuery, params.slice(0, -2)) as any[]
    const total = countResult[0]?.total || 0

    return NextResponse.json({
      success: true,
      data: oportunidades,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Erro ao buscar oportunidades:', error)
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
