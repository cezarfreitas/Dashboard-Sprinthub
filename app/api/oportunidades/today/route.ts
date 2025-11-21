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

// Função para construir filtro de grupo (retorna array de user IDs de vendedores ativos)
async function buildGrupoFilter(grupoIdParam: string | null): Promise<number[]> {
  if (!grupoIdParam || grupoIdParam === 'todos' || grupoIdParam === 'undefined') return []

  const grupoIds = grupoIdParam
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id) && id > 0)

  if (grupoIds.length === 0) return []

  const placeholders = grupoIds.map(() => '?').join(',')
  const unidades = await executeQuery(
    `SELECT id, users FROM unidades WHERE grupo_id IN (${placeholders}) AND ativo = 1`,
    grupoIds
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parâmetros de filtro
    const unidadeIdParam = searchParams.get('unidade_id')
    const funilIdParam = searchParams.get('funil_id')
    const grupoIdParam = searchParams.get('grupo_id')

    // Datas: hoje e ontem
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const hojeStr = hoje.toISOString().split('T')[0]

    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)
    const ontemStr = ontem.toISOString().split('T')[0]

    // Construir filtros de vendedores
    let userIds: number[] = []
    
    // Filtro de unidade
    if (unidadeIdParam) {
      const unidadeUserIds = await buildUnidadeFilter(unidadeIdParam)
      if (unidadeUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            hoje: {
              criadas: { total: 0, valor_total: 0 },
              ganhas: { total: 0, valor_total: 0 }
            },
            ontem: {
              criadas: { total: 0, valor_total: 0 },
              ganhas: { total: 0, valor_total: 0 }
            },
            diferenca_percentual: {
              criadas: 0,
              ganhas: 0
            }
          }
        })
      }
      userIds.push(...unidadeUserIds)
    }

    // Filtro de grupo
    if (grupoIdParam) {
      const grupoUserIds = await buildGrupoFilter(grupoIdParam)
      if (grupoUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            hoje: {
              criadas: { total: 0, valor_total: 0 },
              ganhas: { total: 0, valor_total: 0 }
            },
            ontem: {
              criadas: { total: 0, valor_total: 0 },
              ganhas: { total: 0, valor_total: 0 }
            },
            diferenca_percentual: {
              criadas: { total: 0, valor: 0 },
              ganhas: { total: 0, valor: 0 }
            }
          }
        })
      }
      
      // Se já tem filtro de unidade, fazer interseção
      if (userIds.length > 0) {
        userIds = userIds.filter(id => grupoUserIds.includes(id))
      } else {
        userIds = grupoUserIds
      }
    }

    // Remover duplicatas
    userIds = Array.from(new Set(userIds))

    // Construir WHERE clauses base
    const whereClauses: string[] = ['o.archived = 0']
    const queryParams: any[] = []

    // Filtro de vendedores
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

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // Query para oportunidades CRIADAS HOJE
    const queryCriadasHoje = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      ${whereClause}
        AND DATE(o.createDate) = ?
    `
    const paramsCriadasHoje = [...queryParams, hojeStr]

    // Query para oportunidades GANHAS HOJE
    const queryGanhasHoje = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      ${whereClause}
        AND DATE(o.gain_date) = ?
        AND o.gain_date IS NOT NULL
    `
    const paramsGanhasHoje = [...queryParams, hojeStr]

    // Query para oportunidades CRIADAS ONTEM
    const queryCriadasOntem = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      ${whereClause}
        AND DATE(o.createDate) = ?
    `
    const paramsCriadasOntem = [...queryParams, ontemStr]

    // Query para oportunidades GANHAS ONTEM
    const queryGanhasOntem = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      ${whereClause}
        AND DATE(o.gain_date) = ?
        AND o.gain_date IS NOT NULL
    `
    const paramsGanhasOntem = [...queryParams, ontemStr]

    // Executar todas as queries em paralelo
    const [criadasHoje, ganhasHoje, criadasOntem, ganhasOntem] = await Promise.all([
      executeQuery(queryCriadasHoje, paramsCriadasHoje) as Promise<any[]>,
      executeQuery(queryGanhasHoje, paramsGanhasHoje) as Promise<any[]>,
      executeQuery(queryCriadasOntem, paramsCriadasOntem) as Promise<any[]>,
      executeQuery(queryGanhasOntem, paramsGanhasOntem) as Promise<any[]>
    ])

    // Extrair resultados
    const criadasHojeTotal = Number(criadasHoje[0]?.total || 0)
    const criadasHojeValor = Number(criadasHoje[0]?.valor_total || 0)
    
    const ganhasHojeTotal = Number(ganhasHoje[0]?.total || 0)
    const ganhasHojeValor = Number(ganhasHoje[0]?.valor_total || 0)
    
    const criadasOntemTotal = Number(criadasOntem[0]?.total || 0)
    const criadasOntemValor = Number(criadasOntem[0]?.valor_total || 0)
    
    const ganhasOntemTotal = Number(ganhasOntem[0]?.total || 0)
    const ganhasOntemValor = Number(ganhasOntem[0]?.valor_total || 0)

    // Calcular diferença percentual
    const diferencaPercentualCriadas = criadasOntemTotal > 0
      ? Number((((criadasHojeTotal - criadasOntemTotal) / criadasOntemTotal) * 100).toFixed(2))
      : (criadasHojeTotal > 0 ? 100 : 0)

    const diferencaPercentualGanhas = ganhasOntemTotal > 0
      ? Number((((ganhasHojeTotal - ganhasOntemTotal) / ganhasOntemTotal) * 100).toFixed(2))
      : (ganhasHojeTotal > 0 ? 100 : 0)

    const diferencaPercentualValorCriadas = criadasOntemValor > 0
      ? Number((((criadasHojeValor - criadasOntemValor) / criadasOntemValor) * 100).toFixed(2))
      : (criadasHojeValor > 0 ? 100 : 0)

    const diferencaPercentualValorGanhas = ganhasOntemValor > 0
      ? Number((((ganhasHojeValor - ganhasOntemValor) / ganhasOntemValor) * 100).toFixed(2))
      : (ganhasHojeValor > 0 ? 100 : 0)

    return NextResponse.json({
      success: true,
      data: {
        hoje: {
          criadas: {
            total: criadasHojeTotal,
            valor_total: criadasHojeValor
          },
          ganhas: {
            total: ganhasHojeTotal,
            valor_total: ganhasHojeValor
          }
        },
        ontem: {
          criadas: {
            total: criadasOntemTotal,
            valor_total: criadasOntemValor
          },
          ganhas: {
            total: ganhasOntemTotal,
            valor_total: ganhasOntemValor
          }
        },
        diferenca_percentual: {
          criadas: {
            total: diferencaPercentualCriadas,
            valor: diferencaPercentualValorCriadas
          },
          ganhas: {
            total: diferencaPercentualGanhas,
            valor: diferencaPercentualValorGanhas
          }
        },
        datas: {
          hoje: hojeStr,
          ontem: ontemStr
        }
      }
    })

  } catch (error) {
    console.error('Erro ao buscar dados de hoje:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar dados de hoje',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

