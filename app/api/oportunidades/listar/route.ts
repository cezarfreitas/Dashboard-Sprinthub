import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para converter data de São Paulo para UTC
function formatDateSaoPauloToUTC(dateStr: string, isEnd: boolean = false): string {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }
  
  const [year, month, day] = dateStr.split('-').map(Number)
  const dateSP = new Date(year, month - 1, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, 0)
  const dateUTC = new Date(dateSP.getTime() + (3 * 60 * 60 * 1000))
  
  const yyyy = dateUTC.getFullYear()
  const mm = String(dateUTC.getMonth() + 1).padStart(2, '0')
  const dd = String(dateUTC.getDate()).padStart(2, '0')
  const hh = String(dateUTC.getHours()).padStart(2, '0')
  const mi = String(dateUTC.getMinutes()).padStart(2, '0')
  const ss = String(dateUTC.getSeconds()).padStart(2, '0')
  
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

// GET - Listar oportunidades com filtros flexíveis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Filtros disponíveis
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status') // 'open', 'won', 'gain', 'lost', 'all'
    const createdDateStart = searchParams.get('created_date_start')
    const createdDateEnd = searchParams.get('created_date_end')
    const gainDateStart = searchParams.get('gain_date_start')
    const gainDateEnd = searchParams.get('gain_date_end')
    const lostDateStart = searchParams.get('lost_date_start')
    const lostDateEnd = searchParams.get('lost_date_end')
    const funilId = searchParams.get('funil_id')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000

    // Construir query dinamicamente
    const whereClauses: string[] = ['o.archived = 0']
    const queryParams: any[] = []

    // Filtro de status
    if (status && status !== 'all') {
      if (status === 'open') {
        whereClauses.push("(o.gain_date IS NULL AND o.lost_date IS NULL AND o.status = 'open')")
      } else if (status === 'won' || status === 'gain') {
        whereClauses.push("(o.gain_date IS NOT NULL AND o.status = 'gain')")
      } else if (status === 'lost') {
        whereClauses.push("(o.lost_date IS NOT NULL AND o.status = 'lost')")
      }
    }

    // Filtro de usuário
    if (userId) {
      whereClauses.push('CAST(o.user AS UNSIGNED) = ?')
      queryParams.push(parseInt(userId))
    }

    // Filtro de data de criação
    if (createdDateStart) {
      whereClauses.push('o.createDate >= ?')
      queryParams.push(formatDateSaoPauloToUTC(createdDateStart, false))
    }
    if (createdDateEnd) {
      whereClauses.push('o.createDate <= ?')
      queryParams.push(formatDateSaoPauloToUTC(createdDateEnd, true))
    }

    // Filtro de data de ganho
    if (gainDateStart) {
      whereClauses.push('o.gain_date >= ?')
      queryParams.push(formatDateSaoPauloToUTC(gainDateStart, false))
    }
    if (gainDateEnd) {
      whereClauses.push('o.gain_date <= ?')
      queryParams.push(formatDateSaoPauloToUTC(gainDateEnd, true))
    }

    // Filtro de data de perda
    if (lostDateStart) {
      whereClauses.push('o.lost_date >= ?')
      queryParams.push(formatDateSaoPauloToUTC(lostDateStart, false))
    }
    if (lostDateEnd) {
      whereClauses.push('o.lost_date <= ?')
      queryParams.push(formatDateSaoPauloToUTC(lostDateEnd, true))
    }

    // Filtro de funil
    if (funilId) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM colunas_funil cf 
        WHERE cf.id = o.coluna_funil_id 
        AND cf.id_funil = ?
      )`)
      queryParams.push(parseInt(funilId))
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // Query principal
    const query = `
      SELECT 
        o.id,
        o.title,
        o.value,
        o.status,
        o.createDate,
        o.gain_date,
        o.lost_date,
        o.loss_reason,
        o.user,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        CASE 
          WHEN o.gain_date IS NULL AND o.lost_date IS NULL THEN DATEDIFF(NOW(), o.createDate)
          ELSE NULL
        END as dias_aberta,
        cf.nome_coluna as coluna_nome
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      ${whereClause}
      ORDER BY o.createDate DESC
      LIMIT ?
    `
    
    queryParams.push(limit)

    const oportunidades = await executeQuery(query, queryParams) as any[]

    // Formatar dados
    const oportunidadesFormatadas = oportunidades.map(op => ({
      id: op.id,
      title: op.title,
      value: Number(op.value || 0),
      status: op.status,
      createDate: op.createDate,
      gain_date: op.gain_date,
      lost_date: op.lost_date,
      loss_reason: op.loss_reason,
      user: op.user,
      vendedor_nome: op.vendedor_nome && op.vendedor_sobrenome 
        ? `${op.vendedor_nome} ${op.vendedor_sobrenome}`.trim()
        : op.vendedor_nome || null,
      dias_aberta: op.dias_aberta ? Number(op.dias_aberta) : null,
      coluna_nome: op.coluna_nome
    }))

    return NextResponse.json({
      success: true,
      oportunidades: oportunidadesFormatadas,
      total: oportunidadesFormatadas.length,
      filtros: {
        user_id: userId,
        status,
        created_date_start: createdDateStart,
        created_date_end: createdDateEnd,
        gain_date_start: gainDateStart,
        gain_date_end: gainDateEnd,
        lost_date_start: lostDateStart,
        lost_date_end: lostDateEnd,
        funil_id: funilId,
        limit
      }
    })

  } catch (error) {
    console.error('Erro ao listar oportunidades:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao listar oportunidades',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
