import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

function parseJSON(value: any): any[] {
  if (Array.isArray(value)) return value
  let strValue = value
  if (value && typeof value === 'object' && value.toString) strValue = value.toString()
  if (typeof strValue === 'string') {
    try {
      const parsed = JSON.parse(strValue)
      if (Array.isArray(parsed)) return parsed
      if (typeof parsed === 'object') return [parsed]
      return []
    } catch {
      if (strValue.includes(',')) return strValue.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      const num = parseInt(strValue.trim())
      return !isNaN(num) ? [num] : []
    }
  }
  if (typeof strValue === 'number') return [strValue]
  return []
}

async function getVendedorIdsByUnidades(unidadeIds: number[]): Promise<number[]> {
  if (unidadeIds.length === 0) return []
  const placeholders = unidadeIds.map(() => '?').join(',')
  const unidades = await executeQuery(
    `SELECT id, users FROM unidades WHERE id IN (${placeholders}) AND ativo = 1`, unidadeIds
  ) as any[]
  if (!unidades || unidades.length === 0) return []
  const todosVendedores = await executeQuery('SELECT id FROM vendedores') as any[]
  const vendedoresSet = new Set(todosVendedores.map(v => v.id))
  const ids = new Set<number>()
  unidades.forEach(unidade => {
    if (!unidade.users) return
    parseJSON(unidade.users).forEach((u: any) => {
      let id: any = null
      if (typeof u === 'object' && u !== null) id = u.id || u.user_id || u.vendedor_id
      else if (typeof u === 'number') id = u
      else if (typeof u === 'string') { const p = parseInt(u.trim()); if (!isNaN(p)) id = p }
      if (id != null && !isNaN(Number(id)) && vendedoresSet.has(Number(id))) ids.add(Number(id))
    })
  })
  return Array.from(ids)
}

function buildVendedorFilter(vendedorIds: number[]): string {
  if (vendedorIds.length === 0) return ''
  return `AND CAST(o.user AS UNSIGNED) IN (${vendedorIds.map(() => '?').join(',')})`
}

function buildFunilFilter(funilIds: number[]): string {
  if (funilIds.length === 0) return ''
  return `AND EXISTS (SELECT 1 FROM colunas_funil cf WHERE cf.id = o.coluna_funil_id AND cf.id_funil IN (${funilIds.map(() => '?').join(',')}))`
}

type Agrupamento = 'dia' | 'semana' | 'vendedor' | 'unidade'

interface SubItem {
  chave: string; label: string; novas_oportunidades: number; processadas_total: number
  ganhas: { qtd: number; taxa: number; lead_time: number | null; valor: number; ticket_medio: number }
  perdidas: { qtd: number; taxa: number; lead_time: number | null; valor: number; ticket_medio: number }
}

