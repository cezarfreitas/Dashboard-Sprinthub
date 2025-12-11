import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar todas as oportunidades de um vendedor em um período
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedorId = searchParams.get('vendedor_id')
    const dataInicio = searchParams.get('data_inicio') // Formato: YYYY-MM-DD
    const dataFim = searchParams.get('data_fim') // Formato: YYYY-MM-DD
    const tipo = searchParams.get('tipo') // 'criadas', 'perdidas', 'ganhas'

    if (!vendedorId) {
      return NextResponse.json(
        { success: false, message: 'vendedor_id é obrigatório' },
        { status: 400 }
      )
    }

    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        { success: false, message: 'data_inicio e data_fim são obrigatórias' },
        { status: 400 }
      )
    }

    if (!tipo || !['criadas', 'perdidas', 'ganhas'].includes(tipo)) {
      return NextResponse.json(
        { success: false, message: 'tipo inválido (criadas, perdidas ou ganhas)' },
        { status: 400 }
      )
    }

    let query = ''
    const params: any[] = []

    if (tipo === 'criadas') {
      query = `
        SELECT 
          o.id,
          o.title,
          o.value,
          o.createDate,
          o.status,
          o.crm_column
        FROM oportunidades o
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.archived = 0
          AND o.createDate IS NOT NULL
          AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) >= ?
          AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) <= ?
        ORDER BY o.createDate DESC
      `
      params.push(vendedorId, dataInicio, dataFim)
    } else if (tipo === 'perdidas') {
      // Não filtrar por status - usar apenas lost_date IS NOT NULL (igual à API /diaria)
      query = `
        SELECT 
          o.id,
          o.title,
          o.value,
          o.createDate,
          o.lost_date as lostDate,
          o.status,
          o.crm_column
        FROM oportunidades o
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.archived = 0
          AND o.lost_date IS NOT NULL
          AND DATE(CONVERT_TZ(o.lost_date, '+00:00', '-03:00')) >= ?
          AND DATE(CONVERT_TZ(o.lost_date, '+00:00', '-03:00')) <= ?
        ORDER BY o.lost_date DESC
      `
      params.push(vendedorId, dataInicio, dataFim)
    } else if (tipo === 'ganhas') {
      // Não filtrar por status - usar apenas gain_date IS NOT NULL (igual à API /diaria)
      query = `
        SELECT 
          o.id,
          o.title,
          o.value,
          o.createDate,
          o.gain_date as gainDate,
          o.status,
          o.crm_column
        FROM oportunidades o
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.archived = 0
          AND o.gain_date IS NOT NULL
          AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) >= ?
          AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) <= ?
        ORDER BY o.gain_date DESC
      `
      params.push(vendedorId, dataInicio, dataFim)
    }

    const oportunidades = await executeQuery(query, params) as Array<{
      id: number
      title: string
      value: number
      createDate: string
      lostDate?: string
      gainDate?: string
      status: string
      crm_column: string
    }>

    return NextResponse.json({
      success: true,
      data: oportunidades,
      total: oportunidades.length
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades por período',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

