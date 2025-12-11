import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidades de um vendedor em uma data específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedorId = searchParams.get('vendedor_id')
    const data = searchParams.get('data') // Formato: YYYY-MM-DD
    const tipo = searchParams.get('tipo') // 'criadas', 'perdidas', 'ganhas'

    console.log('🔍 [oportunidades-por-data] Parâmetros recebidos:', { vendedorId, data, tipo })

    if (!vendedorId) {
      return NextResponse.json(
        { success: false, message: 'vendedor_id é obrigatório' },
        { status: 400 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'data é obrigatória' },
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
          AND DATE(CONVERT_TZ(o.createDate, '+00:00', '-03:00')) = ?
        ORDER BY o.createDate DESC
      `
      params.push(vendedorId, data)
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
          AND DATE(CONVERT_TZ(o.lost_date, '+00:00', '-03:00')) = ?
        ORDER BY o.lost_date DESC
      `
      params.push(vendedorId, data)
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
          AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?
        ORDER BY o.gain_date DESC
      `
      params.push(vendedorId, data)
    }

    console.log('🔍 [oportunidades-por-data] Query:', query.trim())
    console.log('🔍 [oportunidades-por-data] Params:', params)

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

    console.log('✅ [oportunidades-por-data] Resultado:', { total: oportunidades.length, oportunidades })

    // Debug: buscar quantas oportunidades ganhas existem para esse usuário sem filtro de data
    if (tipo === 'ganhas' && oportunidades.length === 0) {
      const debugQuery = `
        SELECT o.id, o.title, o.gain_date, o.status, o.user, o.archived,
               DATE(o.gain_date) as data_gain,
               DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) as data_gain_gmt3
        FROM oportunidades o
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.status = 'won'
          AND o.archived = 0
          AND o.gain_date IS NOT NULL
        ORDER BY o.gain_date DESC
        LIMIT 10
      `
      const debugResult = await executeQuery(debugQuery, [vendedorId])
      console.log('🐛 [DEBUG] Oportunidades ganhas do usuário (sem filtro de data):', debugResult)
    }

    return NextResponse.json({
      success: true,
      data: oportunidades,
      total: oportunidades.length,
      debug: { vendedorId, data, tipo }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades por data',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

