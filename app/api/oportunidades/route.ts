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
    const userId = searchParams.get('user_id')
    const lostDateStart = searchParams.get('lost_date_start')
    const lostDateEnd = searchParams.get('lost_date_end')
    const motivoId = searchParams.get('motivo_id')
    const motivo = searchParams.get('motivo')

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

    if (userId) {
      conditions.push('user = ?')
      params.push(userId)
    }

    if (lostDateStart && lostDateEnd) {
      conditions.push('lost_date >= ? AND lost_date <= ?')
      params.push(lostDateStart, lostDateEnd)
    }

    if (motivoId) {
      // Tratar tanto "Motivo X" quanto "X"
      const cleanMotivoId = motivoId.toString().replace(/^Motivo\s+/i, '').trim()
      conditions.push('(loss_reason = ? OR loss_reason = ?)')
      params.push(motivoId, cleanMotivoId)
    } else if (motivo) {
      conditions.push('loss_reason LIKE ?')
      params.push(`%${motivo}%`)
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
      oportunidades: oportunidades,
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
