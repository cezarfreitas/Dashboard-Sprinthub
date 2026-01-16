import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para parse JSON ou CSV
function parseJSON(value: any): any[] {
  if (Array.isArray(value)) return value
  
  // Converter Buffer para string se necessário
  let strValue = value
  if (value && typeof value === 'object' && value.toString) {
    strValue = value.toString()
  }
  
  if (typeof strValue === 'string') {
    // Tentar parse JSON primeiro
    try {
      const parsed = JSON.parse(strValue)
      if (Array.isArray(parsed)) return parsed
      if (typeof parsed === 'object') return [parsed]
      return []
    } catch (e) {
      // Se falhar, tentar parse CSV (ex: "220,250")
      if (strValue.includes(',')) {
        const ids = strValue
          .split(',')
          .map(id => {
            const trimmed = id.trim()
            const num = parseInt(trimmed)
            return isNaN(num) ? null : num
          })
          .filter(id => id !== null)
        return ids
      }
      
      // Tentar parse como número único
      const num = parseInt(strValue.trim())
      if (!isNaN(num)) {
        return [num]
      }
      
      return []
    }
  }
  
  // Se for número direto
  if (typeof strValue === 'number') {
    return [strValue]
  }
  
  return []
}

// Função para construir filtro de unidades (retorna array de user IDs de vendedores)
async function buildUnidadeFilter(unidadeIdsParam: string | null): Promise<number[]> {
  if (!unidadeIdsParam) return []

  const unidadeIds = unidadeIdsParam
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id) && id > 0)

  if (unidadeIds.length === 0) return []

  const placeholders = unidadeIds.map(() => '?').join(',')
  const unidades = await executeQuery(
    `SELECT id, COALESCE(nome, name) as nome, users FROM unidades WHERE id IN (${placeholders}) AND ativo = 1`,
    unidadeIds
  ) as any[]

  if (!unidades || unidades.length === 0) {
    return []
  }

  // Buscar todos os vendedores (qualquer status)
  const todosVendedores = await executeQuery(
    'SELECT id FROM vendedores'
  ) as any[]
  const vendedoresSet = new Set(todosVendedores.map(v => v.id))

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
      let id: any = null
      
      if (typeof u === 'object' && u !== null) {
        id = u.id || u.user_id || u.vendedor_id
      } else if (typeof u === 'number') {
        id = u
      } else if (typeof u === 'string') {
        const parsed = parseInt(u.trim())
        if (!isNaN(parsed)) id = parsed
      }
      
      if (id != null && !isNaN(Number(id))) {
        const userId = Number(id)
        // Aceitar vendedores com qualquer status
        if (vendedoresSet.has(userId)) {
          todosVendedoresIds.add(userId)
        }
      }
    })
  })

  return Array.from(todosVendedoresIds)
}

