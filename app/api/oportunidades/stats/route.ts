import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para parse JSON
function parseJSON(value: any): any[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (e) {
      return []
    }
  }
  return []
}

// Helper para converter data de São Paulo para UTC
// Recebe data no formato YYYY-MM-DD (em timezone São Paulo) 
// e retorna datetime no formato MySQL (YYYY-MM-DD HH:MM:SS) em UTC
function formatDateSaoPauloToUTC(dateStr: string, isEnd: boolean = false): string {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }
  
  // A data recebida está em São Paulo (GMT-3)
  // Precisamos convertê-la para UTC (GMT+0) antes de comparar com o banco
  
  // Exemplo: 2024-12-01 00:00:00 em São Paulo = 2024-12-01 03:00:00 em UTC
  // Exemplo: 2024-12-01 23:59:59 em São Paulo = 2024-12-02 02:59:59 em UTC
  
  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Criar data em São Paulo
  const dateSP = new Date(year, month - 1, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, 0)
  
  // Ajustar para UTC (adicionar 3 horas)
  const dateUTC = new Date(dateSP.getTime() + (3 * 60 * 60 * 1000))
  
  // Formatar como MySQL datetime
  const yyyy = dateUTC.getFullYear()
  const mm = String(dateUTC.getMonth() + 1).padStart(2, '0')
  const dd = String(dateUTC.getDate()).padStart(2, '0')
  const hh = String(dateUTC.getHours()).padStart(2, '0')
  const mi = String(dateUTC.getMinutes()).padStart(2, '0')
  const ss = String(dateUTC.getSeconds()).padStart(2, '0')
  
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

// Helper para aplicar CONVERT_TZ em campos de data nas queries
// Converte do timezone do banco (UTC) para São Paulo (America/Sao_Paulo)
// Retorna a expressão SQL com CONVERT_TZ aplicado
function convertTZToSaoPaulo(field: string): string {
  // Usar CONVERT_TZ para converter de UTC para São Paulo
  // São Paulo está em UTC-3 (horário padrão) ou UTC-2 (horário de verão)
  // Usar a função TIMEZONE do MySQL se disponível, ou calcular o offset
  // Para garantir compatibilidade, vamos usar CONVERT_TZ com offset fixo de -03:00
  // (horário padrão de São Paulo - pode ter pequena diferença no horário de verão)
  return `CONVERT_TZ(${field}, '+00:00', '-03:00')`
}

// Função para construir filtro de unidades (retorna array de user IDs de vendedores ativos)
async function buildUnidadeFilter(unidadeIdsParam: string | null): Promise<number[]> {
  if (!unidadeIdsParam) return []

  const unidadeIds = unidadeIdsParam
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id) && id > 0)

  if (unidadeIds.length === 0) return []

  const placeholders = unidadeIds.map(() => '?').join(',')
  // Buscar unidades incluindo o nome para debug
  const unidades = await executeQuery(
    `SELECT id, COALESCE(nome, name) as nome, users FROM unidades WHERE id IN (${placeholders}) AND ativo = 1`,
    unidadeIds
  ) as any[]

  if (!unidades || unidades.length === 0) {
    return []
  }

  // Buscar todos os vendedores ativos uma vez (otimização)
  const todosVendedoresAtivos = await executeQuery(
    'SELECT id FROM vendedores WHERE ativo = 1'
  ) as any[]
  const vendedoresAtivosSet = new Set(todosVendedoresAtivos.map(v => v.id))

  // Extrair IDs de vendedores das unidades e filtrar apenas os ativos
  const todosVendedoresIds = new Set<number>()
  unidades.forEach(unidade => {
    if (!unidade.users) {
      return
    }

    const parsedUsers = parseJSON(unidade.users)
    
    if (!Array.isArray(parsedUsers) || parsedUsers.length === 0) {
      return
    }

    parsedUsers.forEach((u: any) => {
      // Tentar extrair ID de diferentes formatos possíveis
      let id: any = null
      
      if (typeof u === 'object' && u !== null) {
        // Formato: {id: 123, ...}
        id = u.id || u.user_id || u.vendedor_id
      } else if (typeof u === 'number') {
        // Formato: 123 (número direto)
        id = u
      } else if (typeof u === 'string') {
        // Formato: "123" (string numérica)
        const parsed = parseInt(u.trim())
        if (!isNaN(parsed)) id = parsed
      }
      
      if (id != null && !isNaN(Number(id))) {
        const userId = Number(id)
        
        // Filtrar apenas vendedores ativos
        if (vendedoresAtivosSet.has(userId)) {
          todosVendedoresIds.add(userId)
        }
      }
    })
  })

  return Array.from(todosVendedoresIds)
}