function buildLinhaFromMaps(
  key: string, label: string,
  novasMap: Map<string, number>,
  ganhasMap: Map<string, { total: number; valor: number; leadTime: number | null }>,
  perdidasMap: Map<string, { total: number; valor: number; leadTime: number | null }>
) {
  const novas = novasMap.get(key) || 0
  const g = ganhasMap.get(key) || { total: 0, valor: 0, leadTime: null }
  const p = perdidasMap.get(key) || { total: 0, valor: 0, leadTime: null }
  const proc = g.total + p.total
  const taxaG = proc > 0 ? (g.total / proc) * 100 : 0
  const taxaP = proc > 0 ? (p.total / proc) * 100 : 0
  const tmG = g.total > 0 ? g.valor / g.total : 0
  const tmP = p.total > 0 ? p.valor / p.total : 0
  return {
    chave: key, label, novas_oportunidades: novas, processadas_total: proc,
    ganhas: { qtd: g.total, taxa: Math.round(taxaG * 100) / 100, lead_time: g.leadTime, valor: g.valor, ticket_medio: Math.round(tmG * 100) / 100 },
    perdidas: { qtd: p.total, taxa: Math.round(taxaP * 100) / 100, lead_time: p.leadTime, valor: p.valor, ticket_medio: Math.round(tmP * 100) / 100 }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const unidadeIdParam = searchParams.get('unidade_id')
    const funilIdParam = searchParams.get('funil_id')
    const agrupamento = (searchParams.get('agrupamento') || 'dia') as Agrupamento

    if (!dataInicio || !dataFim) {
      return NextResponse.json({ success: false, message: 'data_inicio e data_fim são obrigatórios' }, { status: 400 })
    }

    let vendedorIds: number[] = []
    if (unidadeIdParam) {
      const uIds = unidadeIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      vendedorIds = await getVendedorIdsByUnidades(uIds)
    }

    let funilIds: number[] = []
    if (funilIdParam) {
      funilIds = funilIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
    }

    const vFilter = buildVendedorFilter(vendedorIds)
    const fFilter = buildFunilFilter(funilIds)
    const extraParams = [...vendedorIds, ...funilIds]

    if (agrupamento === 'vendedor' || agrupamento === 'unidade') {
      const isUnidade = agrupamento === 'unidade'

      const joinVendedor = 'LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id'
      const joinUnidade = isUnidade
        ? `${joinVendedor}\n           LEFT JOIN unidades uni ON JSON_CONTAINS(uni.users, CAST(v.id AS JSON), '$') AND uni.ativo = 1`
        : joinVendedor

      const selectKey = isUnidade
        ? `uni.id as chave, COALESCE(uni.nome, uni.name, 'Sem unidade') as label`
        : `CAST(o.user AS UNSIGNED) as chave, COALESCE(CONCAT(v.name, ' ', v.lastName), v.name, 'Sem vendedor') as label`
      const groupByKey = isUnidade ? 'uni.id, uni.nome, uni.name' : 'CAST(o.user AS UNSIGNED), v.name, v.lastName'

      // Totais por entidade
      const [novasRows, ganhasRows, perdidasRows] = await Promise.all([
        executeQuery(
          `SELECT ${selectKey}, COUNT(*) as total
           FROM oportunidades o ${joinUnidade}
           WHERE o.archived = 0 AND o.createDate >= ? AND o.createDate <= ? ${vFilter} ${fFilter}
           GROUP BY ${groupByKey} ORDER BY label ASC`,
          [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
        ) as Promise<any[]>,
        executeQuery(
          `SELECT ${selectKey}, COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total,
                  AVG(DATEDIFF(o.gain_date, o.createDate)) as lead_time_avg
           FROM oportunidades o ${joinUnidade}
           WHERE o.archived = 0 AND o.gain_date IS NOT NULL AND o.gain_date >= ? AND o.gain_date <= ? ${vFilter} ${fFilter}
           GROUP BY ${groupByKey} ORDER BY label ASC`,
          [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
        ) as Promise<any[]>,
        executeQuery(
          `SELECT ${selectKey}, COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total,
                  AVG(DATEDIFF(o.lost_date, o.createDate)) as lead_time_avg
           FROM oportunidades o ${joinUnidade}
           WHERE o.archived = 0 AND o.lost_date IS NOT NULL AND o.lost_date >= ? AND o.lost_date <= ? ${vFilter} ${fFilter}
           GROUP BY ${groupByKey} ORDER BY label ASC`,
          [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
        ) as Promise<any[]>
      ])

      // Sub-itens: por dia + entidade
      const [novasSubRows, ganhasSubRows, perdidasSubRows] = await Promise.all([
        executeQuery(
          `SELECT ${selectKey}, DATE(o.createDate) as dia, COUNT(*) as total
           FROM oportunidades o ${joinUnidade}
           WHERE o.archived = 0 AND o.createDate >= ? AND o.createDate <= ? ${vFilter} ${fFilter}
           GROUP BY ${groupByKey}, DATE(o.createDate) ORDER BY label ASC, dia ASC`,
          [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
        ) as Promise<any[]>,
        executeQuery(
          `SELECT ${selectKey}, DATE(o.gain_date) as dia, COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total,
                  AVG(DATEDIFF(o.gain_date, o.createDate)) as lead_time_avg
           FROM oportunidades o ${joinUnidade}
           WHERE o.archived = 0 AND o.gain_date IS NOT NULL AND o.gain_date >= ? AND o.gain_date <= ? ${vFilter} ${fFilter}
           GROUP BY ${groupByKey}, DATE(o.gain_date) ORDER BY label ASC, dia ASC`,
          [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
        ) as Promise<any[]>,
        executeQuery(
          `SELECT ${selectKey}, DATE(o.lost_date) as dia, COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total,
                  AVG(DATEDIFF(o.lost_date, o.createDate)) as lead_time_avg
           FROM oportunidades o ${joinUnidade}
           WHERE o.archived = 0 AND o.lost_date IS NOT NULL AND o.lost_date >= ? AND o.lost_date <= ? ${vFilter} ${fFilter}
           GROUP BY ${groupByKey}, DATE(o.lost_date) ORDER BY label ASC, dia ASC`,
          [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
        ) as Promise<any[]>
      ])

      const fmtDk = (v: any): string => v instanceof Date ? v.toISOString().split('T')[0] : String(v).substring(0, 10)

      // Montar sub-itens por chave da entidade
      const subNovasMap = new Map<string, Map<string, number>>()
      const subGanhasMap = new Map<string, Map<string, { total: number; valor: number; leadTime: number | null }>>()
      const subPerdidasMap = new Map<string, Map<string, { total: number; valor: number; leadTime: number | null }>>()

      for (const r of novasSubRows) {
        const k = String(r.chave ?? 'null'); const d = fmtDk(r.dia)
        if (!subNovasMap.has(k)) subNovasMap.set(k, new Map())
        subNovasMap.get(k)!.set(d, Number(r.total || 0))
      }
      for (const r of ganhasSubRows) {
        const k = String(r.chave ?? 'null'); const d = fmtDk(r.dia)
        if (!subGanhasMap.has(k)) subGanhasMap.set(k, new Map())
        subGanhasMap.get(k)!.set(d, { total: Number(r.total || 0), valor: Number(r.valor_total || 0), leadTime: r.lead_time_avg != null ? Math.round(Number(r.lead_time_avg) * 10) / 10 : null })
      }
      for (const r of perdidasSubRows) {
        const k = String(r.chave ?? 'null'); const d = fmtDk(r.dia)
        if (!subPerdidasMap.has(k)) subPerdidasMap.set(k, new Map())
        subPerdidasMap.get(k)!.set(d, { total: Number(r.total || 0), valor: Number(r.valor_total || 0), leadTime: r.lead_time_avg != null ? Math.round(Number(r.lead_time_avg) * 10) / 10 : null })
      }

      // Montar totais por entidade
      const allKeys = new Map<string, string>()
      const novasMap = new Map<string, number>()
      const ganhasMap = new Map<string, { total: number; valor: number; leadTime: number | null }>()
      const perdidasMap = new Map<string, { total: number; valor: number; leadTime: number | null }>()

      for (const r of novasRows) { const k = String(r.chave ?? 'null'); allKeys.set(k, r.label || k); novasMap.set(k, Number(r.total || 0)) }
      for (const r of ganhasRows) { const k = String(r.chave ?? 'null'); allKeys.set(k, r.label || k); ganhasMap.set(k, { total: Number(r.total || 0), valor: Number(r.valor_total || 0), leadTime: r.lead_time_avg != null ? Math.round(Number(r.lead_time_avg) * 10) / 10 : null }) }
      for (const r of perdidasRows) { const k = String(r.chave ?? 'null'); allKeys.set(k, r.label || k); perdidasMap.set(k, { total: Number(r.total || 0), valor: Number(r.valor_total || 0), leadTime: r.lead_time_avg != null ? Math.round(Number(r.lead_time_avg) * 10) / 10 : null }) }

      // Gerar lista de dias para preencher sub-itens
      const inicio = new Date(dataInicio + 'T00:00:00')
      const fim = new Date(dataFim + 'T00:00:00')
      const todosDias: string[] = []
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        todosDias.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      }

      let totalNovas = 0, totalProcessadas = 0, totalGanhas = 0, totalValorGanhas = 0
      let totalPerdidas = 0, totalValorPerdidas = 0
      let somaLtG = 0, cntLtG = 0, somaLtP = 0, cntLtP = 0

      const sortedKeys = Array.from(allKeys.entries()).sort((a, b) => a[1].localeCompare(b[1]))

      const linhas = sortedKeys.map(([key, label]) => {
        const linha = buildLinhaFromMaps(key, label, novasMap, ganhasMap, perdidasMap)

        totalNovas += linha.novas_oportunidades; totalProcessadas += linha.processadas_total
        totalGanhas += linha.ganhas.qtd; totalValorGanhas += linha.ganhas.valor
        totalPerdidas += linha.perdidas.qtd; totalValorPerdidas += linha.perdidas.valor
        const gm = ganhasMap.get(key)
        const pm = perdidasMap.get(key)
        if (gm?.leadTime != null) { somaLtG += gm.leadTime * gm.total; cntLtG += gm.total }
        if (pm?.leadTime != null) { somaLtP += pm.leadTime * pm.total; cntLtP += pm.total }

        const sNovas = subNovasMap.get(key) || new Map()
        const sGanhas = subGanhasMap.get(key) || new Map()
        const sPerdidas = subPerdidasMap.get(key) || new Map()

        const subItens: SubItem[] = todosDias
          .map(dia => buildLinhaFromMaps(dia, dia, sNovas, sGanhas, sPerdidas))
          .filter(s => s.novas_oportunidades > 0 || s.processadas_total > 0)

        return { ...linha, subItens }
      })

      const txG = totalProcessadas > 0 ? (totalGanhas / totalProcessadas) * 100 : 0
      const txP = totalProcessadas > 0 ? (totalPerdidas / totalProcessadas) * 100 : 0

      return NextResponse.json({
        success: true, agrupamento,
        periodo: { data_inicio: dataInicio, data_fim: dataFim },
        totais: {
          novas_oportunidades: totalNovas, processadas_total: totalProcessadas,
          ganhas: { qtd: totalGanhas, taxa: Math.round(txG * 100) / 100, lead_time: cntLtG > 0 ? Math.round((somaLtG / cntLtG) * 10) / 10 : null, valor: totalValorGanhas, ticket_medio: totalGanhas > 0 ? Math.round((totalValorGanhas / totalGanhas) * 100) / 100 : 0 },
          perdidas: { qtd: totalPerdidas, taxa: Math.round(txP * 100) / 100, lead_time: cntLtP > 0 ? Math.round((somaLtP / cntLtP) * 10) / 10 : null, valor: totalValorPerdidas, ticket_medio: totalPerdidas > 0 ? Math.round((totalValorPerdidas / totalPerdidas) * 100) / 100 : 0 }
        },
        linhas
      })
    }

    // Agrupamento por dia ou semana
    const dateGroupNovas = agrupamento === 'semana'
      ? `MIN(DATE_SUB(DATE(o.createDate), INTERVAL WEEKDAY(o.createDate) DAY)) as chave`
      : `DATE(o.createDate) as chave`
    const groupByNovas = agrupamento === 'semana' ? `YEARWEEK(o.createDate, 1)` : `DATE(o.createDate)`

    const dateGroupGanhas = agrupamento === 'semana'
      ? `MIN(DATE_SUB(DATE(o.gain_date), INTERVAL WEEKDAY(o.gain_date) DAY)) as chave`
      : `DATE(o.gain_date) as chave`
    const groupByGanhas = agrupamento === 'semana' ? `YEARWEEK(o.gain_date, 1)` : `DATE(o.gain_date)`

    const dateGroupPerdidas = agrupamento === 'semana'
      ? `MIN(DATE_SUB(DATE(o.lost_date), INTERVAL WEEKDAY(o.lost_date) DAY)) as chave`
      : `DATE(o.lost_date) as chave`
    const groupByPerdidas = agrupamento === 'semana' ? `YEARWEEK(o.lost_date, 1)` : `DATE(o.lost_date)`

    const [novasRows, ganhasRows, perdidasRows] = await Promise.all([
      executeQuery(
        `SELECT ${dateGroupNovas}, COUNT(*) as total FROM oportunidades o
         WHERE o.archived = 0 AND o.createDate >= ? AND o.createDate <= ? ${vFilter} ${fFilter}
         GROUP BY ${groupByNovas} ORDER BY chave ASC`,
        [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
      ) as Promise<any[]>,
      executeQuery(
        `SELECT ${dateGroupGanhas}, COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total,
                AVG(DATEDIFF(o.gain_date, o.createDate)) as lead_time_avg
         FROM oportunidades o
         WHERE o.archived = 0 AND o.gain_date IS NOT NULL AND o.gain_date >= ? AND o.gain_date <= ? ${vFilter} ${fFilter}
         GROUP BY ${groupByGanhas} ORDER BY chave ASC`,
        [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
      ) as Promise<any[]>,
      executeQuery(
        `SELECT ${dateGroupPerdidas}, COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total,
                AVG(DATEDIFF(o.lost_date, o.createDate)) as lead_time_avg
         FROM oportunidades o
         WHERE o.archived = 0 AND o.lost_date IS NOT NULL AND o.lost_date >= ? AND o.lost_date <= ? ${vFilter} ${fFilter}
         GROUP BY ${groupByPerdidas} ORDER BY chave ASC`,
        [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...extraParams]
      ) as Promise<any[]>
    ])

    const formatDateKey = (v: any): string => {
      if (v instanceof Date) return v.toISOString().split('T')[0]
      return String(v).substring(0, 10)
    }

    if (agrupamento === 'dia') {
      const novasMap = new Map<string, number>()
      const ganhasMap = new Map<string, { total: number; valor: number; leadTime: number | null }>()
      const perdidasMap = new Map<string, { total: number; valor: number; leadTime: number | null }>()

      for (const r of novasRows) novasMap.set(formatDateKey(r.chave), Number(r.total || 0))
      for (const r of ganhasRows) ganhasMap.set(formatDateKey(r.chave), { total: Number(r.total || 0), valor: Number(r.valor_total || 0), leadTime: r.lead_time_avg != null ? Math.round(Number(r.lead_time_avg) * 10) / 10 : null })
      for (const r of perdidasRows) perdidasMap.set(formatDateKey(r.chave), { total: Number(r.total || 0), valor: Number(r.valor_total || 0), leadTime: r.lead_time_avg != null ? Math.round(Number(r.lead_time_avg) * 10) / 10 : null })

      const allKeys = new Map<string, string>()
      const inicio = new Date(dataInicio + 'T00:00:00')
      const fim = new Date(dataFim + 'T00:00:00')
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        allKeys.set(dStr, dStr)
      }

      return buildResponse(dataInicio, dataFim, agrupamento, allKeys, novasMap, ganhasMap, perdidasMap)
    }

    // Semana
    const allKeys = new Map<string, string>()
    const novasMap = new Map<string, number>()
    const ganhasMap = new Map<string, { total: number; valor: number; leadTime: number | null }>()
    const perdidasMap = new Map<string, { total: number; valor: number; leadTime: number | null }>()

    for (const r of novasRows) { const k = formatDateKey(r.chave); allKeys.set(k, k); novasMap.set(k, Number(r.total || 0)) }
    for (const r of ganhasRows) { const k = formatDateKey(r.chave); allKeys.set(k, k); ganhasMap.set(k, { total: Number(r.total || 0), valor: Number(r.valor_total || 0), leadTime: r.lead_time_avg != null ? Math.round(Number(r.lead_time_avg) * 10) / 10 : null }) }
    for (const r of perdidasRows) { const k = formatDateKey(r.chave); allKeys.set(k, k); perdidasMap.set(k, { total: Number(r.total || 0), valor: Number(r.valor_total || 0), leadTime: r.lead_time_avg != null ? Math.round(Number(r.lead_time_avg) * 10) / 10 : null }) }

    return buildResponse(dataInicio, dataFim, agrupamento, allKeys, novasMap, ganhasMap, perdidasMap)

  } catch (error) {
    console.error('Erro na API /analytics/oportunidades-processadas:', error)
    return NextResponse.json({ success: false, message: 'Erro ao buscar oportunidades processadas', error: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 })
  }
}

function buildResponse(
  dataInicio: string, dataFim: string, agrupamento: string,
  allKeys: Map<string, string>,
  novasMap: Map<string, number>,
  ganhasMap: Map<string, { total: number; valor: number; leadTime: number | null }>,
  perdidasMap: Map<string, { total: number; valor: number; leadTime: number | null }>
) {
  let totalNovas = 0, totalProcessadas = 0, totalGanhas = 0, totalValorGanhas = 0
  let totalPerdidas = 0, totalValorPerdidas = 0
  let somaLtG = 0, cntLtG = 0, somaLtP = 0, cntLtP = 0

  const sortedKeys = Array.from(allKeys.entries()).sort((a, b) => a[1].localeCompare(b[1]))

  const linhas = sortedKeys.map(([key, label]) => {
    const linha = buildLinhaFromMaps(key, label, novasMap, ganhasMap, perdidasMap)
    totalNovas += linha.novas_oportunidades; totalProcessadas += linha.processadas_total
    totalGanhas += linha.ganhas.qtd; totalValorGanhas += linha.ganhas.valor
    totalPerdidas += linha.perdidas.qtd; totalValorPerdidas += linha.perdidas.valor
    const gm = ganhasMap.get(key); const pm = perdidasMap.get(key)
    if (gm?.leadTime != null) { somaLtG += gm.leadTime * gm.total; cntLtG += gm.total }
    if (pm?.leadTime != null) { somaLtP += pm.leadTime * pm.total; cntLtP += pm.total }
    return linha
  })

  const txG = totalProcessadas > 0 ? (totalGanhas / totalProcessadas) * 100 : 0
  const txP = totalProcessadas > 0 ? (totalPerdidas / totalProcessadas) * 100 : 0

  return NextResponse.json({
    success: true, agrupamento,
    periodo: { data_inicio: dataInicio, data_fim: dataFim },
    totais: {
      novas_oportunidades: totalNovas, processadas_total: totalProcessadas,
      ganhas: { qtd: totalGanhas, taxa: Math.round(txG * 100) / 100, lead_time: cntLtG > 0 ? Math.round((somaLtG / cntLtG) * 10) / 10 : null, valor: totalValorGanhas, ticket_medio: totalGanhas > 0 ? Math.round((totalValorGanhas / totalGanhas) * 100) / 100 : 0 },
      perdidas: { qtd: totalPerdidas, taxa: Math.round(txP * 100) / 100, lead_time: cntLtP > 0 ? Math.round((somaLtP / cntLtP) * 10) / 10 : null, valor: totalValorPerdidas, ticket_medio: totalPerdidas > 0 ? Math.round((totalValorPerdidas / totalPerdidas) * 100) / 100 : 0 }
    },
    linhas
  })
}
