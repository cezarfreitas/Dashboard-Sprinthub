import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

type Agrupamento = 'dia' | 'semana' | 'vendedor' | 'unidade'

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

function fmtDate(v: any): string {
  if (v == null) return ''
  if (v instanceof Date) {
    const y = v.getFullYear(); const m = String(v.getMonth() + 1).padStart(2, '0'); const d = String(v.getDate()).padStart(2, '0')
    return `${d}/${m}/${y}`
  }
  const s = String(v).substring(0, 10)
  const [y, m, d] = s.split('-')
  return d ? `${d}/${m}/${y}` : s
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

    // 1) Busca dados agregados via API interna (mesma rota /analytics/oportunidades-processadas)
    const origin = new URL(request.url).origin
    const aggParams = new URLSearchParams()
    aggParams.set('data_inicio', dataInicio)
    aggParams.set('data_fim', dataFim)
    aggParams.set('agrupamento', agrupamento)
    if (unidadeIdParam) aggParams.set('unidade_id', unidadeIdParam)
    if (funilIdParam) aggParams.set('funil_id', funilIdParam)
    const aggRes = await fetch(`${origin}/api/analytics/oportunidades-processadas?${aggParams.toString()}`, { cache: 'no-store' })
    const aggData = await aggRes.json()

    // 2) Busca oportunidades brutas — qualquer oportunidade cuja createDate, gain_date ou lost_date caia no período
    const vFilter = vendedorIds.length > 0 ? `AND CAST(o.user AS UNSIGNED) IN (${vendedorIds.map(() => '?').join(',')})` : ''
    const fFilter = funilIds.length > 0 ? `AND cf.id_funil IN (${funilIds.map(() => '?').join(',')})` : ''
    const dIni = dataInicio + ' 00:00:00'
    const dFim = dataFim + ' 23:59:59'

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
         f.id as funil_id,
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

    // Mapear vendedor -> unidade
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
    const formatadoRows: any[][] = []
    const colLabel = agrupamento === 'dia' ? 'Dia' : agrupamento === 'semana' ? 'Semana' : agrupamento === 'vendedor' ? 'Vendedor' : 'Unidade'
    formatadoRows.push([`Oportunidades Processadas — ${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`])
    formatadoRows.push([`Agrupamento: ${colLabel}`])
    formatadoRows.push([])
    formatadoRows.push([
      colLabel, 'Novas Oport.', 'Processadas Total',
      'Ganhas Qtd', 'Ganhas Taxa %', 'Ganhas Lead Time (dias)', 'Ganhas Valor', 'Ganhas Ticket Médio',
      'Perdidas Qtd', 'Perdidas Taxa %', 'Perdidas Lead Time (dias)', 'Perdidas Valor', 'Perdidas Ticket Médio'
    ])

    if (aggData?.success && Array.isArray(aggData.linhas)) {
      const linhaToRow = (label: string, d: any) => [
        label,
        d.novas_oportunidades, d.processadas_total,
        d.ganhas.qtd, d.ganhas.taxa, d.ganhas.lead_time ?? '', d.ganhas.valor, d.ganhas.ticket_medio,
        d.perdidas.qtd, d.perdidas.taxa, d.perdidas.lead_time ?? '', d.perdidas.valor, d.perdidas.ticket_medio,
      ]

      for (const linha of aggData.linhas) {
        const label = (agrupamento === 'dia') ? fmtDate(linha.label)
          : (agrupamento === 'semana') ? `Sem. ${fmtDate(linha.label)}`
          : linha.label
        formatadoRows.push(linhaToRow(label, linha))
        if (Array.isArray(linha.subItens)) {
          for (const sub of linha.subItens) {
            formatadoRows.push(linhaToRow(`   ${fmtDate(sub.label)}`, sub))
          }
        }
      }

      // Total
      const t = aggData.totais
      formatadoRows.push([
        'TOTAL',
        t.novas_oportunidades, t.processadas_total,
        t.ganhas.qtd, t.ganhas.taxa, t.ganhas.lead_time ?? '', t.ganhas.valor, t.ganhas.ticket_medio,
        t.perdidas.qtd, t.perdidas.taxa, t.perdidas.lead_time ?? '', t.perdidas.valor, t.perdidas.ticket_medio,
      ])
    }

    const wsFormatado = XLSX.utils.aoa_to_sheet(formatadoRows)
    wsFormatado['!cols'] = [
      { wch: 28 }, { wch: 12 }, { wch: 16 },
      { wch: 11 }, { wch: 13 }, { wch: 20 }, { wch: 14 }, { wch: 15 },
      { wch: 12 }, { wch: 13 }, { wch: 22 }, { wch: 14 }, { wch: 16 }
    ]

    // ====== Aba 2: Oportunidades (brutas) ======
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

    const filename = `oportunidades-processadas_${dataInicio}_${dataFim}.xlsx`
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    console.error('Erro no export /analytics/oportunidades-processadas/export:', error)
    return NextResponse.json({ success: false, message: 'Erro ao exportar', error: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 })
  }
}
