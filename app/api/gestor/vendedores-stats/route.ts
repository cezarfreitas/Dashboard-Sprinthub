import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * API consolidada para buscar estatísticas de todos os vendedores de uma unidade
 * Substitui múltiplas chamadas individuais (N+1 query problem)
 * 
 * GET /api/gestor/vendedores-stats?unidade_id=X&data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const unidadeId = searchParams.get('unidade_id')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const funilId = searchParams.get('funil_id')

    if (!unidadeId || !dataInicio || !dataFim) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros obrigatórios: unidade_id, data_inicio, data_fim' },
        { status: 400 }
      )
    }

    // 1. Buscar vendedores da unidade
    const unidadeResult = await executeQuery(
      `SELECT users FROM unidades WHERE id = ? AND ativo = 1`,
      [parseInt(unidadeId)]
    ) as any[]

    if (!unidadeResult || unidadeResult.length === 0) {
      return NextResponse.json({
        success: true,
        vendedores: []
      })
    }

    // Parse users JSON
    let vendedorIds: number[] = []
    try {
      const users = unidadeResult[0].users
      const parsedUsers = typeof users === 'string' ? JSON.parse(users) : users
      if (Array.isArray(parsedUsers)) {
        vendedorIds = parsedUsers
          .map((u: any) => {
            if (typeof u === 'object' && u !== null) return u.id || u.user_id || u.vendedor_id
            if (typeof u === 'number') return u
            if (typeof u === 'string') {
              const parsed = parseInt(u.trim())
              return !isNaN(parsed) ? parsed : null
            }
            return null
          })
          .filter((id: any): id is number => id !== null && !isNaN(id))
      }
    } catch {
      return NextResponse.json({
        success: true,
        vendedores: []
      })
    }

    if (vendedorIds.length === 0) {
      return NextResponse.json({
        success: true,
        vendedores: []
      })
    }

    const placeholders = vendedorIds.map(() => '?').join(',')

    // Filtro de funil opcional
    let funilFilter = ''
    const funilParams: number[] = []
    if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
      const funilIds = funilId.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      if (funilIds.length > 0) {
        funilFilter = `AND EXISTS (
          SELECT 1 FROM colunas_funil cf 
          WHERE cf.id = o.coluna_funil_id 
          AND cf.id_funil IN (${funilIds.map(() => '?').join(',')})
        )`
        funilParams.push(...funilIds)
      }
    }

    // 2. Query consolidada: buscar todas as estatísticas de todos os vendedores em UMA query
    // Usando subqueries para cada métrica
    const statsQuery = `
      SELECT 
        v.id as vendedor_id,
        CONCAT(v.name, ' ', COALESCE(v.lastName, '')) as vendedor_nome,
        
        -- Vendas ganhas no período (por gain_date)
        COALESCE((
          SELECT COUNT(*) FROM oportunidades o
          WHERE CAST(o.user AS UNSIGNED) = v.id
            AND o.status = 'gain'
            AND o.gain_date >= ? AND o.gain_date <= ?
            AND o.archived = 0
            ${funilFilter}
        ), 0) as quantidade_vendas,
        
        COALESCE((
          SELECT SUM(o.value) FROM oportunidades o
          WHERE CAST(o.user AS UNSIGNED) = v.id
            AND o.status = 'gain'
            AND o.gain_date >= ? AND o.gain_date <= ?
            AND o.archived = 0
            ${funilFilter}
        ), 0) as realizado,
        
        -- Oportunidades criadas no período
        COALESCE((
          SELECT COUNT(*) FROM oportunidades o
          WHERE CAST(o.user AS UNSIGNED) = v.id
            AND o.createDate >= ? AND o.createDate <= ?
            AND o.archived = 0
            ${funilFilter}
        ), 0) as quantidade_oportunidades,
        
        -- Vendas criadas no período (independente de quando ganhas)
        COALESCE((
          SELECT COUNT(*) FROM oportunidades o
          WHERE CAST(o.user AS UNSIGNED) = v.id
            AND o.status = 'gain'
            AND o.createDate >= ? AND o.createDate <= ?
            AND o.archived = 0
            ${funilFilter}
        ), 0) as quantidade_vendas_criadas_no_mes,
        
        -- Oportunidades abertas (todas)
        COALESCE((
          SELECT COUNT(*) FROM oportunidades o
          WHERE CAST(o.user AS UNSIGNED) = v.id
            AND o.status = 'open'
            AND o.archived = 0
            ${funilFilter}
        ), 0) as quantidade_abertas,
        
        -- Oportunidades perdidas no período (por lost_date)
        COALESCE((
          SELECT COUNT(*) FROM oportunidades o
          WHERE CAST(o.user AS UNSIGNED) = v.id
            AND o.status = 'lost'
            AND o.lost_date >= ? AND o.lost_date <= ?
            AND o.archived = 0
            ${funilFilter}
        ), 0) as quantidade_perdidas
        
      FROM vendedores v
      WHERE v.id IN (${placeholders})
      ORDER BY v.name
    `

    const dataInicioFull = dataInicio + ' 00:00:00'
    const dataFimFull = dataFim + ' 23:59:59'

    // Construir parâmetros na ordem correta (repetidos para cada subquery)
    const queryParams = [
      // quantidade_vendas (gain_date)
      dataInicioFull, dataFimFull, ...funilParams,
      // realizado (gain_date)
      dataInicioFull, dataFimFull, ...funilParams,
      // quantidade_oportunidades (createDate)
      dataInicioFull, dataFimFull, ...funilParams,
      // quantidade_vendas_criadas_no_mes (createDate)
      dataInicioFull, dataFimFull, ...funilParams,
      // quantidade_abertas (sem filtro de data)
      ...funilParams,
      // quantidade_perdidas (lost_date)
      dataInicioFull, dataFimFull, ...funilParams,
      // WHERE vendedor IN
      ...vendedorIds
    ]

    const statsResults = await executeQuery(statsQuery, queryParams) as any[]

    // 3. Buscar metas dos vendedores - usar mês/ano do período selecionado
    const [anoMeta, mesMeta] = dataInicio.split('-').map(Number)

    const metasQuery = `
      SELECT vendedor_id, meta_valor
      FROM metas_mensais
      WHERE unidade_id = ? AND mes = ? AND ano = ?
        AND vendedor_id IN (${placeholders})
    `
    const metasResults = await executeQuery(metasQuery, [
      parseInt(unidadeId), mesMeta, anoMeta, ...vendedorIds
    ]) as any[]

    const metasMap = new Map<number, number>()
    metasResults.forEach((m: any) => {
      metasMap.set(m.vendedor_id, Number(m.meta_valor) || 0)
    })

    // 4. Combinar resultados
    const vendedores = statsResults.map((stat: any) => {
      const metaValor = metasMap.get(stat.vendedor_id) || 0
      const realizado = Number(stat.realizado) || 0
      const quantidadeOportunidades = Number(stat.quantidade_oportunidades) || 0
      const quantidadeVendas = Number(stat.quantidade_vendas) || 0

      return {
        vendedor_id: stat.vendedor_id,
        vendedor_nome: stat.vendedor_nome?.trim() || `Vendedor ${stat.vendedor_id}`,
        meta_valor: metaValor,
        realizado,
        diferenca: realizado - metaValor,
        percentual: metaValor > 0 ? (realizado / metaValor) * 100 : 0,
        quantidade_vendas: quantidadeVendas,
        quantidade_oportunidades: quantidadeOportunidades,
        quantidade_abertas: Number(stat.quantidade_abertas) || 0,
        quantidade_perdidas: Number(stat.quantidade_perdidas) || 0,
        quantidade_vendas_criadas_no_mes: Number(stat.quantidade_vendas_criadas_no_mes) || 0,
        taxa_conversao: quantidadeOportunidades > 0 ? (quantidadeVendas / quantidadeOportunidades) * 100 : 0
      }
    })

    // Ordenar: primeiro por percentual (vendedores com meta), depois por realizado (sem meta)
    vendedores.sort((a, b) => {
      if (a.meta_valor > 0 && b.meta_valor > 0) {
        return b.percentual - a.percentual
      }
      if (a.meta_valor > 0) return -1
      if (b.meta_valor > 0) return 1
      return b.realizado - a.realizado
    })

    return NextResponse.json({
      success: true,
      vendedores,
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      meta: { mes: mesMeta, ano: anoMeta }
    })

  } catch (error) {
    console.error('Erro em /api/gestor/vendedores-stats:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar estatísticas dos vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
