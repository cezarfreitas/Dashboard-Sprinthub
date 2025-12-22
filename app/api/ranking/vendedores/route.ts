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
  
  // Adicionar 3 horas para converter de São Paulo (GMT-3) para UTC (GMT+0)
  const dateUTC = new Date(dateSP.getTime() + (3 * 60 * 60 * 1000))
  
  const yearUTC = dateUTC.getFullYear()
  const monthUTC = String(dateUTC.getMonth() + 1).padStart(2, '0')
  const dayUTC = String(dateUTC.getDate()).padStart(2, '0')
  const hours = String(dateUTC.getHours()).padStart(2, '0')
  const minutes = String(dateUTC.getMinutes()).padStart(2, '0')
  const seconds = String(dateUTC.getSeconds()).padStart(2, '0')
  
  return `${yearUTC}-${monthUTC}-${dayUTC} ${hours}:${minutes}:${seconds}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'mensal' // mensal, anual ou personalizado
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))
    
    // Novos parâmetros de filtro
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const unidadesParam = searchParams.get('unidades') // IDs separados por vírgula
    const funilId = searchParams.get('funil')
    const grupoId = searchParams.get('grupo')
    const gainDateInicio = searchParams.get('gainDateInicio')
    const gainDateFim = searchParams.get('gainDateFim')

    // Processar unidades
    let unidadeIds: number[] = []
    if (unidadesParam) {
      unidadeIds = unidadesParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    }
    
    // Se tem grupo selecionado, buscar unidades do grupo
    if (grupoId && grupoId !== 'todos') {
      const grupoUnidades = await executeQuery(`
        SELECT u.id 
        FROM unidades u 
        WHERE u.grupo_id = ? AND u.ativo = 1
      `, [parseInt(grupoId)]) as any[]
      
      const grupoUnidadeIds = grupoUnidades.map((u: any) => u.id)
      
      // Se já tem unidades selecionadas, fazer interseção
      if (unidadeIds.length > 0) {
        unidadeIds = unidadeIds.filter(id => grupoUnidadeIds.includes(id))
      } else {
        unidadeIds = grupoUnidadeIds
      }
    }
    
    // Buscar vendedores das unidades selecionadas (se houver filtro de unidade)
    let vendedorIds: number[] = []
    if (unidadeIds.length > 0) {
      const unidades = await executeQuery(`
        SELECT id, users FROM unidades WHERE id IN (${unidadeIds.map(() => '?').join(',')}) AND ativo = 1
      `, unidadeIds) as any[]
      
      unidades.forEach((unidade: any) => {
        if (!unidade.users) return
        
        let parsedUsers: any[] = []
        try {
          if (typeof unidade.users === 'string') {
            parsedUsers = JSON.parse(unidade.users)
          } else if (Array.isArray(unidade.users)) {
            parsedUsers = unidade.users
          }
        } catch (e) {
          return
        }
        
        if (!Array.isArray(parsedUsers)) return
        
        parsedUsers.forEach((u: any) => {
          let vendedorId: number | null = null
          
          if (typeof u === 'object' && u !== null) {
            vendedorId = u.id || u.user_id || u.vendedor_id
          } else if (typeof u === 'number') {
            vendedorId = u
          } else if (typeof u === 'string') {
            const parsed = parseInt(u.trim())
            if (!isNaN(parsed)) vendedorId = parsed
          }
          
          if (vendedorId && !vendedorIds.includes(vendedorId)) {
            vendedorIds.push(vendedorId)
          }
        })
      })
    }

    let query = `
      SELECT 
        v.id as vendedor_id,
        v.name,
        v.lastName,
        v.email,
        v.username,
        v.telephone,
        COUNT(DISTINCT o.id) as total_oportunidades,
        COALESCE(SUM(CASE WHEN o.status = 'gain' THEN o.value ELSE 0 END), 0) as total_realizado,
        GROUP_CONCAT(DISTINCT o.status) as status_list
      FROM vendedores v
      LEFT JOIN oportunidades o ON o.user = v.id
    `

    const params: any[] = []
    const conditions: string[] = []

    // Condições base para status gain
    conditions.push(`o.gain_date IS NOT NULL`)
    conditions.push(`o.status = 'gain'`)
    conditions.push(`o.archived = 0`)

    // Filtro por período (dataInicio/dataFim têm prioridade)
    if (dataInicio && dataFim) {
      const dataInicioUTC = formatDateSaoPauloToUTC(dataInicio, false)
      const dataFimUTC = formatDateSaoPauloToUTC(dataFim, true)
      conditions.push(`o.gain_date >= ?`)
      conditions.push(`o.gain_date <= ?`)
      params.push(dataInicioUTC, dataFimUTC)
    } else if (tipo === 'mensal') {
      conditions.push(`MONTH(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`)
      conditions.push(`YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`)
      params.push(mes, ano)
    } else if (tipo === 'anual') {
      conditions.push(`YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`)
      params.push(ano)
    }

    // Filtro de Data de Ganho adicional (gainDateInicio/gainDateFim)
    if (gainDateInicio) {
      const gainInicioUTC = formatDateSaoPauloToUTC(gainDateInicio, false)
      conditions.push(`o.gain_date >= ?`)
      params.push(gainInicioUTC)
    }
    if (gainDateFim) {
      const gainFimUTC = formatDateSaoPauloToUTC(gainDateFim, true)
      conditions.push(`o.gain_date <= ?`)
      params.push(gainFimUTC)
    }

    // Filtro de funil
    if (funilId && funilId !== 'todos') {
      conditions.push(`o.coluna_funil_id IN (SELECT id FROM colunas_funil WHERE id_funil = ?)`)
      params.push(parseInt(funilId))
    }

    // Filtro de vendedores (baseado nas unidades)
    if (vendedorIds.length > 0) {
      conditions.push(`v.id IN (${vendedorIds.map(() => '?').join(',')})`)
      params.push(...vendedorIds)
    }

    // Montar WHERE
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ')
    }

    query += `
      GROUP BY v.id, v.name, v.lastName, v.email, v.username, v.telephone
      HAVING total_realizado > 0
      ORDER BY total_realizado DESC
    `

    const ranking = await executeQuery(query, params) as any[]

    // Adicionar posição e medalha
    const rankingComPosicao = ranking.map((item, index) => ({
      ...item,
      posicao: index + 1,
      medalha: index === 0 ? 'ouro' : index === 1 ? 'prata' : index === 2 ? 'bronze' : null,
      total_realizado: parseFloat(item.total_realizado || 0),
      total_oportunidades: parseInt(item.total_oportunidades || 0)
    }))

    return NextResponse.json({
      success: true,
      ranking: rankingComPosicao,
      filtros: {
        tipo,
        mes: tipo === 'mensal' ? mes : null,
        ano,
        dataInicio,
        dataFim,
        unidades: unidadeIds,
        funil: funilId,
        grupo: grupoId,
        gainDateInicio,
        gainDateFim
      }
    })

  } catch (error) {
    console.error('Erro ao buscar ranking de vendedores:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar ranking de vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

