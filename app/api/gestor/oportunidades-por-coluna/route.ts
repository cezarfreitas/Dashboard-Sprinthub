import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Parsear vendedores da unidade
function parseJSON(value: any): any[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

// GET - Buscar oportunidades abertas da unidade agrupadas por coluna do funil
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadeId = searchParams.get('unidade_id')
    const funilId = searchParams.get('funil_id') || '4' // Default: funil de vendas
    const vendedorId = searchParams.get('vendedor_id') // Opcional: filtrar por vendedor específico

    if (!unidadeId) {
      return NextResponse.json(
        { success: false, message: 'unidade_id é obrigatório' },
        { status: 400 }
      )
    }

    const unidadeIdInt = parseInt(unidadeId)

    // Buscar unidade e seus vendedores
    const unidade = await executeQuery(`
      SELECT 
        u.id, 
        COALESCE(u.nome, u.name) as nome, 
        u.users
      FROM unidades u
      WHERE u.id = ? AND u.ativo = 1
    `, [unidadeIdInt]) as any[]

    if (!unidade || unidade.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const parsedUsers = parseJSON(unidade[0].users)
    const userIds = parsedUsers
      .map((u: any) => typeof u === 'object' ? u.id : u)
      .filter((id: any) => typeof id === 'number')

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Se vendedor_id foi fornecido, filtrar apenas esse vendedor (verificando se ele pertence à unidade)
    let vendedoresIds: number[] = []
    
    if (vendedorId) {
      const vendedorIdInt = parseInt(vendedorId)
      // Verificar se o vendedor pertence à unidade
      if (userIds.includes(vendedorIdInt)) {
        vendedoresIds = [vendedorIdInt]
      } else {
        return NextResponse.json({
          success: true,
          data: []
        })
      }
    } else {
      // Buscar vendedores ativos (opcional: pode remover para incluir todos)
      const todosVendedores = await executeQuery(`
        SELECT id FROM vendedores WHERE ativo = 1
      `) as any[]
      const vendedoresAtivosSet = new Set(todosVendedores.map(v => v.id))
      vendedoresIds = userIds.filter((id: number) => vendedoresAtivosSet.has(id))
    }

    if (vendedoresIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Construir query com filtro por vendedores - Oportunidades Abertas
    const placeholders = vendedoresIds.map(() => '?').join(',')
    const queryAbertas = `
      SELECT
        o.coluna_funil_id,
        cf.nome_coluna,
        cf.sequencia,
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total,
        SUM(CASE WHEN o.value > 0 THEN 1 ELSE 0 END) as total_com_valor,
        COALESCE(SUM(CASE WHEN o.value > 0 THEN o.value ELSE 0 END), 0) as valor_total_com_valor,
        SUM(CASE WHEN DATEDIFF(NOW(), o.createDate) > 10 THEN 1 ELSE 0 END) as total_abertas_10_dias,
        SUM(CASE WHEN DATEDIFF(NOW(), o.createDate) > 30 THEN 1 ELSE 0 END) as total_abertas_30_dias
      FROM oportunidades o
      INNER JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      WHERE o.status = 'open'
        AND o.archived = 0
        AND o.user IN (${placeholders})
        AND cf.id_funil = ?
        AND o.coluna_funil_id IS NOT NULL
      GROUP BY o.coluna_funil_id, cf.nome_coluna, cf.sequencia
      ORDER BY cf.sequencia ASC
    `

    // Query para oportunidades perdidas no mês atual
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()

    const queryPerdidas = `
      SELECT
        o.coluna_funil_id,
        cf.nome_coluna,
        cf.sequencia,
        COUNT(*) as total_perdidas_mes,
        COALESCE(SUM(o.value), 0) as valor_perdidas_mes
      FROM oportunidades o
      INNER JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      WHERE o.status IN ('lost', 'loss', 'perdido')
        AND o.archived = 0
        AND o.lost_date IS NOT NULL
        AND MONTH(o.lost_date) = ?
        AND YEAR(o.lost_date) = ?
        AND o.user IN (${placeholders})
        AND cf.id_funil = ?
        AND o.coluna_funil_id IS NOT NULL
      GROUP BY o.coluna_funil_id, cf.nome_coluna, cf.sequencia
      ORDER BY cf.sequencia ASC
    `

    // Query para oportunidades ganhas no mês atual
    const queryGanhas = `
      SELECT
        o.coluna_funil_id,
        cf.nome_coluna,
        cf.sequencia,
        COUNT(*) as total_ganhas_mes,
        COALESCE(SUM(o.value), 0) as valor_ganhas_mes
      FROM oportunidades o
      INNER JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      WHERE o.status IN ('gain', 'won', 'ganho')
        AND o.archived = 0
        AND o.gain_date IS NOT NULL
        AND MONTH(o.gain_date) = ?
        AND YEAR(o.gain_date) = ?
        AND o.user IN (${placeholders})
        AND cf.id_funil = ?
        AND o.coluna_funil_id IS NOT NULL
      GROUP BY o.coluna_funil_id, cf.nome_coluna, cf.sequencia
      ORDER BY cf.sequencia ASC
    `

    // Executar todas as queries
    const [resultadosAbertas, resultadosPerdidas, resultadosGanhas] = await Promise.all([
      executeQuery(queryAbertas, [...vendedoresIds, funilId]) as Promise<Array<{
        coluna_funil_id: number
        nome_coluna: string
        sequencia: number
        total: number
        valor_total: number
        total_com_valor: number
        valor_total_com_valor: number
        total_abertas_10_dias: number
        total_abertas_30_dias: number
      }>>,
      executeQuery(queryPerdidas, [mesAtual, anoAtual, ...vendedoresIds, funilId]) as Promise<Array<{
        coluna_funil_id: number
        nome_coluna: string
        sequencia: number
        total_perdidas_mes: number
        valor_perdidas_mes: number
      }>>,
      executeQuery(queryGanhas, [mesAtual, anoAtual, ...vendedoresIds, funilId]) as Promise<Array<{
        coluna_funil_id: number
        nome_coluna: string
        sequencia: number
        total_ganhas_mes: number
        valor_ganhas_mes: number
      }>>
    ])

    // Combinar resultados: criar mapas de perdidas e ganhas e adicionar aos resultados de abertas
    const perdidasMap = new Map<number, { total_perdidas_mes: number; valor_perdidas_mes: number }>()
    resultadosPerdidas.forEach((item) => {
      perdidasMap.set(item.coluna_funil_id, {
        total_perdidas_mes: Number(item.total_perdidas_mes) || 0,
        valor_perdidas_mes: Number(item.valor_perdidas_mes) || 0
      })
    })

    const ganhasMap = new Map<number, { total_ganhas_mes: number; valor_ganhas_mes: number }>()
    resultadosGanhas.forEach((item) => {
      ganhasMap.set(item.coluna_funil_id, {
        total_ganhas_mes: Number(item.total_ganhas_mes) || 0,
        valor_ganhas_mes: Number(item.valor_ganhas_mes) || 0
      })
    })

    // Combinar dados
    const resultados = resultadosAbertas.map((item) => {
      const perdidas = perdidasMap.get(item.coluna_funil_id)
      const ganhas = ganhasMap.get(item.coluna_funil_id)
      return {
        ...item,
        total_perdidas_mes: perdidas?.total_perdidas_mes || 0,
        valor_perdidas_mes: perdidas?.valor_perdidas_mes || 0,
        total_ganhas_mes: ganhas?.total_ganhas_mes || 0,
        valor_ganhas_mes: ganhas?.valor_ganhas_mes || 0
      }
    })

    return NextResponse.json({
      success: true,
      data: resultados
    })

  } catch (error) {
    console.error('❌ Erro ao buscar oportunidades por coluna (gestor):', error)
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
