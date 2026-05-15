import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
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

function fmtDateTime(v: any): string {
  if (v == null) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const Y = d.getFullYear(); const M = String(d.getMonth() + 1).padStart(2, '0'); const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0'); const mi = String(d.getMinutes()).padStart(2, '0')
  return `${D}/${M}/${Y} ${h}:${mi}`
}

function statusLabel(o: any): string {
  if (o.gain_date) return 'Ganha'
  if (o.lost_date) return 'Perdida'
  if (o.status === 'gain') return 'Ganha'
  if (o.status === 'lost') return 'Perdida'
  return 'Aberta'
}

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function lastDayOfMonth(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

function statsBlockRows(prefix: string, stats: any): any[][] {
  return [
    [`${prefix} — Novas oportunidades`, stats?.novas_oportunidades ?? 0],
    [`${prefix} — Oportunidades ganhas`, stats?.oportunidades_ganhas ?? 0],
    [`${prefix} — Valor vendas`, stats?.valor_vendas ?? 0],
    [`${prefix} — Oportunidades perdidas`, stats?.oportunidades_perdidas ?? 0],
    [`${prefix} — Valor perdido`, stats?.valor_perdido ?? 0],
    [`${prefix} — Oportunidades abertas`, stats?.oportunidades_abertas ?? 0],
    [`${prefix} — Valor aberto`, stats?.valor_aberto ?? 0],
    [`${prefix} — Ticket médio`, stats?.ticket_medio ?? 0],
    [`${prefix} — Taxa conversão %`, stats?.taxa_conversao ?? 0],
    [`${prefix} — Tempo médio ganho (dias)`, stats?.tempo_medio_ganho ?? ''],
    [`${prefix} — Tempo médio perda (dias)`, stats?.tempo_medio_perda ?? ''],
  ]
}

function crescBlockRows(prefix: string, c: any): any[][] {
  return [
    [`${prefix} — Crescimento novas oport. %`, c?.novas_oportunidades ?? ''],
    [`${prefix} — Crescimento ganhas %`, c?.oportunidades_ganhas ?? ''],
    [`${prefix} — Crescimento valor vendas %`, c?.valor_vendas ?? ''],
    [`${prefix} — Crescimento perdidas %`, c?.oportunidades_perdidas ?? ''],
    [`${prefix} — Crescimento valor perdido %`, c?.valor_perdido ?? ''],
    [`${prefix} — Crescimento ticket médio %`, c?.ticket_medio ?? ''],
    [`${prefix} — Crescimento taxa conv. (p.p.)`, c?.taxa_conversao ?? ''],
  ]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = parseInt(searchParams.get('mes') || '0')
    const ano = parseInt(searchParams.get('ano') || '0')
    const unidadeIdParam = searchParams.get('unidade_id')
    const funilIdParam = searchParams.get('funil_id')

    if (!mes || !ano) {
      return NextResponse.json({ success: false, message: 'mes e ano são obrigatórios' }, { status: 400 })
    }

    let unidadeIds: number[] = []
    let vendedorIds: number[] = []
    if (unidadeIdParam) {
      unidadeIds = unidadeIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      vendedorIds = await getVendedorIdsByUnidades(unidadeIds)
    }
    let funilIds: number[] = []
    if (funilIdParam) {
      funilIds = funilIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
    }

    // 1) Busca dados agregados via API existente
    const origin = new URL(request.url).origin
    const aggParams = new URLSearchParams()
    aggParams.set('mes', String(mes))
    aggParams.set('ano', String(ano))
    if (unidadeIdParam) aggParams.set('unidade_id', unidadeIdParam)
    if (funilIdParam) aggParams.set('funil_id', funilIdParam)
    const aggRes = await fetch(`${origin}/api/analytics/comparativo-vendas?${aggParams.toString()}`, { cache: 'no-store' })
    const aggData = await aggRes.json()

    // 2) Brutos: oportunidades do mês de referência (createDate, gain_date ou lost_date no mês)
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDayOfMonth(ano, mes)).padStart(2, '0')}`
    const dIni = dataInicio + ' 00:00:00'
    const dFim = dataFim + ' 23:59:59'

    const vFilter = vendedorIds.length > 0 ? `AND CAST(o.user AS UNSIGNED) IN (${vendedorIds.map(() => '?').join(',')})` : ''
    const fFilter = funilIds.length > 0 ? `AND cf.id_funil IN (${funilIds.map(() => '?').join(',')})` : ''

    const oportunidades = await executeQuery(
      `SELECT
         o.id,
         o.title,
         o.value,
         o.status,
         o.createDate,
         o.gain_date,
         o.lost_date,
         o.gain_reason,
         o.loss_reason,
         o.user as vendedor_id_raw,
         COALESCE(CONCAT(v.name, ' ', v.lastName), v.name) as vendedor_nome,
         v.id as vendedor_id,
         f.funil_nome,
         cf.nome_coluna as coluna_nome
       FROM oportunidades o
       LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
       LEFT JOIN colunas_funil cf ON cf.id = o.coluna_funil_id
       LEFT JOIN funis f ON f.id = cf.id_funil
       WHERE o.archived = 0
         AND (
           (o.createDate >= ? AND o.createDate <= ?)
           OR (o.gain_date IS NOT NULL AND o.gain_date >= ? AND o.gain_date <= ?)
           OR (o.lost_date IS NOT NULL AND o.lost_date >= ? AND o.lost_date <= ?)
         )
         ${vFilter}
         ${fFilter}
       ORDER BY o.createDate DESC`,
      [dIni, dFim, dIni, dFim, dIni, dFim, ...vendedorIds, ...funilIds]
    ) as any[]

    // Map vendedor -> unidade
    const todasUnidades = await executeQuery(
      `SELECT id, COALESCE(nome, name) as nome, users FROM unidades WHERE ativo = 1`
    ) as any[]
    const vendedorToUnidade = new Map<number, string>()
    for (const u of todasUnidades) {
      parseJSON(u.users).forEach((uu: any) => {
        let id: any = null
        if (typeof uu === 'object' && uu !== null) id = uu.id || uu.user_id || uu.vendedor_id
        else if (typeof uu === 'number') id = uu
        else if (typeof uu === 'string') { const p = parseInt(uu.trim()); if (!isNaN(p)) id = p }
        if (id != null && !vendedorToUnidade.has(Number(id))) vendedorToUnidade.set(Number(id), u.nome || 'Sem unidade')
      })
    }

    // ====== Aba 1: Dados Formatados ======
    const rows: any[][] = []
    const periodoLabel = `${nomesMeses[mes - 1]}/${ano}`
    rows.push([`Comparativo de Vendas — Referência: ${periodoLabel}`])
    rows.push([])

    if (aggData?.success) {
      const d = aggData

      // Seção: KPIs do mês atual
      rows.push(['KPIs DO MÊS ATUAL'])
      rows.push(['Indicador', 'Valor'])
      rows.push(['Vendas no mês', d.periodo?.mes_atual?.valor_vendas ?? 0])
      rows.push(['Oportunidades ganhas', d.periodo?.mes_atual?.oportunidades_ganhas ?? 0])
      rows.push(['Perdidas no mês (valor)', d.periodo?.mes_atual?.valor_perdido ?? 0])
      rows.push(['Oportunidades perdidas', d.periodo?.mes_atual?.oportunidades_perdidas ?? 0])
      rows.push(['Ticket médio', d.indicadores_mes_atual?.ticket_medio ?? 0])
      rows.push(['Taxa conversão %', d.indicadores_mes_atual?.taxa_conversao ?? 0])
      rows.push(['Tempo médio ganho (dias)', d.indicadores_mes_atual?.tempo_medio_ganho ?? ''])
      rows.push(['Tempo médio perda (dias)', d.indicadores_mes_atual?.tempo_medio_perda ?? ''])
      rows.push(['Pipeline aberto — quantidade', d.indicadores_mes_atual?.pipeline_aberto?.quantidade ?? 0])
      rows.push(['Pipeline aberto — valor', d.indicadores_mes_atual?.pipeline_aberto?.valor ?? 0])
      rows.push([])

      // Período (mês anterior vs mês atual)
      rows.push([`PERÍODO — ${d.nome_mes_anterior} vs ${d.nome_mes_atual}`])
      rows.push(['Indicador', 'Valor'])
      rows.push(...statsBlockRows(d.nome_mes_anterior || 'Mês anterior', d.periodo?.mes_anterior))
      rows.push(...statsBlockRows(d.nome_mes_atual || 'Mês atual', d.periodo?.mes_atual))
      rows.push(...crescBlockRows('Crescimento', d.periodo?.crescimento))
      rows.push([])

      // Meta do mês
      rows.push([`META DO MÊS — ${d.data_referencia ?? periodoLabel}`])
      rows.push(['Indicador', 'Valor'])
      rows.push(['Meta valor', d.meta_mes?.meta_valor ?? 0])
      rows.push(['Real', d.meta_mes?.real ?? 0])
      rows.push(['Target %', d.meta_mes?.target ?? ''])
      rows.push([])

      // YoY
      rows.push([`PERÍODO YoY — ${ano - 1} vs ${ano}`])
      rows.push(['Indicador', 'Valor'])
      rows.push(...statsBlockRows(`${nomesMeses[mes - 1]}/${ano - 1}`, d.periodo_yoy?.mesmo_mes_ano_anterior))
      rows.push(...statsBlockRows(d.nome_mes_atual || `${nomesMeses[mes - 1]}/${ano}`, d.periodo_yoy?.mes_atual))
      rows.push(...crescBlockRows('Crescimento YoY', d.periodo_yoy?.crescimento))
      rows.push([])

      // Acumulado ano
      rows.push([`ACUMULADO ANO — ${ano - 1} vs ${ano}`])
      rows.push(['Indicador', 'Valor'])
      rows.push(...statsBlockRows(`Ano ${ano - 1}`, d.acumulado_ano?.ano_anterior))
      rows.push(...statsBlockRows(`Ano ${ano}`, d.acumulado_ano?.ano_atual))
      rows.push(...crescBlockRows('Crescimento acumulado', d.acumulado_ano?.crescimento))
      rows.push([])

      // Meta anual
      rows.push([`META ANUAL ${ano}`])
      rows.push(['Indicador', 'Valor'])
      rows.push([`Meta ${ano}`, d.meta_anual?.meta_valor ?? 0])
      rows.push(['Real', d.meta_anual?.real ?? 0])
      rows.push(['Target %', d.meta_anual?.target ?? ''])
      rows.push(['Gap valor', d.meta_anual?.gap_valor ?? 0])
      rows.push([])

      // Tendência
      rows.push([`TENDÊNCIA — Ano ${ano - 1} completo vs Tendência ${ano}`])
      rows.push(['Indicador', 'Valor'])
      rows.push(...statsBlockRows(`Ano ${ano - 1} completo`, d.tendencia?.ano_anterior_completo))
      rows.push(...statsBlockRows(`Tendência ${ano}`, d.tendencia?.tendencia_ano_atual))
      rows.push(...crescBlockRows('Crescimento tendência', d.tendencia?.crescimento))
      rows.push([])

      // Top motivos de perda
      if (Array.isArray(d.top_motivos_perda) && d.top_motivos_perda.length > 0) {
        const totalPerdidas = d.periodo?.mes_atual?.oportunidades_perdidas ?? 0
        rows.push([`TOP MOTIVOS DE PERDA — ${d.nome_mes_atual}`])
        rows.push(['Motivo', 'Quantidade', 'Valor perdido', '% do total'])
        for (const m of d.top_motivos_perda) {
          const pct = totalPerdidas > 0 ? Math.round((m.quantidade / totalPerdidas) * 1000) / 10 : 0
          rows.push([m.motivo, m.quantidade, m.valor_perdido, pct])
        }
      }
    }

    const wsFormatado = XLSX.utils.aoa_to_sheet(rows)
    wsFormatado['!cols'] = [{ wch: 50 }, { wch: 22 }, { wch: 22 }, { wch: 14 }]

    // ====== Aba 2: Oportunidades brutas ======
    const brutosHeader = [
      'ID', 'Título', 'Status', 'Valor',
      'Data Criação', 'Data Ganho', 'Data Perdida',
      'Vendedor ID', 'Vendedor', 'Unidade',
      'Funil', 'Coluna do Funil',
      'Motivo Ganho', 'Motivo Perda'
    ]
    const brutosRows: any[][] = [brutosHeader]
    for (const o of oportunidades) {
      const vendId = Number(o.vendedor_id || o.vendedor_id_raw) || null
      const unidadeNome = vendId != null ? (vendedorToUnidade.get(vendId) || '') : ''
      brutosRows.push([
        o.id,
        o.title || '',
        statusLabel(o),
        Number(o.value) || 0,
        fmtDateTime(o.createDate),
        fmtDateTime(o.gain_date),
        fmtDateTime(o.lost_date),
        vendId ?? '',
        o.vendedor_nome || 'Sem vendedor',
        unidadeNome,
        o.funil_nome || '',
        o.coluna_nome || '',
        o.gain_reason || '',
        o.loss_reason || '',
      ])
    }
    const wsBrutos = XLSX.utils.aoa_to_sheet(brutosRows)
    wsBrutos['!cols'] = [
      { wch: 10 }, { wch: 40 }, { wch: 10 }, { wch: 12 },
      { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 11 }, { wch: 28 }, { wch: 24 },
      { wch: 20 }, { wch: 22 },
      { wch: 28 }, { wch: 28 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsFormatado, 'Dados Formatados')
    XLSX.utils.book_append_sheet(wb, wsBrutos, 'Oportunidades')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const body = new Uint8Array(buffer)

    const filename = `comparativo-vendas_${ano}-${String(mes).padStart(2, '0')}.xlsx`
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    console.error('Erro no export /analytics/comparativo-vendas/export:', error)
    return NextResponse.json({ success: false, message: 'Erro ao exportar', error: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 })
  }
}
