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

// Função para construir filtro de unidades (retorna array de user IDs de vendedores ativos)
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

  const todosVendedoresAtivos = await executeQuery(
    'SELECT id FROM vendedores WHERE ativo = 1'
  ) as any[]
  const vendedoresAtivosSet = new Set(todosVendedoresAtivos.map(v => v.id))

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
        if (vendedoresAtivosSet.has(userId)) {
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

    // Validar formato das datas
    const dataInicioDate = new Date(dataInicio + 'T00:00:00')
    const dataFimDate = new Date(dataFim + 'T23:59:59')
    
    if (isNaN(dataInicioDate.getTime()) || isNaN(dataFimDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: 'Formato de data inválido. Use YYYY-MM-DD'
        },
        { status: 400 }
      )
    }

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
        condicaoStatus = 'AND o.gain_date IS NOT NULL'
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

    // Filtro de data
    whereClauses.push(`${campoData} >= ?`)
    queryParams.push(dataInicio + ' 00:00:00')
    whereClauses.push(`${campoData} <= ?`)
    queryParams.push(dataFim + ' 23:59:59')

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

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')} ${condicaoStatus}` : `WHERE ${condicaoStatus.trim()}`

    // Campos adicionais baseado no tipo
    const campoValor = tipo === 'ganhas' || tipo === 'perdidas' ? ', COALESCE(SUM(o.value), 0) as valor_total' : ''

    // Query para agrupar por dia
    const query = `
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

    const resultados = await executeQuery(query, queryParams) as any[]

    // Formatar resposta
    const dados = resultados.map(r => {
      // Formatar data para YYYY-MM-DD (sem hora)
      let dataFormatada: string | null = null
      if (r.data) {
        // Se já é uma string no formato YYYY-MM-DD, usar diretamente
        if (typeof r.data === 'string' && r.data.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dataFormatada = r.data
        } else {
          // Se é Date object, converter para YYYY-MM-DD
          const date = new Date(r.data)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            dataFormatada = `${year}-${month}-${day}`
          }
        }
      }
      
      return {
        data: dataFormatada,
        dia: Number(r.dia || 0),
        mes: Number(r.mes || 0),
        ano: Number(r.ano || 0),
        total: Number(r.total || 0),
        ...(campoValor ? { valor_total: Number(r.valor_total || 0) } : {})
      }
    })

    // Calcular totais
    const totalGeral = dados.reduce((sum, item) => sum + item.total, 0)
    const valorTotalGeral = dados.reduce((sum, item) => sum + (item.valor_total || 0), 0)

    return NextResponse.json({
      success: true,
      tipo,
      periodo: {
        data_inicio: dataInicio,
        data_fim: dataFim
      },
      total_geral: totalGeral,
      ...(campoValor ? { valor_total_geral: valorTotalGeral } : {}),
      dados,
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