// GET - Buscar estatísticas agregadas de oportunidades com filtros flexíveis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // ============================================
    // PARÂMETROS DE FILTRO
    // ============================================
    
    // Status: 'open' | 'won' | 'lost' | 'all' ou múltiplos: 'open,won'
    const statusParam = searchParams.get('status')
    
    // Funil: ID único ou múltiplos separados por vírgula
    const funilIdParam = searchParams.get('funil_id')
    
    // Vendedor: ID único ou múltiplos separados por vírgula
    const userIdParam = searchParams.get('user_id')
    
    // Unidade: ID único ou múltiplos separados por vírgula
    const unidadeIdParam = searchParams.get('unidade_id')
    
    // Datas de criação (createDate)
    const createdDateStart = searchParams.get('created_date_start') // formato: YYYY-MM-DD
    const createdDateEnd = searchParams.get('created_date_end') // formato: YYYY-MM-DD
    
    // Datas de ganho (gain_date)
    const gainDateStart = searchParams.get('gain_date_start') // formato: YYYY-MM-DD
    const gainDateEnd = searchParams.get('gain_date_end') // formato: YYYY-MM-DD
    
    // Datas de perda (lost_date)
    const lostDateStart = searchParams.get('lost_date_start') // formato: YYYY-MM-DD
    const lostDateEnd = searchParams.get('lost_date_end') // formato: YYYY-MM-DD
    
    // Data de reabertura (reopen_date)
    const reopenDateStart = searchParams.get('reopen_date_start') // formato: YYYY-MM-DD
    const reopenDateEnd = searchParams.get('reopen_date_end') // formato: YYYY-MM-DD
    
    // Data esperada de fechamento (expectedCloseDate)
    const expectedCloseDateStart = searchParams.get('expected_close_date_start') // formato: YYYY-MM-DD
    const expectedCloseDateEnd = searchParams.get('expected_close_date_end') // formato: YYYY-MM-DD
    
    // Data de última atualização (updateDate)
    const updateDateStart = searchParams.get('update_date_start') // formato: YYYY-MM-DD
    const updateDateEnd = searchParams.get('update_date_end') // formato: YYYY-MM-DD
    
    // Última mudança de coluna (last_column_change)
    const lastColumnChangeStart = searchParams.get('last_column_change_start') // formato: YYYY-MM-DD
    const lastColumnChangeEnd = searchParams.get('last_column_change_end') // formato: YYYY-MM-DD
    
    // Última mudança de status (last_status_change)
    const lastStatusChangeStart = searchParams.get('last_status_change_start') // formato: YYYY-MM-DD
    const lastStatusChangeEnd = searchParams.get('last_status_change_end') // formato: YYYY-MM-DD
    
    // Motivo de perda (loss_reason) - ID do motivo_de_perda
    const lossReasonParam = searchParams.get('loss_reason') // ID único ou múltiplos separados por vírgula
    
    // Motivo de ganho (gain_reason)
    const gainReasonParam = searchParams.get('gain_reason') // Texto exato ou LIKE
    
    // Canal de venda (sale_channel)
    const saleChannelParam = searchParams.get('sale_channel') // Texto exato ou LIKE
    
    // Campanha (campaign)
    const campaignParam = searchParams.get('campaign') // Texto exato ou LIKE
    
    // Lead ID (lead_id)
    const leadIdParam = searchParams.get('lead_id') // ID único ou múltiplos separados por vírgula
    
    // Valor mínimo e máximo (value)
    const valorMin = searchParams.get('valor_min') // Valor mínimo
    const valorMax = searchParams.get('valor_max') // Valor máximo
    
    // Parâmetros de agrupamento (opcional)
    const groupBy = searchParams.get('group_by') // 'status' | 'funil' | 'user' | 'day' | 'month'
    
    // Parâmetro all=1: retornar total geral + divisão por período de criação
    const allParam = searchParams.get('all') === '1'

    // Construir filtros dinamicamente
    const whereClauses: string[] = ['o.archived = 0']
    const queryParams: any[] = []

    // Filtro de status
    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim().toLowerCase())
      
      if (!statuses.includes('all')) {
        const statusConditions: string[] = []
        
        statuses.forEach(status => {
          if (status === 'open' || status === 'aberta') {
            statusConditions.push("(o.status = 'open' AND o.gain_date IS NULL AND o.lost_date IS NULL)")
          } else if (status === 'won' || status === 'ganha' || status === 'gain') {
            statusConditions.push('(o.gain_date IS NOT NULL AND o.status = ?)')
            queryParams.push('gain')
          } else if (status === 'lost' || status === 'perdida') {
            statusConditions.push('(o.lost_date IS NOT NULL AND o.status = ?)')
            queryParams.push('lost')
          }
        })
        
        if (statusConditions.length > 0) {
          whereClauses.push(`(${statusConditions.join(' OR ')})`)
        }
      }
    } else {
      // Se não especificar status, não filtrar por status
    }

    // Filtro de funil (através de coluna_funil)
    if (funilIdParam) {
      const funilIds = funilIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)

      if (funilIds.length > 0) {
        whereClauses.push(`EXISTS (
          SELECT 1 FROM colunas_funil cf 
          WHERE cf.id = o.coluna_funil_id 
          AND cf.id_funil IN (${funilIds.map(() => '?').join(',')})
        )`)
        queryParams.push(...funilIds)
      }
    }

    // Filtro de usuário/vendedor
    let userIds: number[] = []
    
    if (userIdParam) {
      const userIdsFromParam = userIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)
      userIds.push(...userIdsFromParam)
    }

    // Filtro de unidade (busca vendedores e adiciona aos userIds)
    let unidadeFilterAplicado = false
    let unidadesInfo: Array<{ id: number; nome: string }> = []
    if (unidadeIdParam) {
      const unidadeUserIds = await buildUnidadeFilter(unidadeIdParam)
      
      // Buscar nomes das unidades
      const unidadeIds = unidadeIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)
      
      if (unidadeIds.length > 0) {
        const placeholders = unidadeIds.map(() => '?').join(',')
        const unidades = await executeQuery(
          `SELECT id, COALESCE(nome, name) as nome FROM unidades WHERE id IN (${placeholders}) AND ativo = 1`,
          unidadeIds
        ) as Array<{ id: number; nome: string }>
        
        unidadesInfo = unidades.map(u => ({
          id: u.id,
          nome: u.nome || 'Sem nome'
        }))
      }
      
      // Se foi especificado unidade_id mas não encontrou nenhum vendedor ativo,
      // retornar resultado vazio (0 em todas as métricas)
      if (unidadeUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            stats: [],
            total: 0,
            valor_total: 0,
            total_ganhas: 0,
            total_perdidas: 0,
            total_abertas: 0,
            valor_ganhas: 0,
            valor_perdidas: 0,
            valor_abertas: 0
          },
          filters: {
            status: statusParam || 'all',
            funil_id: funilIdParam || null,
            user_id: userIdParam || null,
            unidade_id: unidadeIdParam || null,
            // ... outros filtros
            group_by: searchParams.get('group_by') || null
          },
          ...(unidadesInfo.length > 0 ? { unidade_info: unidadesInfo } : {}),
          message: `Unidade(s) ${unidadeIdParam} não possui(em) vendedores ativos ou não foi(ram) encontrada(s)`
        })
      }
      
      userIds.push(...unidadeUserIds)
      unidadeFilterAplicado = true
    }

    // Remover duplicatas
    userIds = Array.from(new Set(userIds))

    // Buscar informações dos vendedores filtrados
    let vendedoresFiltrados: any[] = []
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',')
      whereClauses.push(`CAST(o.user AS UNSIGNED) IN (${placeholders})`)
      queryParams.push(...userIds)
      
      // Buscar nomes dos vendedores
      vendedoresFiltrados = await executeQuery(
        `SELECT id, name, lastName FROM vendedores WHERE id IN (${placeholders}) AND ativo = 1 ORDER BY name`,
        userIds
      ) as any[]
    } else if (!unidadeFilterAplicado && userIdParam) {
      // Se foi especificado user_id mas não encontrou nenhum válido,
      // retornar resultado vazio
      return NextResponse.json({
        success: true,
        data: {
          stats: [],
          total: 0,
          valor_total: 0,
          total_ganhas: 0,
          total_perdidas: 0,
          total_abertas: 0,
          valor_ganhas: 0,
          valor_perdidas: 0,
          valor_abertas: 0
        },
        filters: {
          status: statusParam || 'all',
          funil_id: funilIdParam || null,
          user_id: userIdParam || null,
          unidade_id: unidadeIdParam || null,
          group_by: searchParams.get('group_by') || null
        },
        message: `Vendedor(es) ${userIdParam} não encontrado(s) ou não está(ão) ativo(s)`
      })
    }

    // Filtro de data de criação
    // Se all=1, não aplicar filtro de created_date na query principal (será feito separadamente)
    if (createdDateStart && !allParam) {
      whereClauses.push(`o.createDate >= ?`)
      queryParams.push(formatDateSaoPauloToUTC(createdDateStart, false))
    }
    if (createdDateEnd && !allParam) {
      whereClauses.push(`o.createDate <= ?`)
      queryParams.push(formatDateSaoPauloToUTC(createdDateEnd, true))
    }

    // Filtro de data de ganho
    // Se all=1 e status=gain, não aplicar filtro de gain_date na query principal (será feito separadamente)
    if (gainDateStart && !(allParam && (statusParam === 'gain' || statusParam === 'won'))) {
      whereClauses.push(`o.gain_date >= ?`)
      queryParams.push(formatDateSaoPauloToUTC(gainDateStart, false))
    }
    if (gainDateEnd && !(allParam && (statusParam === 'gain' || statusParam === 'won'))) {
      whereClauses.push(`o.gain_date <= ?`)
      queryParams.push(formatDateSaoPauloToUTC(gainDateEnd, true))
    }

    // Filtro de data de perda
    // Se all=1 e status=lost, não aplicar filtro de lost_date na query principal (será feito separadamente)
    if (lostDateStart && !(allParam && statusParam === 'lost')) {
      whereClauses.push(`o.lost_date >= ?`)
      queryParams.push(formatDateSaoPauloToUTC(lostDateStart, false))
    }
    if (lostDateEnd && !(allParam && statusParam === 'lost')) {
      whereClauses.push(`o.lost_date <= ?`)
      queryParams.push(formatDateSaoPauloToUTC(lostDateEnd, true))
    }

    // Filtro de data de reabertura
    if (reopenDateStart) {
      whereClauses.push(`o.reopen_date >= ?`)
      queryParams.push(formatDateSaoPauloToUTC(reopenDateStart, false))
    }
    if (reopenDateEnd) {
      whereClauses.push(`o.reopen_date <= ?`)
      queryParams.push(formatDateSaoPauloToUTC(reopenDateEnd, true))
    }

    // Filtro de data esperada de fechamento
    if (expectedCloseDateStart) {
      whereClauses.push(`o.expectedCloseDate >= ?`)
      queryParams.push(formatDateSaoPauloToUTC(expectedCloseDateStart, false))
    }
    if (expectedCloseDateEnd) {
      whereClauses.push(`o.expectedCloseDate <= ?`)
      queryParams.push(formatDateSaoPauloToUTC(expectedCloseDateEnd, true))
    }

    // Filtro de data de atualização
    if (updateDateStart) {
      whereClauses.push(`o.updateDate >= ?`)
      queryParams.push(formatDateSaoPauloToUTC(updateDateStart, false))
    }
    if (updateDateEnd) {
      whereClauses.push(`o.updateDate <= ?`)
      queryParams.push(formatDateSaoPauloToUTC(updateDateEnd, true))
    }

    // Filtro de última mudança de coluna
    if (lastColumnChangeStart) {
      whereClauses.push(`o.last_column_change >= ?`)
      queryParams.push(formatDateSaoPauloToUTC(lastColumnChangeStart, false))
    }
    if (lastColumnChangeEnd) {
      whereClauses.push(`o.last_column_change <= ?`)
      queryParams.push(formatDateSaoPauloToUTC(lastColumnChangeEnd, true))
    }

    // Filtro de última mudança de status
    if (lastStatusChangeStart) {
      whereClauses.push(`o.last_status_change >= ?`)
      queryParams.push(formatDateSaoPauloToUTC(lastStatusChangeStart, false))
    }
    if (lastStatusChangeEnd) {
      whereClauses.push(`o.last_status_change <= ?`)
      queryParams.push(formatDateSaoPauloToUTC(lastStatusChangeEnd, true))
    }

    // Filtro de motivo de perda (loss_reason)
    if (lossReasonParam) {
      const lossReasonIds = lossReasonParam
        .split(',')
        .map(id => {
          // Remover "Motivo " se estiver presente
          let cleanId = id.trim().replace(/^Motivo\s+/i, '')
          return parseInt(cleanId)
        })
        .filter(id => !isNaN(id) && id > 0)

      if (lossReasonIds.length > 0) {
        const placeholders = lossReasonIds.map(() => '?').join(',')
        // Comparar como número (remover "Motivo " se existir)
        whereClauses.push(`CAST(
          CASE 
            WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
            ELSE o.loss_reason
          END AS UNSIGNED
        ) IN (${placeholders})`)
        queryParams.push(...lossReasonIds)
      }
    }

    // Filtro de motivo de ganho (gain_reason) - busca parcial
    if (gainReasonParam) {
      whereClauses.push('o.gain_reason LIKE ?')
      queryParams.push(`%${gainReasonParam}%`)
    }

    // Filtro de canal de venda (sale_channel) - busca parcial
    if (saleChannelParam) {
      whereClauses.push('o.sale_channel LIKE ?')
      queryParams.push(`%${saleChannelParam}%`)
    }

    // Filtro de campanha (campaign) - busca parcial
    if (campaignParam) {
      whereClauses.push('o.campaign LIKE ?')
      queryParams.push(`%${campaignParam}%`)
    }

    // Filtro de lead ID
    if (leadIdParam) {
      const leadIds = leadIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)

      if (leadIds.length > 0) {
        const placeholders = leadIds.map(() => '?').join(',')
        whereClauses.push(`o.lead_id IN (${placeholders})`)
        queryParams.push(...leadIds)
      }
    }

    // Filtro de valor mínimo
    if (valorMin) {
      const valorMinNum = parseFloat(valorMin)
      if (!isNaN(valorMinNum) && valorMinNum >= 0) {
        whereClauses.push('o.value >= ?')
        queryParams.push(valorMinNum)
      }
    }

    // Filtro de valor máximo
    if (valorMax) {
      const valorMaxNum = parseFloat(valorMax)
      if (!isNaN(valorMaxNum) && valorMaxNum >= 0) {
        whereClauses.push('o.value <= ?')
        queryParams.push(valorMaxNum)
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // Query base para estatísticas
    let selectClause = `
      COUNT(*) as total,
      COALESCE(SUM(o.value), 0) as valor_total,
      COUNT(CASE WHEN o.gain_date IS NOT NULL AND o.status = 'gain' THEN 1 END) as total_ganhas,
      COUNT(CASE WHEN o.lost_date IS NOT NULL AND o.status = 'lost' THEN 1 END) as total_perdidas,
      COUNT(CASE WHEN o.gain_date IS NULL AND o.lost_date IS NULL THEN 1 END) as total_abertas,
      COALESCE(SUM(CASE WHEN o.gain_date IS NOT NULL AND o.status = 'gain' THEN o.value ELSE 0 END), 0) as valor_ganhas,
      COALESCE(SUM(CASE WHEN o.lost_date IS NOT NULL AND o.status = 'lost' THEN o.value ELSE 0 END), 0) as valor_perdidas,
      COALESCE(SUM(CASE WHEN o.gain_date IS NULL AND o.lost_date IS NULL THEN o.value ELSE 0 END), 0) as valor_abertas,
      COALESCE(AVG(CASE WHEN o.gain_date IS NOT NULL AND o.status = 'gain' AND o.createDate IS NOT NULL 
        THEN TIMESTAMPDIFF(DAY, o.createDate, o.gain_date) 
        ELSE NULL END), 0) as won_time,
      COALESCE(AVG(CASE WHEN o.lost_date IS NOT NULL AND o.status = 'lost' AND o.createDate IS NOT NULL 
        THEN TIMESTAMPDIFF(DAY, o.createDate, o.lost_date) 
        ELSE NULL END), 0) as lost_time,
      COALESCE(AVG(CASE WHEN o.gain_date IS NULL AND o.lost_date IS NULL AND o.createDate IS NOT NULL 
        THEN TIMESTAMPDIFF(DAY, o.createDate, NOW()) 
        ELSE NULL END), 0) as open_time
    `

    let groupByClause = ''
    let needsFunilJoin = groupBy === 'funil'
    
    // Agrupamento opcional - GMT-3
    if (groupBy) {
      if (groupBy === 'day') {
        selectClause += `, DATE(${convertTZToSaoPaulo('o.createDate')}) as periodo`
        groupByClause = `GROUP BY DATE(${convertTZToSaoPaulo('o.createDate')}) ORDER BY periodo`
      } else if (groupBy === 'month') {
        selectClause += `, DATE_FORMAT(${convertTZToSaoPaulo('o.createDate')}, '%Y-%m') as periodo`
        groupByClause = `GROUP BY DATE_FORMAT(${convertTZToSaoPaulo('o.createDate')}, "%Y-%m") ORDER BY periodo`
      } else if (groupBy === 'status') {
        selectClause += `, 
          CASE 
            WHEN o.gain_date IS NOT NULL AND o.status = 'gain' THEN 'ganha'
            WHEN o.lost_date IS NOT NULL AND o.status = 'lost' THEN 'perdida'
            ELSE 'aberta'
          END as periodo`
        groupByClause = 'GROUP BY periodo ORDER BY periodo'
      } else if (groupBy === 'funil') {
        // Funil será tratado separadamente na query com JOIN
        selectClause += `, cf.id_funil as funil_id, f.funil_nome as periodo`
      }
    }

    // Verificar se deve pular query principal (otimização quando all=1)
    // IMPORTANTE: Para status=open, NÃO pular a query principal, pois precisamos buscar TODAS as abertas
    // (sem filtro de data) para calcular o total_abertas_geral
    const skipMainQuery = allParam && (
      (statusParam === 'gain' || statusParam === 'won') && gainDateStart && gainDateEnd ||
      statusParam === 'lost' && lostDateStart && lostDateEnd
      // Removido: statusParam === 'open' && createdDateStart && createdDateEnd
      // Para open, sempre executar query principal para buscar todas as abertas
    )

    // Construir query final
    let baseQuery = ''
    let results: any[] = []
    
    if (!skipMainQuery) {
      if (groupBy === 'funil') {
        // Query especial para agrupamento por funil
        baseQuery = `
          SELECT 
            ${selectClause}
          FROM oportunidades o
          LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
          LEFT JOIN funis f ON cf.id_funil = f.id
          ${whereClause}
          GROUP BY cf.id_funil, f.funil_nome
          ORDER BY f.funil_nome
        `
      } else {
        // Query padrão
        baseQuery = `
          SELECT ${selectClause}
          FROM oportunidades o
          ${whereClause}
          ${groupByClause}
        `
      }

      // Executar query principal
      results = await executeQuery(baseQuery, queryParams) as any[]
    }

    // Se all=1 e houver filtro de data, buscar também estatísticas do período
    let statsDoPeriodo: any = null
    // Para status=open: usar created_date
    // Para status=lost: usar lost_date
    // Para status=gain: usar gain_date para filtrar, mas separar por createDate
    if (allParam && (statusParam === 'gain' || statusParam === 'won') && gainDateStart && gainDateEnd) {
      // Base comum: todas as oportunidades ganhas no período (gain_date)
      const whereClausesBase: string[] = ['o.archived = 0']
      const queryParamsBase: any[] = []
      
      // Status gain (oportunidades ganhas)
      whereClausesBase.push('(o.gain_date IS NOT NULL AND o.status = \'gain\')')
      
      // Filtro de data de ganho (período) - TODAS devem ter gain_date no período
      whereClausesBase.push(`o.gain_date >= ?`)
      queryParamsBase.push(formatDateSaoPauloToUTC(gainDateStart, false))
      whereClausesBase.push(`o.gain_date <= ?`)
      queryParamsBase.push(formatDateSaoPauloToUTC(gainDateEnd, true))
      
      // Aplicar outros filtros (unidades, vendedores, etc.)
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',')
        whereClausesBase.push(`CAST(o.user AS UNSIGNED) IN (${placeholders})`)
        queryParamsBase.push(...userIds)
      }
      
      // Aplicar filtro de funil se houver
      if (funilIdParam) {
        const funilIds = funilIdParam
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id) && id > 0)
        if (funilIds.length > 0) {
          whereClausesBase.push(`EXISTS (
            SELECT 1 FROM colunas_funil cf 
            WHERE cf.id = o.coluna_funil_id 
            AND cf.id_funil IN (${funilIds.map(() => '?').join(',')})
          )`)
          queryParamsBase.push(...funilIds)
        }
      }
      
      const whereClauseBase = whereClausesBase.length > 0 ? `WHERE ${whereClausesBase.join(' AND ')}` : ''
      
      // Query 1: Ganhas com createDate DENTRO do período (mas gain_date no período)
      const whereClausesDentro: string[] = [...whereClausesBase]
      const queryParamsDentro: any[] = [...queryParamsBase]
      
      whereClausesDentro.push(`o.createDate >= ?`)
      queryParamsDentro.push(formatDateSaoPauloToUTC(gainDateStart, false))
      whereClausesDentro.push(`o.createDate <= ?`)
      queryParamsDentro.push(formatDateSaoPauloToUTC(gainDateEnd, true))
      
      const whereClauseDentro = whereClausesDentro.length > 0 ? `WHERE ${whereClausesDentro.join(' AND ')}` : ''
      
      const queryDentro = `
        SELECT 
          COUNT(*) as total_ganhas_dentro,
          COALESCE(SUM(o.value), 0) as valor_ganhas_dentro,
          COALESCE(AVG(o.value), 0) as ticket_medio_dentro
        FROM oportunidades o
        ${whereClauseDentro}
      `
      
      // Query 2: Ganhas com createDate FORA do período (mas gain_date no período)
      const whereClausesFora: string[] = [...whereClausesBase]
      const queryParamsFora: any[] = [...queryParamsBase]
      
      // Corrigido: createDate fora do período = createDate antes do início OU createDate depois do fim
      whereClausesFora.push(`(o.createDate < ? OR o.createDate > ?)`)
      queryParamsFora.push(formatDateSaoPauloToUTC(gainDateStart, false))
      queryParamsFora.push(formatDateSaoPauloToUTC(gainDateEnd, true))
      
      const whereClauseFora = whereClausesFora.length > 0 ? `WHERE ${whereClausesFora.join(' AND ')}` : ''
      
      const queryFora = `
        SELECT 
          COUNT(*) as total_ganhas_fora,
          COALESCE(SUM(o.value), 0) as valor_ganhas_fora,
          COALESCE(AVG(o.value), 0) as ticket_medio_fora
        FROM oportunidades o
        ${whereClauseFora}
      `
      
      // Executar ambas as queries
      const [resultDentro, resultFora] = await Promise.all([
        executeQuery(queryDentro, queryParamsDentro) as Promise<any[]>,
        executeQuery(queryFora, queryParamsFora) as Promise<any[]>
      ])
      
      // Query para obter o total geral (todas ganhas no período)
      const queryTotal = `
        SELECT 
          COUNT(*) as total_ganhas_periodo,
          COALESCE(SUM(o.value), 0) as valor_ganhas_periodo,
          COALESCE(AVG(o.value), 0) as ticket_medio_periodo,
          COALESCE(MIN(o.value), 0) as valor_minimo_periodo,
          COALESCE(MAX(o.value), 0) as valor_maximo_periodo
        FROM oportunidades o
        ${whereClauseBase}
      `
      
      // Query para obter o total de oportunidades criadas no período (createDate)
      // Esta query busca TODAS as oportunidades criadas no período, independente do status
      // para calcular a taxa de conversão
      const whereClausesCriadas: string[] = ['o.archived = 0']
      const queryParamsCriadas: any[] = []
      
      // Filtro de data de criação (período baseado no createDate)
      whereClausesCriadas.push(`o.createDate >= ?`)
      queryParamsCriadas.push(formatDateSaoPauloToUTC(gainDateStart, false))
      whereClausesCriadas.push(`o.createDate <= ?`)
      queryParamsCriadas.push(formatDateSaoPauloToUTC(gainDateEnd, true))
      
      // Aplicar outros filtros (unidades, vendedores, etc.) - mesmo filtro das outras queries
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',')
        whereClausesCriadas.push(`CAST(o.user AS UNSIGNED) IN (${placeholders})`)
        queryParamsCriadas.push(...userIds)
      }
      
      // Aplicar filtro de funil se houver
      if (funilIdParam) {
        const funilIds = funilIdParam
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id) && id > 0)
        if (funilIds.length > 0) {
          whereClausesCriadas.push(`EXISTS (
            SELECT 1 FROM colunas_funil cf 
            WHERE cf.id = o.coluna_funil_id 
            AND cf.id_funil IN (${funilIds.map(() => '?').join(',')})
          )`)
          queryParamsCriadas.push(...funilIds)
        }
      }
      
      const whereClauseCriadas = whereClausesCriadas.length > 0 ? `WHERE ${whereClausesCriadas.join(' AND ')}` : ''
      
      const queryCriadas = `
        SELECT 
          COUNT(*) as total_criadas_periodo,
          COALESCE(SUM(o.value), 0) as valor_criadas_periodo
        FROM oportunidades o
        ${whereClauseCriadas}
      `
      
      // Executar todas as queries
      const [resultGanhasDentro, resultGanhasFora, resultGanhasTotal, resultCriadas] = await Promise.all([
        executeQuery(queryDentro, queryParamsDentro) as Promise<any[]>,
        executeQuery(queryFora, queryParamsFora) as Promise<any[]>,
        executeQuery(queryTotal, queryParamsBase) as Promise<any[]>,
        executeQuery(queryCriadas, queryParamsCriadas) as Promise<any[]>
      ])
      
      // Calcular taxa de conversão
      const totalCriadasPeriodo = Number(resultCriadas[0]?.total_criadas_periodo || 0)
      const totalGanhasDentro = Number(resultGanhasDentro[0]?.total_ganhas_dentro || 0)
      const totalGanhasPeriodo = Number(resultGanhasTotal[0]?.total_ganhas_periodo || 0)
      
      // Taxa 1: Apenas criadas no período (mantida para compatibilidade)
      const taxaConversao = totalCriadasPeriodo > 0 
        ? Number(((totalGanhasDentro / totalCriadasPeriodo) * 100).toFixed(2))
        : 0
      
      // Taxa 2: Incluindo ganhas criadas fora do período (OPÇÃO 2 - RECOMENDADA)
      const taxaConversaoCompleta = totalCriadasPeriodo > 0 
        ? Number(((totalGanhasPeriodo / totalCriadasPeriodo) * 100).toFixed(2))
        : 0
      
      if ((resultGanhasDentro && resultGanhasDentro.length > 0) || (resultGanhasFora && resultGanhasFora.length > 0) || (resultGanhasTotal && resultGanhasTotal.length > 0)) {
        statsDoPeriodo = {
          total_ganhas_periodo: Number(resultGanhasTotal[0]?.total_ganhas_periodo || 0), // Total geral (já filtrado por gain_date)
          valor_ganhas_periodo: Number(resultGanhasTotal[0]?.valor_ganhas_periodo || 0), // Valor total geral
          ticket_medio_periodo: Number(resultGanhasTotal[0]?.ticket_medio_periodo || 0), // Ticket médio geral
          valor_minimo_periodo: Number(resultGanhasTotal[0]?.valor_minimo_periodo || 0), // Valor mínimo geral (apenas para ganhos)
          valor_maximo_periodo: Number(resultGanhasTotal[0]?.valor_maximo_periodo || 0), // Valor máximo geral (apenas para ganhos)
          total_ganhas_dentro: Number(resultGanhasDentro[0]?.total_ganhas_dentro || 0),
          valor_ganhas_dentro: Number(resultGanhasDentro[0]?.valor_ganhas_dentro || 0),
          ticket_medio_dentro: Number(resultGanhasDentro[0]?.ticket_medio_dentro || 0),
          total_ganhas_fora: Number(resultGanhasFora[0]?.total_ganhas_fora || 0),
          valor_ganhas_fora: Number(resultGanhasFora[0]?.valor_ganhas_fora || 0),
          ticket_medio_fora: Number(resultGanhasFora[0]?.ticket_medio_fora || 0),
          total_criadas_periodo: totalCriadasPeriodo, // Total de oportunidades criadas no período (createDate)
          taxa_conversao: taxaConversao, // Taxa de conversão: (ganhas com createDate no período / criadas no período) * 100
          taxa_conversao_completa: taxaConversaoCompleta // Taxa de conversão: (todas as ganhas no período / criadas no período) * 100
        }
      }
    } else if (allParam && statusParam === 'open' && createdDateStart && createdDateEnd) {
      // Construir where clauses para query do período (incluindo created_date)
      const whereClausesPeriodo: string[] = ['o.archived = 0']
      const queryParamsPeriodo: any[] = []
      
      // Status open
      whereClausesPeriodo.push('(o.gain_date IS NULL AND o.lost_date IS NULL)')
      
      // Filtro de data de criação (período)
      whereClausesPeriodo.push(`o.createDate >= ?`)
      queryParamsPeriodo.push(formatDateSaoPauloToUTC(createdDateStart, false))
      whereClausesPeriodo.push(`o.createDate <= ?`)
      queryParamsPeriodo.push(formatDateSaoPauloToUTC(createdDateEnd, true))
      
      // Aplicar outros filtros (unidades, vendedores, etc.)
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',')
        whereClausesPeriodo.push(`CAST(o.user AS UNSIGNED) IN (${placeholders})`)
        queryParamsPeriodo.push(...userIds)
      }
      
      // Aplicar filtro de funil se houver
      if (funilIdParam) {
        const funilIds = funilIdParam
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id) && id > 0)
        if (funilIds.length > 0) {
          whereClausesPeriodo.push(`EXISTS (
            SELECT 1 FROM colunas_funil cf 
            WHERE cf.id = o.coluna_funil_id 
            AND cf.id_funil IN (${funilIds.map(() => '?').join(',')})
          )`)
          queryParamsPeriodo.push(...funilIds)
        }
      }
      
      const whereClausePeriodo = whereClausesPeriodo.length > 0 ? `WHERE ${whereClausesPeriodo.join(' AND ')}` : ''
      
      const queryPeriodo = `
        SELECT 
          COUNT(*) as total_abertas_periodo,
          COALESCE(SUM(o.value), 0) as valor_abertas_periodo
        FROM oportunidades o
        ${whereClausePeriodo}
      `
      
      const resultPeriodo = await executeQuery(queryPeriodo, queryParamsPeriodo) as any[]
      if (resultPeriodo && resultPeriodo.length > 0) {
        statsDoPeriodo = {
          total_abertas_periodo: Number(resultPeriodo[0]?.total_abertas_periodo || 0),
          valor_abertas_periodo: Number(resultPeriodo[0]?.valor_abertas_periodo || 0)
        }
      }
    } else if (allParam && statusParam === 'lost' && lostDateStart && lostDateEnd) {
      // Base comum: todas as oportunidades perdidas no período (lost_date)
      const whereClausesBase: string[] = ['o.archived = 0']
      const queryParamsBase: any[] = []
      
      // Status lost (oportunidades perdidas)
      whereClausesBase.push('(o.lost_date IS NOT NULL AND o.status = \'lost\')')
      
      // Filtro de data de perda (período) - TODAS devem ter lost_date no período
      whereClausesBase.push(`o.lost_date >= ?`)
      queryParamsBase.push(formatDateSaoPauloToUTC(lostDateStart, false))
      whereClausesBase.push(`o.lost_date <= ?`)
      queryParamsBase.push(formatDateSaoPauloToUTC(lostDateEnd, true))
      
      // Aplicar outros filtros (unidades, vendedores, etc.)
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',')
        whereClausesBase.push(`CAST(o.user AS UNSIGNED) IN (${placeholders})`)
        queryParamsBase.push(...userIds)
      }
      
      // Aplicar filtro de funil se houver
      if (funilIdParam) {
        const funilIds = funilIdParam
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id) && id > 0)
        if (funilIds.length > 0) {
          whereClausesBase.push(`EXISTS (
            SELECT 1 FROM colunas_funil cf 
            WHERE cf.id = o.coluna_funil_id 
            AND cf.id_funil IN (${funilIds.map(() => '?').join(',')})
          )`)
          queryParamsBase.push(...funilIds)
        }
      }
      
      const whereClauseBase = whereClausesBase.length > 0 ? `WHERE ${whereClausesBase.join(' AND ')}` : ''
      
      // Query 1: Perdidas com createDate DENTRO do período (mas lost_date no período)
      const whereClausesDentro: string[] = [...whereClausesBase]
      const queryParamsDentro: any[] = [...queryParamsBase]
      
      whereClausesDentro.push(`o.createDate >= ?`)
      queryParamsDentro.push(formatDateSaoPauloToUTC(lostDateStart, false))
      whereClausesDentro.push(`o.createDate <= ?`)
      queryParamsDentro.push(formatDateSaoPauloToUTC(lostDateEnd, true))
      
      const whereClauseDentro = whereClausesDentro.length > 0 ? `WHERE ${whereClausesDentro.join(' AND ')}` : ''
      
      const queryDentro = `
        SELECT 
          COUNT(*) as total_perdidas_dentro,
          COALESCE(SUM(o.value), 0) as valor_perdidas_dentro
        FROM oportunidades o
        ${whereClauseDentro}
      `
      
      // Query 2: Perdidas com createDate FORA do período (mas lost_date no período)
      const whereClausesFora: string[] = [...whereClausesBase]
      const queryParamsFora: any[] = [...queryParamsBase]
      
      // Corrigido: createDate fora do período = createDate antes do início OU createDate depois do fim
      whereClausesFora.push(`(o.createDate < ? OR o.createDate > ?)`)
      queryParamsFora.push(formatDateSaoPauloToUTC(lostDateStart, false))
      queryParamsFora.push(formatDateSaoPauloToUTC(lostDateEnd, true))
      
      const whereClauseFora = whereClausesFora.length > 0 ? `WHERE ${whereClausesFora.join(' AND ')}` : ''
      
      const queryFora = `
        SELECT 
          COUNT(*) as total_perdidas_fora,
          COALESCE(SUM(o.value), 0) as valor_perdidas_fora
        FROM oportunidades o
        ${whereClauseFora}
      `
      
      // Query para obter o total geral (todas perdidas no período)
      const queryTotal = `
        SELECT 
          COUNT(*) as total_perdidas_periodo,
          COALESCE(SUM(o.value), 0) as valor_perdidas_periodo
        FROM oportunidades o
        ${whereClauseBase}
      `
      
      // Executar todas as queries
      const [resultDentro, resultFora, resultTotal] = await Promise.all([
        executeQuery(queryDentro, queryParamsDentro) as Promise<any[]>,
        executeQuery(queryFora, queryParamsFora) as Promise<any[]>,
        executeQuery(queryTotal, queryParamsBase) as Promise<any[]>
      ])
      
      if ((resultDentro && resultDentro.length > 0) || (resultFora && resultFora.length > 0) || (resultTotal && resultTotal.length > 0)) {
        statsDoPeriodo = {
          total_perdidas_periodo: Number(resultTotal[0]?.total_perdidas_periodo || 0), // Total geral (já filtrado por lost_date)
          valor_perdidas_periodo: Number(resultTotal[0]?.valor_perdidas_periodo || 0), // Valor total geral
          total_perdidas_dentro: Number(resultDentro[0]?.total_perdidas_dentro || 0),
          valor_perdidas_dentro: Number(resultDentro[0]?.valor_perdidas_dentro || 0),
          total_perdidas_fora: Number(resultFora[0]?.total_perdidas_fora || 0),
          valor_perdidas_fora: Number(resultFora[0]?.valor_perdidas_fora || 0)
        }
      }
    }

    // Se houver filtro de vendedores, buscar também estatísticas por vendedor
    let statsPorVendedor: any[] = []
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',')
      const queryPorVendedor = `
        SELECT 
          CAST(o.user AS UNSIGNED) as vendedor_id,
          COUNT(*) as total,
          COALESCE(SUM(o.value), 0) as valor_total,
          COUNT(CASE WHEN o.gain_date IS NOT NULL AND o.status = 'gain' THEN 1 END) as total_ganhas,
          COUNT(CASE WHEN o.lost_date IS NOT NULL AND o.status = 'lost' THEN 1 END) as total_perdidas,
          COUNT(CASE WHEN o.gain_date IS NULL AND o.lost_date IS NULL THEN 1 END) as total_abertas,
          COALESCE(SUM(CASE WHEN o.gain_date IS NOT NULL AND o.status = 'gain' THEN o.value ELSE 0 END), 0) as valor_ganhas,
          COALESCE(SUM(CASE WHEN o.lost_date IS NOT NULL AND o.status = 'lost' THEN o.value ELSE 0 END), 0) as valor_perdidas,
          COALESCE(SUM(CASE WHEN o.gain_date IS NULL AND o.lost_date IS NULL THEN o.value ELSE 0 END), 0) as valor_abertas,
          COALESCE(AVG(CASE WHEN o.gain_date IS NOT NULL AND o.status = 'gain' AND o.createDate IS NOT NULL 
            THEN TIMESTAMPDIFF(DAY, o.createDate, o.gain_date) 
            ELSE NULL END), 0) as won_time,
          COALESCE(AVG(CASE WHEN o.lost_date IS NOT NULL AND o.status = 'lost' AND o.createDate IS NOT NULL 
            THEN TIMESTAMPDIFF(DAY, o.createDate, o.lost_date) 
            ELSE NULL END), 0) as lost_time,
          COALESCE(AVG(CASE WHEN o.gain_date IS NULL AND o.lost_date IS NULL AND o.createDate IS NOT NULL 
            THEN TIMESTAMPDIFF(DAY, o.createDate, NOW()) 
            ELSE NULL END), 0) as open_time
        FROM oportunidades o
        ${whereClause}
        GROUP BY CAST(o.user AS UNSIGNED)
        ORDER BY total DESC
      `
      
      statsPorVendedor = await executeQuery(queryPorVendedor, queryParams) as any[]
    }

    // Formatar resposta
    // Se pulamos a query principal, usar dados do período
    let stats: any[]
    if (skipMainQuery && statsDoPeriodo) {
      // Usar dados do statsDoPeriodo para construir stats
      const statsFromPeriodo: any = {
        total: 0,
        valor_total: 0,
        total_ganhas: 0,
        total_perdidas: 0,
        total_abertas: 0,
        valor_ganhas: 0,
        valor_perdidas: 0,
        valor_abertas: 0,
        won_time: 0,
        lost_time: 0,
        open_time: 0
      }
      
      if (statusParam === 'gain' || statusParam === 'won') {
        statsFromPeriodo.total = statsDoPeriodo.total_ganhas_periodo || 0
        statsFromPeriodo.valor_total = statsDoPeriodo.valor_ganhas_periodo || 0
        statsFromPeriodo.total_ganhas = statsDoPeriodo.total_ganhas_periodo || 0
        statsFromPeriodo.valor_ganhas = statsDoPeriodo.valor_ganhas_periodo || 0
      } else if (statusParam === 'lost') {
        statsFromPeriodo.total = statsDoPeriodo.total_perdidas_periodo || 0
        statsFromPeriodo.valor_total = statsDoPeriodo.valor_perdidas_periodo || 0
        statsFromPeriodo.total_perdidas = statsDoPeriodo.total_perdidas_periodo || 0
        statsFromPeriodo.valor_perdidas = statsDoPeriodo.valor_perdidas_periodo || 0
      } else if (statusParam === 'open') {
        statsFromPeriodo.total = statsDoPeriodo.total_abertas_periodo || 0
        statsFromPeriodo.valor_total = statsDoPeriodo.valor_abertas_periodo || 0
        statsFromPeriodo.total_abertas = statsDoPeriodo.total_abertas_periodo || 0
        statsFromPeriodo.valor_abertas = statsDoPeriodo.valor_abertas_periodo || 0
      }
      
      stats = [statsFromPeriodo]
    } else {
      stats = groupBy ? results : [results[0] || {
        total: 0,
        valor_total: 0,
        total_ganhas: 0,
        total_perdidas: 0,
        total_abertas: 0,
        valor_ganhas: 0,
        valor_perdidas: 0,
        valor_abertas: 0,
        won_time: 0,
        lost_time: 0,
        open_time: 0
      }]
    }

    // Construir objeto de filtros ativos (sem valores null)
    const activeFilters: Record<string, any> = {}
    if (statusParam) activeFilters.status = statusParam
    if (funilIdParam) activeFilters.funil_id = funilIdParam
    if (userIdParam) activeFilters.user_id = userIdParam
    if (unidadeIdParam) activeFilters.unidade_id = unidadeIdParam
    if (createdDateStart) activeFilters.created_date_start = createdDateStart
    if (createdDateEnd) activeFilters.created_date_end = createdDateEnd
    if (gainDateStart) activeFilters.gain_date_start = gainDateStart
    if (gainDateEnd) activeFilters.gain_date_end = gainDateEnd
    if (lostDateStart) activeFilters.lost_date_start = lostDateStart
    if (lostDateEnd) activeFilters.lost_date_end = lostDateEnd
    if (reopenDateStart) activeFilters.reopen_date_start = reopenDateStart
    if (reopenDateEnd) activeFilters.reopen_date_end = reopenDateEnd
    if (expectedCloseDateStart) activeFilters.expected_close_date_start = expectedCloseDateStart
    if (expectedCloseDateEnd) activeFilters.expected_close_date_end = expectedCloseDateEnd
    if (updateDateStart) activeFilters.update_date_start = updateDateStart
    if (updateDateEnd) activeFilters.update_date_end = updateDateEnd
    if (lastColumnChangeStart) activeFilters.last_column_change_start = lastColumnChangeStart
    if (lastColumnChangeEnd) activeFilters.last_column_change_end = lastColumnChangeEnd
    if (lastStatusChangeStart) activeFilters.last_status_change_start = lastStatusChangeStart
    if (lastStatusChangeEnd) activeFilters.last_status_change_end = lastStatusChangeEnd
    if (lossReasonParam) activeFilters.loss_reason = lossReasonParam
    if (gainReasonParam) activeFilters.gain_reason = gainReasonParam
    if (saleChannelParam) activeFilters.sale_channel = saleChannelParam
    if (campaignParam) activeFilters.campaign = campaignParam
    if (leadIdParam) activeFilters.lead_id = leadIdParam
    if (valorMin) activeFilters.valor_min = valorMin
    if (valorMax) activeFilters.valor_max = valorMax
    if (groupBy) activeFilters.group_by = groupBy

    // Determinar quais campos incluir baseado no status filtrado (para stats por vendedor)
    const statuses = statusParam ? statusParam.split(',').map(s => s.trim().toLowerCase()) : []
    const isOnlyGain = statuses.length > 0 && !statuses.includes('all') && 
                      (statuses.includes('gain') || statuses.includes('won')) && 
                      !statuses.includes('lost') && !statuses.includes('open')
    const isOnlyLost = statuses.length > 0 && !statuses.includes('all') && 
                      (statuses.includes('lost') || statuses.includes('perdida')) && 
                      !statuses.includes('gain') && !statuses.includes('won') && !statuses.includes('open')
    const isOnlyOpen = statuses.length > 0 && !statuses.includes('all') && 
                      (statuses.includes('open') || statuses.includes('aberta')) && 
                      !statuses.includes('gain') && !statuses.includes('won') && !statuses.includes('lost')
    
    // Mapear stats por vendedor com nomes
    const statsPorVendedorComNome = statsPorVendedor.map(stat => {
      const vendedor = vendedoresFiltrados.find(v => Number(v.id) === Number(stat.vendedor_id))
      const vendedorStat: any = {
        vendedor_id: Number(stat.vendedor_id),
        vendedor_nome: vendedor ? `${vendedor.name} ${vendedor.lastName}`.trim() : 'Desconhecido',
        total: Number(stat.total || 0),
        valor_total: Number(stat.valor_total || 0)
      }
      
      // Incluir campos de ganho
      if (!isOnlyLost && !isOnlyOpen) {
        vendedorStat.total_ganhas = Number(stat.total_ganhas || 0)
        vendedorStat.valor_ganhas = Number(stat.valor_ganhas || 0)
        vendedorStat.won_time = Number(stat.won_time || 0)
      }
      
      // Incluir campos de perda apenas se não for apenas ganho
      if (!isOnlyGain && !isOnlyOpen) {
        vendedorStat.total_perdidas = Number(stat.total_perdidas || 0)
        vendedorStat.valor_perdidas = Number(stat.valor_perdidas || 0)
        vendedorStat.lost_time = Number(stat.lost_time || 0)
      }
      
      // Incluir campos de abertas apenas se não for apenas ganho ou perda
      if (!isOnlyGain && !isOnlyLost) {
        vendedorStat.total_abertas = Number(stat.total_abertas || 0)
        vendedorStat.valor_abertas = Number(stat.valor_abertas || 0)
        vendedorStat.open_time = Number(stat.open_time || 0)
      }
      
      return vendedorStat
    })

    // Estrutura de resposta diferenciada
    if (groupBy) {
      // Com agrupamento: retornar array de stats
      // Determinar quais campos incluir baseado no status filtrado
      const statusesGroup = statusParam ? statusParam.split(',').map(s => s.trim().toLowerCase()) : []
      const isOnlyGainGroup = statusesGroup.length > 0 && !statusesGroup.includes('all') && 
                        (statusesGroup.includes('gain') || statusesGroup.includes('won')) && 
                        !statusesGroup.includes('lost') && !statusesGroup.includes('open')
      const isOnlyLostGroup = statusesGroup.length > 0 && !statusesGroup.includes('all') && 
                        (statusesGroup.includes('lost') || statusesGroup.includes('perdida')) && 
                        !statusesGroup.includes('gain') && !statusesGroup.includes('won') && !statusesGroup.includes('open')
      const isOnlyOpenGroup = statusesGroup.length > 0 && !statusesGroup.includes('all') && 
                        (statusesGroup.includes('open') || statusesGroup.includes('aberta')) && 
                        !statusesGroup.includes('gain') && !statusesGroup.includes('won') && !statusesGroup.includes('lost')
      
      return NextResponse.json({
        success: true,
        data: {
          agrupado_por: groupBy,
          itens: stats.map(stat => {
            const item: any = {
              periodo: stat.periodo,
              ...(groupBy === 'funil' && stat.funil_id ? { funil_id: Number(stat.funil_id) } : {}),
              total: Number(stat.total || 0),
              valor_total: Number(stat.valor_total || 0)
            }
            
            // Incluir campos de ganho
            if (!isOnlyLostGroup && !isOnlyOpenGroup) {
              item.total_ganhas = Number(stat.total_ganhas || 0)
              item.valor_ganhas = Number(stat.valor_ganhas || 0)
              item.won_time = Number(stat.won_time || 0)
            }
            
            // Incluir campos de perda apenas se não for apenas ganho
            if (!isOnlyGainGroup && !isOnlyOpenGroup) {
              item.total_perdidas = Number(stat.total_perdidas || 0)
              item.valor_perdidas = Number(stat.valor_perdidas || 0)
              item.lost_time = Number(stat.lost_time || 0)
            }
            
            // Incluir campos de abertas apenas se não for apenas ganho ou perda
            if (!isOnlyGainGroup && !isOnlyLostGroup) {
              item.total_abertas = Number(stat.total_abertas || 0)
              item.valor_abertas = Number(stat.valor_abertas || 0)
              item.open_time = Number(stat.open_time || 0)
            }
            
            return item
          }),
          ...(statsPorVendedorComNome.length > 0 ? { por_vendedor: statsPorVendedorComNome } : {})
        },
        ...(Object.keys(activeFilters).length > 0 ? { filters: activeFilters } : {}),
        ...(unidadesInfo.length > 0 ? { unidade_info: unidadesInfo } : {})
      })
    } else {
      // Sem agrupamento: retornar objeto único
      // Determinar quais campos incluir baseado no status filtrado
      const statuses = statusParam ? statusParam.split(',').map(s => s.trim().toLowerCase()) : []
      const isOnlyGain = statuses.length > 0 && !statuses.includes('all') && 
                        (statuses.includes('gain') || statuses.includes('won')) && 
                        !statuses.includes('lost') && !statuses.includes('open')
      const isOnlyLost = statuses.length > 0 && !statuses.includes('all') && 
                        (statuses.includes('lost') || statuses.includes('perdida')) && 
                        !statuses.includes('gain') && !statuses.includes('won') && !statuses.includes('open')
      const isOnlyOpen = statuses.length > 0 && !statuses.includes('all') && 
                        (statuses.includes('open') || statuses.includes('aberta')) && 
                        !statuses.includes('gain') && !statuses.includes('won') && !statuses.includes('lost')
      
      const dataResponse: any = {
        total: Number(stats[0]?.total || 0),
        valor_total: Number(stats[0]?.valor_total || 0)
      }
      
      // Incluir campos de ganho
      if (!isOnlyLost && !isOnlyOpen) {
        dataResponse.total_ganhas = Number(stats[0]?.total_ganhas || 0)
        dataResponse.valor_ganhas = Number(stats[0]?.valor_ganhas || 0)
        dataResponse.won_time = Number(stats[0]?.won_time || 0)
      }
      
      // Incluir campos de perda apenas se não for apenas ganho
      if (!isOnlyGain && !isOnlyOpen) {
        dataResponse.total_perdidas = Number(stats[0]?.total_perdidas || 0)
        dataResponse.valor_perdidas = Number(stats[0]?.valor_perdidas || 0)
        dataResponse.lost_time = Number(stats[0]?.lost_time || 0)
      }
      
      // Incluir campos de abertas apenas se não for apenas ganho ou perda
      if (!isOnlyGain && !isOnlyLost) {
        dataResponse.total_abertas = Number(stats[0]?.total_abertas || 0)
        dataResponse.valor_abertas = Number(stats[0]?.valor_abertas || 0)
        dataResponse.open_time = Number(stats[0]?.open_time || 0)
      }
      
      // Adicionar informações padronizadas (médias, percentuais, etc.)
      if (dataResponse.total_ganhas !== undefined) {
        dataResponse.media_valor_ganhas = dataResponse.total_ganhas > 0 
          ? Number((dataResponse.valor_ganhas / dataResponse.total_ganhas).toFixed(2)) 
          : 0
      }
      
      if (dataResponse.total_perdidas !== undefined) {
        dataResponse.media_valor_perdidas = dataResponse.total_perdidas > 0 
          ? Number((dataResponse.valor_perdidas / dataResponse.total_perdidas).toFixed(2)) 
          : 0
      }
      
      if (dataResponse.total_abertas !== undefined) {
        dataResponse.media_valor_abertas = dataResponse.total_abertas > 0 
          ? Number((dataResponse.valor_abertas / dataResponse.total_abertas).toFixed(2)) 
          : 0
      }
      
      // Calcular percentuais se houver múltiplos status
      if (dataResponse.total > 0) {
        if (dataResponse.total_ganhas !== undefined) {
          dataResponse.percentual_ganhas = Number(((dataResponse.total_ganhas / dataResponse.total) * 100).toFixed(2))
          dataResponse.percentual_valor_ganhas = dataResponse.valor_total > 0 
            ? Number(((dataResponse.valor_ganhas / dataResponse.valor_total) * 100).toFixed(2)) 
            : 0
        }
        
        if (dataResponse.total_perdidas !== undefined) {
          dataResponse.percentual_perdidas = Number(((dataResponse.total_perdidas / dataResponse.total) * 100).toFixed(2))
          dataResponse.percentual_valor_perdidas = dataResponse.valor_total > 0 
            ? Number(((dataResponse.valor_perdidas / dataResponse.valor_total) * 100).toFixed(2)) 
            : 0
        }
        
        if (dataResponse.total_abertas !== undefined) {
          dataResponse.percentual_abertas = Number(((dataResponse.total_abertas / dataResponse.total) * 100).toFixed(2))
          dataResponse.percentual_valor_abertas = dataResponse.valor_total > 0 
            ? Number(((dataResponse.valor_abertas / dataResponse.valor_total) * 100).toFixed(2)) 
            : 0
        }
      }
      
      // Se all=1 e houver stats do período, adicionar informações detalhadas
      if (allParam && statsDoPeriodo) {
        if (statusParam === 'open') {
          const totalAbertasGeral = Number(stats[0]?.total_abertas || 0)
          const totalAbertasPeriodo = statsDoPeriodo.total_abertas_periodo
          const totalAbertasForaPeriodo = totalAbertasGeral - totalAbertasPeriodo
          const valorAbertasGeral = Number(stats[0]?.valor_abertas || 0)
          const valorAbertasPeriodo = statsDoPeriodo.valor_abertas_periodo
          const valorAbertasForaPeriodo = valorAbertasGeral - valorAbertasPeriodo
          
          dataResponse.total_abertas_geral = totalAbertasGeral
          dataResponse.total_abertas_periodo = totalAbertasPeriodo
          dataResponse.total_abertas_fora_periodo = totalAbertasForaPeriodo
          dataResponse.valor_abertas_periodo = valorAbertasPeriodo
          dataResponse.valor_abertas_fora_periodo = valorAbertasForaPeriodo
          
          // Adicionar informações padronizadas e calculadas
          dataResponse.resumo_periodo = {
            total_oportunidades: totalAbertasPeriodo,
            valor_total: valorAbertasPeriodo,
            media_valor: totalAbertasPeriodo > 0 ? Number((valorAbertasPeriodo / totalAbertasPeriodo).toFixed(2)) : 0,
            percentual_do_total: totalAbertasGeral > 0 ? Number(((totalAbertasPeriodo / totalAbertasGeral) * 100).toFixed(2)) : 0,
            percentual_valor: valorAbertasGeral > 0 ? Number(((valorAbertasPeriodo / valorAbertasGeral) * 100).toFixed(2)) : 0,
            periodo_inicio: createdDateStart || null,
            periodo_fim: createdDateEnd || null
          }
          
          dataResponse.resumo_geral = {
            total_oportunidades: totalAbertasGeral,
            valor_total: valorAbertasGeral,
            media_valor: totalAbertasGeral > 0 ? Number((valorAbertasGeral / totalAbertasGeral).toFixed(2)) : 0
          }
          
          dataResponse.resumo_fora_periodo = {
            total_oportunidades: totalAbertasForaPeriodo,
            valor_total: valorAbertasForaPeriodo,
            media_valor: totalAbertasForaPeriodo > 0 ? Number((valorAbertasForaPeriodo / totalAbertasForaPeriodo).toFixed(2)) : 0,
            percentual_do_total: totalAbertasGeral > 0 ? Number(((totalAbertasForaPeriodo / totalAbertasGeral) * 100).toFixed(2)) : 0,
            percentual_valor: valorAbertasGeral > 0 ? Number(((valorAbertasForaPeriodo / valorAbertasGeral) * 100).toFixed(2)) : 0
          }
        } else if (statusParam === 'lost') {
          // Total de perdidas com lost_date no período selecionado
          const totalPerdidasPeriodo = statsDoPeriodo.total_perdidas_periodo || Number(stats[0]?.total_perdidas || 0)
          const valorPerdidasPeriodo = statsDoPeriodo.valor_perdidas_periodo || Number(stats[0]?.valor_perdidas || 0)
          
          // Perdidas com createDate DENTRO do período (mas lost_date no período)
          const totalPerdidasDentro = statsDoPeriodo.total_perdidas_dentro || 0
          const valorPerdidasDentro = statsDoPeriodo.valor_perdidas_dentro || 0
          
          // Perdidas com createDate FORA do período (mas lost_date no período)
          const totalPerdidasFora = statsDoPeriodo.total_perdidas_fora || 0
          const valorPerdidasFora = statsDoPeriodo.valor_perdidas_fora || 0
          
          dataResponse.total_perdidas_periodo = totalPerdidasPeriodo
          dataResponse.valor_perdidas_periodo = valorPerdidasPeriodo
          dataResponse.total_perdidas_dentro_createDate = totalPerdidasDentro
          dataResponse.valor_perdidas_dentro_createDate = valorPerdidasDentro
          dataResponse.total_perdidas_fora_createDate = totalPerdidasFora
          dataResponse.valor_perdidas_fora_createDate = valorPerdidasFora
          
          // Adicionar informações padronizadas e calculadas
          dataResponse.resumo_periodo = {
            total_oportunidades: totalPerdidasPeriodo,
            valor_total: valorPerdidasPeriodo,
            media_valor: totalPerdidasPeriodo > 0 ? Number((valorPerdidasPeriodo / totalPerdidasPeriodo).toFixed(2)) : 0,
            periodo_inicio: lostDateStart || null,
            periodo_fim: lostDateEnd || null
          }
          
          dataResponse.resumo_dentro_createDate = {
            total_oportunidades: totalPerdidasDentro,
            valor_total: valorPerdidasDentro,
            media_valor: totalPerdidasDentro > 0 ? Number((valorPerdidasDentro / totalPerdidasDentro).toFixed(2)) : 0,
            percentual_do_total: totalPerdidasPeriodo > 0 ? Number(((totalPerdidasDentro / totalPerdidasPeriodo) * 100).toFixed(2)) : 0,
            percentual_valor: valorPerdidasPeriodo > 0 ? Number(((valorPerdidasDentro / valorPerdidasPeriodo) * 100).toFixed(2)) : 0
          }
          
          dataResponse.resumo_fora_createDate = {
            total_oportunidades: totalPerdidasFora,
            valor_total: valorPerdidasFora,
            media_valor: totalPerdidasFora > 0 ? Number((valorPerdidasFora / totalPerdidasFora).toFixed(2)) : 0,
            percentual_do_total: totalPerdidasPeriodo > 0 ? Number(((totalPerdidasFora / totalPerdidasPeriodo) * 100).toFixed(2)) : 0,
            percentual_valor: valorPerdidasPeriodo > 0 ? Number(((valorPerdidasFora / valorPerdidasPeriodo) * 100).toFixed(2)) : 0
          }
        } else if (statusParam === 'gain' || statusParam === 'won') {
          // Total de ganhos com gain_date no período selecionado
          const totalGanhasPeriodo = statsDoPeriodo.total_ganhas_periodo || Number(stats[0]?.total_ganhas || 0)
          const valorGanhasPeriodo = statsDoPeriodo.valor_ganhas_periodo || Number(stats[0]?.valor_ganhas || 0)
          
          // Ganhas com createDate DENTRO do período (mas gain_date no período)
          const totalGanhasDentro = statsDoPeriodo.total_ganhas_dentro || 0
          const valorGanhasDentro = statsDoPeriodo.valor_ganhas_dentro || 0
          const ticketMedioDentro = statsDoPeriodo.ticket_medio_dentro || 0
          
          // Ganhas com createDate FORA do período (mas gain_date no período)
          const totalGanhasFora = statsDoPeriodo.total_ganhas_fora || 0
          const valorGanhasFora = statsDoPeriodo.valor_ganhas_fora || 0
          const ticketMedioFora = statsDoPeriodo.ticket_medio_fora || 0
          
          // Totais do período (todas as ganhas)
          const ticketMedioPeriodo = statsDoPeriodo.ticket_medio_periodo || 0
          const valorMinimoPeriodo = statsDoPeriodo.valor_minimo_periodo || 0
          const valorMaximoPeriodo = statsDoPeriodo.valor_maximo_periodo || 0
          
          // Total de oportunidades criadas no período (createDate) - para cálculo da taxa de conversão
          const totalCriadasPeriodo = statsDoPeriodo.total_criadas_periodo || 0
          
          // Taxa de conversão: (oportunidades ganhas com createDate no período) / (total criadas no período) * 100
          const taxaConversao = statsDoPeriodo.taxa_conversao || 0
          
          // Taxa de conversão completa: (todas as ganhas no período) / (criadas no período) * 100
          const taxaConversaoCompleta = statsDoPeriodo.taxa_conversao_completa || 0
          
          dataResponse.total_ganhas_periodo = totalGanhasPeriodo
          dataResponse.valor_ganhas_periodo = valorGanhasPeriodo
          dataResponse.ticket_medio_periodo = ticketMedioPeriodo
          dataResponse.valor_minimo_periodo = valorMinimoPeriodo // Apenas para ganhos (total)
          dataResponse.valor_maximo_periodo = valorMaximoPeriodo // Apenas para ganhos (total)
          dataResponse.total_ganhas_dentro_createDate = totalGanhasDentro
          dataResponse.valor_ganhas_dentro_createDate = valorGanhasDentro
          dataResponse.ticket_medio_dentro_createDate = ticketMedioDentro
          dataResponse.total_ganhas_fora_createDate = totalGanhasFora
          dataResponse.valor_ganhas_fora_createDate = valorGanhasFora
          dataResponse.ticket_medio_fora_createDate = ticketMedioFora
          dataResponse.total_criadas_periodo = totalCriadasPeriodo // Total de oportunidades criadas no período (createDate)
          dataResponse.taxa_conversao = taxaConversao // Taxa de conversão: (ganhas com createDate no período / criadas no período) * 100
          dataResponse.taxa_conversao_completa = taxaConversaoCompleta // Taxa de conversão: (todas as ganhas no período / criadas no período) * 100
          
          // Adicionar informações padronizadas e calculadas
          dataResponse.resumo_periodo = {
            total_oportunidades: totalGanhasPeriodo,
            valor_total: valorGanhasPeriodo,
            media_valor: totalGanhasPeriodo > 0 ? Number((valorGanhasPeriodo / totalGanhasPeriodo).toFixed(2)) : 0,
            ticket_medio: Number(ticketMedioPeriodo.toFixed(2)),
            valor_minimo: valorMinimoPeriodo,
            valor_maximo: valorMaximoPeriodo,
            periodo_inicio: gainDateStart || null,
            periodo_fim: gainDateEnd || null,
            taxa_conversao_completa: taxaConversaoCompleta // Taxa incluindo ganhas criadas fora do período
          }
          
          dataResponse.resumo_dentro_createDate = {
            total_oportunidades: totalGanhasDentro,
            valor_total: valorGanhasDentro,
            media_valor: totalGanhasDentro > 0 ? Number((valorGanhasDentro / totalGanhasDentro).toFixed(2)) : 0,
            ticket_medio: Number(ticketMedioDentro.toFixed(2)),
            percentual_do_total: totalGanhasPeriodo > 0 ? Number(((totalGanhasDentro / totalGanhasPeriodo) * 100).toFixed(2)) : 0,
            percentual_valor: valorGanhasPeriodo > 0 ? Number(((valorGanhasDentro / valorGanhasPeriodo) * 100).toFixed(2)) : 0,
            taxa_conversao: taxaConversao // Taxa de conversão: (ganhas com createDate no período / criadas no período) * 100
          }
          
          dataResponse.resumo_fora_createDate = {
            total_oportunidades: totalGanhasFora,
            valor_total: valorGanhasFora,
            media_valor: totalGanhasFora > 0 ? Number((valorGanhasFora / totalGanhasFora).toFixed(2)) : 0,
            ticket_medio: Number(ticketMedioFora.toFixed(2)),
            percentual_do_total: totalGanhasPeriodo > 0 ? Number(((totalGanhasFora / totalGanhasPeriodo) * 100).toFixed(2)) : 0,
            percentual_valor: valorGanhasPeriodo > 0 ? Number(((valorGanhasFora / valorGanhasPeriodo) * 100).toFixed(2)) : 0
          }
        }
      }
      
      if (statsPorVendedorComNome.length > 0) {
        dataResponse.por_vendedor = statsPorVendedorComNome
      }
      
      return NextResponse.json({
        success: true,
        data: dataResponse,
        ...(Object.keys(activeFilters).length > 0 ? { filters: activeFilters } : {}),
        ...(unidadesInfo.length > 0 ? { unidade_info: unidadesInfo } : {})
      })
    }

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar estatísticas de oportunidades',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