// GET - Buscar oportunidades diárias agrupadas por dia
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parâmetros obrigatórios
    const tipo = searchParams.get('tipo') // 'criadas', 'ganhas', 'perdidas', 'abertas'
    const dataInicio = searchParams.get('data_inicio') // formato: YYYY-MM-DD
    const dataFim = searchParams.get('data_fim') // formato: YYYY-MM-DD

    // Parâmetros opcionais
    const unidadeIdParam = searchParams.get('unidade_id')
    const userIdParam = searchParams.get('user_id')
    const funilIdParam = searchParams.get('funil_id')
    const allParam = searchParams.get('all') === '1'
    const granularidade = searchParams.get('granularidade') || (searchParams.get('agrupar_por_mes') === '1' ? 'mes' : 'dia')

    // Validações
    if (!tipo) {
      return NextResponse.json(
        {
          success: false,
          message: 'Parâmetro "tipo" é obrigatório. Valores aceitos: criadas, ganhas, perdidas, abertas'
        },
        { status: 400 }
      )
    }

    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        {
          success: false,
          message: 'Parâmetros "data_inicio" e "data_fim" são obrigatórios (formato: YYYY-MM-DD)'
        },
        { status: 400 }
      )
    }

    // Validar e corrigir datas (ajustar para último dia válido do mês se necessário)
    let dataInicioValida = dataInicio
    let dataFimValida = dataFim
    
    // Validar data de início
    try {
      let dataInicioDate = new Date(dataInicio + 'T00:00:00')
      
      // Se a data for inválida, pode ser porque o dia não existe no mês
      if (isNaN(dataInicioDate.getTime())) {
        const partes = dataInicio.split('-')
        if (partes.length === 3) {
          const ano = parseInt(partes[0])
          const mes = parseInt(partes[1])
          const dia = parseInt(partes[2])
          
          // Criar data no primeiro dia do mês seguinte e subtrair 1 dia
          const ultimoDiaMes = new Date(ano, mes, 0) // Dia 0 = último dia do mês anterior
          dataInicioDate = new Date(ano, mes - 1, Math.min(dia, ultimoDiaMes.getDate()))
          dataInicioValida = `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimoDiaMes.getDate())).padStart(2, '0')}`
        } else {
          return NextResponse.json(
            {
              success: false,
              message: 'Data de início inválida. Use o formato YYYY-MM-DD'
            },
            { status: 400 }
          )
        }
      } else {
        dataInicioValida = dataInicio
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data de início inválida. Use o formato YYYY-MM-DD'
        },
        { status: 400 }
      )
    }

    // Validar data de fim
    try {
      let dataFimDate = new Date(dataFim + 'T00:00:00')
      
      // Se a data for inválida, pode ser porque o dia não existe no mês (ex: 31/11)
      // Tentar ajustar para o último dia válido do mês
      if (isNaN(dataFimDate.getTime())) {
        const partes = dataFim.split('-')
        if (partes.length === 3) {
          const ano = parseInt(partes[0])
          const mes = parseInt(partes[1])
          const dia = parseInt(partes[2])
          
          // Criar data no primeiro dia do mês seguinte e subtrair 1 dia
          const ultimoDiaMes = new Date(ano, mes, 0) // Dia 0 = último dia do mês anterior
          dataFimDate = new Date(ano, mes - 1, ultimoDiaMes.getDate())
          dataFimValida = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDiaMes.getDate()).padStart(2, '0')}`
        } else {
          return NextResponse.json(
            {
              success: false,
              message: 'Data de fim inválida. Use o formato YYYY-MM-DD'
            },
            { status: 400 }
          )
        }
      } else {
        dataFimValida = dataFim
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data de fim inválida. Use o formato YYYY-MM-DD'
        },
        { status: 400 }
      )
    }

    // Validar que data de início <= data de fim
    const dataInicioDate = new Date(dataInicioValida + 'T00:00:00')
    const dataFimDate = new Date(dataFimValida + 'T23:59:59')
    
    if (dataInicioDate > dataFimDate) {
      return NextResponse.json(
        {
          success: false,
          message: 'data_inicio deve ser anterior ou igual a data_fim'
        },
        { status: 400 }
      )
    }

    // Construir filtros
    const whereClauses: string[] = ['o.archived = 0']
    const queryParams: any[] = []

    // Determinar campo de data e condições baseado no tipo
    let campoData: string
    let condicaoStatus: string = ''

    switch (tipo.toLowerCase()) {
      case 'criadas':
        campoData = 'o.createDate'
        // Sem filtro de status adicional
        break
      case 'ganhas':
        campoData = 'o.gain_date'
        // Considerar ganhas como tendo gain_date preenchido (compatível com API de unidades)
        // Também aceitar status 'gain' ou 'won' para compatibilidade com diferentes fontes de dados
        condicaoStatus = "AND o.gain_date IS NOT NULL"
        break
      case 'perdidas':
        campoData = 'o.lost_date'
        condicaoStatus = 'AND o.lost_date IS NOT NULL'
        break
      case 'abertas':
        campoData = 'o.createDate'
        condicaoStatus = 'AND o.gain_date IS NULL AND o.lost_date IS NULL'
        break
      default:
        return NextResponse.json(
          {
            success: false,
            message: 'Tipo inválido. Valores aceitos: criadas, ganhas, perdidas, abertas'
          },
          { status: 400 }
        )
    }

    // Filtro de data - usar comparação direta compatível com API de unidades
    whereClauses.push(`${campoData} >= ?`)
    queryParams.push(dataInicioValida + ' 00:00:00')
    whereClauses.push(`${campoData} <= ?`)
    queryParams.push(dataFimValida + ' 23:59:59')

    // Filtro de unidades
    let userIds: number[] = []
    
    if (userIdParam) {
      const userIdsFromParam = userIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)
      userIds.push(...userIdsFromParam)
    }

    if (unidadeIdParam) {
      const unidadeUserIds = await buildUnidadeFilter(unidadeIdParam)
      userIds.push(...unidadeUserIds)
    }

    userIds = Array.from(new Set(userIds))

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',')
      whereClauses.push(`CAST(o.user AS UNSIGNED) IN (${placeholders})`)
      queryParams.push(...userIds)
    }

    // Filtro de funil
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

    // Construir WHERE clause - condicaoStatus já começa com AND, então só precisa remover o AND inicial se não houver outras cláusulas
    let whereClause: string
    if (whereClauses.length > 0) {
      whereClause = `WHERE ${whereClauses.join(' AND ')} ${condicaoStatus}`
    } else if (condicaoStatus) {
      // Remove o AND inicial se condicaoStatus começar com AND
      const statusClean = condicaoStatus.trim().replace(/^AND\s+/i, '')
      whereClause = `WHERE ${statusClean}`
    } else {
      whereClause = ''
    }

    // Campos adicionais baseado no tipo
    const campoValor = tipo === 'ganhas' || tipo === 'perdidas' ? ', COALESCE(SUM(o.value), 0) as valor_total' : ''

    // Query para agrupar por granularidade
    let query: string
    
    if (granularidade === 'mes') {
      // Agrupamento por mês
      query = `
        SELECT 
          DATE_FORMAT(${campoData}, '%Y-%m-01') as data,
          1 as dia,
          MONTH(${campoData}) as mes,
          YEAR(${campoData}) as ano,
          COUNT(*) as total
          ${campoValor}
        FROM oportunidades o
        ${whereClause}
        GROUP BY DATE_FORMAT(${campoData}, '%Y-%m-01'), MONTH(${campoData}), YEAR(${campoData})
        ORDER BY data ASC
      `
    } else if (granularidade === 'semana') {
      // Agrupamento por semana
      query = `
        SELECT 
          DATE_SUB(${campoData}, INTERVAL WEEKDAY(${campoData}) DAY) as data,
          DAY(DATE_SUB(${campoData}, INTERVAL WEEKDAY(${campoData}) DAY)) as dia,
          MONTH(DATE_SUB(${campoData}, INTERVAL WEEKDAY(${campoData}) DAY)) as mes,
          YEAR(DATE_SUB(${campoData}, INTERVAL WEEKDAY(${campoData}) DAY)) as ano,
          COUNT(*) as total
          ${campoValor}
        FROM oportunidades o
        ${whereClause}
        GROUP BY data, dia, mes, ano
        ORDER BY data ASC
      `
    } else if (granularidade === 'ano') {
      // Agrupamento por ano
      query = `
        SELECT 
          DATE_FORMAT(${campoData}, '%Y-01-01') as data,
          1 as dia,
          1 as mes,
          YEAR(${campoData}) as ano,
          COUNT(*) as total
          ${campoValor}
        FROM oportunidades o
        ${whereClause}
        GROUP BY DATE_FORMAT(${campoData}, '%Y-01-01'), YEAR(${campoData})
        ORDER BY data ASC
      `
    } else {
      // Agrupamento por dia (default)
      query = `
        SELECT 
          DATE(${campoData}) as data,
          DAY(${campoData}) as dia,
          MONTH(${campoData}) as mes,
          YEAR(${campoData}) as ano,
          COUNT(*) as total
          ${campoValor}
        FROM oportunidades o
        ${whereClause}
        GROUP BY DATE(${campoData}), DAY(${campoData}), MONTH(${campoData}), YEAR(${campoData})
        ORDER BY data ASC
      `
    }

    const resultados = await executeQuery(query, queryParams) as any[]

    // Query para agrupar por dia E por vendedor (apenas se all=1)
    let resultadosPorVendedor: any[] = []
    if (allParam) {
      const queryPorVendedor = `
        SELECT 
          DATE(${campoData}) as data,
          DAY(${campoData}) as dia,
          MONTH(${campoData}) as mes,
          YEAR(${campoData}) as ano,
          CAST(o.user AS UNSIGNED) as vendedor_id,
          COALESCE(CONCAT(v.name, ' ', v.lastName), CONCAT(v.name, ''), 'Sem vendedor') as vendedor_nome,
          COUNT(*) as total
          ${campoValor}
        FROM oportunidades o
        LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
        ${whereClause}
        GROUP BY DATE(${campoData}), DAY(${campoData}), MONTH(${campoData}), YEAR(${campoData}), CAST(o.user AS UNSIGNED), v.name, v.lastName
        ORDER BY data ASC, vendedor_nome ASC
      `

      resultadosPorVendedor = await executeQuery(queryPorVendedor, queryParams) as any[]
    }

    // Formatar resposta geral (mantém compatibilidade)
    const dados = resultados
      .map(r => {
        // Formatar data para YYYY-MM-DD (sem hora)
        let dataFormatada: string | null = null
        let diaExtraido = 0
        let mesExtraido = 0
        let anoExtraido = 0
        
        if (r.data) {
          // Se já é uma string no formato YYYY-MM-DD, usar diretamente
          if (typeof r.data === 'string' && r.data.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dataFormatada = r.data
            // Extrair dia, mês e ano da string formatada para evitar problemas de timezone
            const partes = r.data.split('-')
            if (partes.length === 3) {
              anoExtraido = parseInt(partes[0], 10)
              mesExtraido = parseInt(partes[1], 10)
              diaExtraido = parseInt(partes[2], 10)
            }
          } else {
            // Se é Date object, converter para YYYY-MM-DD
            // IMPORTANTE: Usar UTC para evitar problemas de timezone
            const date = new Date(r.data)
            if (!isNaN(date.getTime())) {
              // Usar UTC para evitar deslocamento de timezone
              const year = date.getUTCFullYear()
              const month = String(date.getUTCMonth() + 1).padStart(2, '0')
              const day = String(date.getUTCDate()).padStart(2, '0')
              dataFormatada = `${year}-${month}-${day}`
              anoExtraido = year
              mesExtraido = parseInt(month, 10)
              diaExtraido = parseInt(day, 10)
            }
          }
        }
        
        // Usar valores extraídos da data formatada se disponíveis, senão usar valores do banco
        return {
          data: dataFormatada,
          dia: diaExtraido || Number(r.dia || 0),
          mes: mesExtraido || Number(r.mes || 0),
          ano: anoExtraido || Number(r.ano || 0),
          total: Number(r.total || 0),
          ...(campoValor ? { valor_total: Number(r.valor_total || 0) } : {})
        }
      })
      .filter(item => {
        // Filtrar apenas datas dentro do período especificado (usar datas validadas)
        if (!item.data) return false
        
        // Quando agrupando por granularidade maior que dia, não filtrar por data exata 
        // pois a data pode ser o primeiro dia da semana, mês ou ano
        if (granularidade === 'mes') {
          // Para agrupamento mensal, verificar se o mês/ano está dentro do período
          const itemAnoMes = item.data.substring(0, 7) // YYYY-MM
          const inicioAnoMes = dataInicioValida.substring(0, 7)
          const fimAnoMes = dataFimValida.substring(0, 7)
          return itemAnoMes >= inicioAnoMes && itemAnoMes <= fimAnoMes
        } else if (granularidade === 'ano') {
          // Para agrupamento anual, verificar se o ano está dentro do período
          const itemAno = item.data.substring(0, 4) // YYYY
          const inicioAno = dataInicioValida.substring(0, 4)
          const fimAno = dataFimValida.substring(0, 4)
          return itemAno >= inicioAno && itemAno <= fimAno
        } else if (granularidade === 'semana') {
          // Para agrupamento semanal, ser um pouco mais flexível pois o início da semana 
          // pode estar um pouco antes da data de início selecionada
          const itemDate = new Date(item.data + 'T00:00:00')
          const inicioDate = new Date(dataInicioValida + 'T00:00:00')
          const fimDate = new Date(dataFimValida + 'T23:59:59')
          
          // Se a semana começa antes do início mas termina depois do início, incluir
          const fimSemana = new Date(itemDate.getTime() + 6 * 24 * 60 * 60 * 1000)
          return (itemDate <= fimDate && fimSemana >= inicioDate)
        }
        
        return item.data >= dataInicioValida && item.data <= dataFimValida
      })

    // Formatar resposta por vendedor (apenas se all=1)
    const dadosPorVendedor = allParam ? resultadosPorVendedor
      .map(r => {
        let dataFormatada: string | null = null
        let diaExtraido = 0
        let mesExtraido = 0
        let anoExtraido = 0
        
        if (r.data) {
          if (typeof r.data === 'string' && r.data.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dataFormatada = r.data
            // Extrair dia, mês e ano da string formatada para evitar problemas de timezone
            const partes = r.data.split('-')
            if (partes.length === 3) {
              anoExtraido = parseInt(partes[0], 10)
              mesExtraido = parseInt(partes[1], 10)
              diaExtraido = parseInt(partes[2], 10)
            }
          } else {
            const date = new Date(r.data)
            if (!isNaN(date.getTime())) {
              // Usar UTC para evitar deslocamento de timezone
              const year = date.getUTCFullYear()
              const month = String(date.getUTCMonth() + 1).padStart(2, '0')
              const day = String(date.getUTCDate()).padStart(2, '0')
              dataFormatada = `${year}-${month}-${day}`
              anoExtraido = year
              mesExtraido = parseInt(month, 10)
              diaExtraido = parseInt(day, 10)
            }
          }
        }
        
        // Usar valores extraídos da data formatada se disponíveis, senão usar valores do banco
        return {
          data: dataFormatada,
          dia: diaExtraido || Number(r.dia || 0),
          mes: mesExtraido || Number(r.mes || 0),
          ano: anoExtraido || Number(r.ano || 0),
          vendedor_id: Number(r.vendedor_id || 0),
          vendedor_nome: r.vendedor_nome || 'Sem vendedor',
          total: Number(r.total || 0),
          ...(campoValor ? { valor_total: Number(r.valor_total || 0) } : {})
        }
      })
      .filter(item => {
        // Filtrar apenas datas dentro do período especificado (usar datas validadas)
        if (!item.data) return false
        return item.data >= dataInicioValida && item.data <= dataFimValida
      }) : []

    // Calcular totais
    const totalGeral = dados.reduce((sum, item) => sum + item.total, 0)
    const valorTotalGeral = dados.reduce((sum, item) => sum + (item.valor_total || 0), 0)

    return NextResponse.json({
      success: true,
      tipo,
      periodo: {
        data_inicio: dataInicioValida,
        data_fim: dataFimValida,
        ...(dataInicioValida !== dataInicio || dataFimValida !== dataFim ? {
          data_inicio_original: dataInicio,
          data_fim_original: dataFim,
          data_corrigida: true
        } : {})
      },
      total_geral: totalGeral,
      ...(campoValor ? { valor_total_geral: valorTotalGeral } : {}),
      agrupamento: granularidade,
      dados, // Agrupamento geral por dia ou mês
      ...(allParam ? { dados_por_vendedor: dadosPorVendedor } : {}), // Agrupamento por dia e vendedor (apenas se all=1)
      _debug: {
        resultados_brutos: resultados.length,
        dados_filtrados: dados.length,
        where_clause: whereClause,
        query_params_count: queryParams.length
      },
      ...(Object.keys(queryParams).length > 0 ? {
        filtros: {
          ...(unidadeIdParam ? { unidade_id: unidadeIdParam } : {}),
          ...(userIdParam ? { user_id: userIdParam } : {}),
          ...(funilIdParam ? { funil_id: funilIdParam } : {})
        }
      } : {})
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar oportunidades diárias',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

