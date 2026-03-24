"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import PainelFiltersInline from "@/components/painel/PainelFiltersInline"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { BarChart3, Calendar, CalendarDays, CalendarRange, User, Building2, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, ChevronDown } from "lucide-react"

type Agrupamento = 'dia' | 'semana' | 'vendedor' | 'unidade'

interface SubItemData {
  chave: string
  label: string
  novas_oportunidades: number
  processadas_total: number
  ganhas: { qtd: number; taxa: number; lead_time: number | null; valor: number; ticket_medio: number }
  perdidas: { qtd: number; taxa: number; lead_time: number | null; valor: number; ticket_medio: number }
}

interface LinhaData {
  chave: string
  label: string
  novas_oportunidades: number
  processadas_total: number
  ganhas: { qtd: number; taxa: number; lead_time: number | null; valor: number; ticket_medio: number }
  perdidas: { qtd: number; taxa: number; lead_time: number | null; valor: number; ticket_medio: number }
  subItens?: SubItemData[]
}

interface ProcessadasData {
  agrupamento: string
  periodo: { data_inicio: string; data_fim: string }
  totais: {
    novas_oportunidades: number
    processadas_total: number
    ganhas: { qtd: number; taxa: number; lead_time: number | null; valor: number; ticket_medio: number }
    perdidas: { qtd: number; taxa: number; lead_time: number | null; valor: number; ticket_medio: number }
  }
  linhas: LinhaData[]
}

type SortKey =
  | 'label' | 'novas_oportunidades' | 'processadas_total'
  | 'ganhas.qtd' | 'ganhas.taxa' | 'ganhas.lead_time' | 'ganhas.valor' | 'ganhas.ticket_medio'
  | 'perdidas.qtd' | 'perdidas.taxa' | 'perdidas.lead_time' | 'perdidas.valor' | 'perdidas.ticket_medio'

type SortDir = 'asc' | 'desc'

function getNestedValue(row: LinhaData | SubItemData, key: SortKey): number | string | null {
  switch (key) {
    case 'label': return row.label
    case 'novas_oportunidades': return row.novas_oportunidades
    case 'processadas_total': return row.processadas_total
    case 'ganhas.qtd': return row.ganhas.qtd
    case 'ganhas.taxa': return row.ganhas.taxa
    case 'ganhas.lead_time': return row.ganhas.lead_time
    case 'ganhas.valor': return row.ganhas.valor
    case 'ganhas.ticket_medio': return row.ganhas.ticket_medio
    case 'perdidas.qtd': return row.perdidas.qtd
    case 'perdidas.taxa': return row.perdidas.taxa
    case 'perdidas.lead_time': return row.perdidas.lead_time
    case 'perdidas.valor': return row.perdidas.valor
    case 'perdidas.ticket_medio': return row.perdidas.ticket_medio
  }
}

function fmtCur(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v) }
function fmtNum(v: number) { return new Intl.NumberFormat('pt-BR').format(v) }
function fmtPct(v: number) { return `${v.toFixed(2)}%` }
function fmtLeadTime(v: number | null) { return v != null ? `${v.toFixed(1)} dias` : '0 dia' }
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtLabel(label: string, agrupamento: Agrupamento): string {
  if (agrupamento === 'dia') return fmtDate(label)
  if (agrupamento === 'semana') return `Sem. ${fmtDate(label)}`
  return label
}

const agrupamentos: { value: Agrupamento; label: string; icon: any }[] = [
  { value: 'dia', label: 'Dia a Dia', icon: CalendarDays },
  { value: 'semana', label: 'Semana', icon: CalendarRange },
  { value: 'vendedor', label: 'Vendedor', icon: User },
  { value: 'unidade', label: 'Unidade', icon: Building2 },
]

function SortIcon({ sortKey, currentSort, currentDir }: { sortKey: SortKey; currentSort: SortKey | null; currentDir: SortDir }) {
  if (currentSort !== sortKey) return <ArrowUpDown className="h-2.5 w-2.5 opacity-30 ml-0.5 inline-block" />
  return currentDir === 'asc'
    ? <ArrowUp className="h-2.5 w-2.5 opacity-80 ml-0.5 inline-block" />
    : <ArrowDown className="h-2.5 w-2.5 opacity-80 ml-0.5 inline-block" />
}

export default function OportunidadesProcessadasPage() {
  const abortControllerRef = useRef<AbortController | null>(null)

  const [agrupamento, setAgrupamento] = useState<Agrupamento>('dia')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const hasSubItens = agrupamento === 'vendedor' || agrupamento === 'unidade'

  const toggleRow = useCallback((chave: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }, [])

  const toggleAll = useCallback((allKeys: string[]) => {
    setExpandedRows(prev => {
      if (prev.size === allKeys.length) return new Set()
      return new Set(allKeys)
    })
  }, [])

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return key
      }
      setSortDir('desc')
      return key
    })
  }, [])

  const periodoInicial = useMemo(() => {
    const hoje = new Date()
    return {
      inicio: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`,
      fim: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    }
  }, [])

  const [filtros, setFiltros] = useState(() => ({
    unidadesSelecionadas: [] as number[],
    periodoTipo: 'este-mes' as string,
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funisSelecionados: [] as number[],
    gruposSelecionados: [] as number[],
    gainDateInicio: undefined as string | undefined,
    gainDateFim: undefined as string | undefined
  }))

  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string; unidadeIds?: number[] }>>([])
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])
  const [dados, setDados] = useState<ProcessadasData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchFunis = useCallback(async () => { try { const r = await fetch('/api/funis'); const d = await r.json(); if (d.success && d.funis) setFunis(d.funis) } catch { setFunis([]) } }, [])
  const fetchGrupos = useCallback(async () => { try { const r = await fetch('/api/unidades/grupos'); const d = await r.json(); if (d.success && d.grupos) setGrupos(d.grupos) } catch { setGrupos([]) } }, [])
  const fetchUnidadesList = useCallback(async () => { try { const r = await fetch('/api/unidades/list'); const d = await r.json(); if (d.success && d.unidades) setUnidadesList(d.unidades) } catch { setUnidadesList([]) } }, [])

  useEffect(() => { fetchFunis(); fetchGrupos(); fetchUnidadesList() }, [fetchFunis, fetchGrupos, fetchUnidadesList])

  const calcularPeriodo = useCallback((tipo: string) => {
    const hoje = new Date()
    let inicio: Date, fim: Date
    switch (tipo) {
      case 'este-mes': inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1); fim = hoje; break
      case 'mes-passado': inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1); fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0); break
      case 'esta-semana': { const ds = hoje.getDay(); inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ds); fim = hoje; break }
      case 'semana-passada': { const ds = hoje.getDay(); inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ds - 7); fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ds - 1); break }
      case 'este-ano': inicio = new Date(hoje.getFullYear(), 0, 1); fim = hoje; break
      case 'ano-anterior': inicio = new Date(hoje.getFullYear() - 1, 0, 1); fim = new Date(hoje.getFullYear() - 1, 11, 31); break
      default: return { inicio: '', fim: '' }
    }
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { inicio: fmt(inicio), fim: fmt(fim) }
  }, [])

  useEffect(() => {
    if (filtros.periodoTipo !== 'personalizado') {
      const { inicio, fim } = calcularPeriodo(filtros.periodoTipo)
      if (filtros.periodoInicio !== inicio || filtros.periodoFim !== fim) {
        setFiltros(prev => ({ ...prev, periodoInicio: inicio, periodoFim: fim }))
      }
    }
  }, [filtros.periodoTipo, filtros.periodoInicio, filtros.periodoFim, calcularPeriodo])

  const unidadesIdsAplicadas = useMemo(() => {
    let unidadesDoGrupo: number[] | null = null
    if (filtros.gruposSelecionados.length > 0) {
      unidadesDoGrupo = filtros.gruposSelecionados.flatMap(grupoId => {
        const grupo = grupos.find(g => Number(g.id) === grupoId)
        return grupo?.unidadeIds || []
      })
    }
    const sel = filtros.unidadesSelecionadas || []
    if (unidadesDoGrupo) return sel.length > 0 ? sel.filter(id => unidadesDoGrupo!.includes(id)) : unidadesDoGrupo
    return sel
  }, [filtros.unidadesSelecionadas, filtros.gruposSelecionados, grupos])

  const fetchData = useCallback(async (signal: AbortSignal) => {
    if (!filtros.periodoInicio || !filtros.periodoFim) return
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('data_inicio', filtros.periodoInicio)
      params.set('data_fim', filtros.periodoFim)
      params.set('agrupamento', agrupamento)
      if (unidadesIdsAplicadas.length > 0) params.set('unidade_id', unidadesIdsAplicadas.join(','))
      if (filtros.funisSelecionados.length > 0) params.set('funil_id', filtros.funisSelecionados.join(','))

      const res = await fetch(`/api/analytics/oportunidades-processadas?${params.toString()}`, { cache: 'no-store', signal })
      if (signal.aborted) return
      const data = await res.json()
      if (signal.aborted) return
      setDados(data.success ? data : null)
      setExpandedRows(new Set())
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setDados(null)
    } finally { setLoading(false) }
  }, [filtros.periodoInicio, filtros.periodoFim, agrupamento, unidadesIdsAplicadas, filtros.funisSelecionados])

  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const ctrl = new AbortController()
    abortControllerRef.current = ctrl
    fetchData(ctrl.signal)
    return () => { ctrl.abort(); abortControllerRef.current = null }
  }, [fetchData])

  const filtrosAtivos = useMemo(() => {
    return filtros.unidadesSelecionadas.length > 0 || filtros.periodoTipo !== 'este-mes' || filtros.funisSelecionados.length > 0 || filtros.gruposSelecionados.length > 0
  }, [filtros])

  const linhasOrdenadas = useMemo(() => {
    if (!dados) return []
    if (!sortKey) return dados.linhas
    const sorted = [...dados.linhas].sort((a, b) => {
      const va = getNestedValue(a, sortKey)
      const vb = getNestedValue(b, sortKey)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb, 'pt-BR') : vb.localeCompare(va, 'pt-BR')
      const na = Number(va), nb = Number(vb)
      return sortDir === 'asc' ? na - nb : nb - na
    })
    return sorted
  }, [dados, sortKey, sortDir])

  const colLabel = agrupamento === 'dia' ? 'DIA' : agrupamento === 'semana' ? 'SEMANA' : agrupamento === 'vendedor' ? 'VENDEDOR' : 'UNIDADE'

  const thBase = "px-2 py-2 text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap border border-white/20"
  const thSort = `${thBase} cursor-pointer select-none hover:brightness-110 transition-all`
  const tdBase = "px-2 py-1.5 text-xs border border-gray-200 whitespace-nowrap"
  const tdNum = `${tdBase} text-right font-mono`
  const tdTotalBase = "px-2 py-2 text-xs border border-gray-300 whitespace-nowrap font-bold bg-gray-100"
  const tdTotalNum = `${tdTotalBase} text-right font-mono`

  function renderDataCells(d: LinhaData | SubItemData, isSub: boolean = false) {
    const hasData = d.novas_oportunidades > 0 || d.processadas_total > 0
    const dimClass = isSub ? 'opacity-80' : ''
    return (
      <>
        <td className={`${tdNum} ${hasData ? `text-gray-900 font-semibold ${dimClass}` : 'text-gray-400'}`}>{d.novas_oportunidades}</td>
        <td className={`${tdNum} ${hasData ? `text-gray-900 font-semibold ${dimClass}` : 'text-gray-400'}`}>{d.processadas_total}</td>
        <td className={`${tdNum} ${d.ganhas.qtd > 0 ? `text-green-700 font-semibold ${dimClass}` : 'text-gray-400'}`}>{d.ganhas.qtd}</td>
        <td className={`${tdNum} ${d.ganhas.qtd > 0 ? `text-gray-700 ${dimClass}` : 'text-gray-400'}`}>{fmtPct(d.ganhas.taxa)}</td>
        <td className={`${tdNum} ${d.ganhas.qtd > 0 ? `text-gray-700 ${dimClass}` : 'text-gray-400'}`}>{d.ganhas.lead_time != null ? `${d.ganhas.lead_time} dias` : '0 dia'}</td>
        <td className={`${tdNum} ${d.ganhas.qtd > 0 ? `text-green-700 ${dimClass}` : 'text-gray-400'}`}>{fmtCur(d.ganhas.valor)}</td>
        <td className={`${tdNum} ${d.ganhas.qtd > 0 ? `text-gray-700 ${dimClass}` : 'text-gray-400'}`}>{fmtCur(d.ganhas.ticket_medio)}</td>
        <td className={`${tdNum} ${d.perdidas.qtd > 0 ? `text-red-600 font-semibold ${dimClass}` : 'text-gray-400'}`}>{d.perdidas.qtd}</td>
        <td className={`${tdNum} ${d.perdidas.qtd > 0 ? `text-gray-700 ${dimClass}` : 'text-gray-400'}`}>{fmtPct(d.perdidas.taxa)}</td>
        <td className={`${tdNum} ${d.perdidas.qtd > 0 ? `text-gray-700 ${dimClass}` : 'text-gray-400'}`}>{d.perdidas.lead_time != null ? `${d.perdidas.lead_time} dias` : '0 dia'}</td>
        <td className={`${tdNum} ${d.perdidas.qtd > 0 ? `text-red-600 ${dimClass}` : 'text-gray-400'}`}>{fmtCur(d.perdidas.valor)}</td>
        <td className={`${tdNum} ${d.perdidas.qtd > 0 ? `text-gray-700 ${dimClass}` : 'text-gray-400'}`}>{fmtCur(d.perdidas.ticket_medio)}</td>
      </>
    )
  }

  const allLinhaKeys = useMemo(() => linhasOrdenadas.map(l => l.chave), [linhasOrdenadas])
  const allExpanded = expandedRows.size > 0 && dados ? expandedRows.size === dados.linhas.length : false

  return (
    <ProtectedRoute>
      <div className="w-full">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Oportunidades Processadas</h1>
              {dados && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>{fmtDate(dados.periodo.data_inicio)} a {fmtDate(dados.periodo.data_fim)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {agrupamentos.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={agrupamento === value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setAgrupamento(value); setSortKey(null); setExpandedRows(new Set()) }}
                className={`h-8 px-3 text-xs gap-1.5 ${
                  agrupamento === value
                    ? 'bg-white text-gray-900 shadow-sm hover:bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <PainelFiltersInline
          filtros={filtros} setFiltros={setFiltros} unidadesList={unidadesList}
          funis={funis} grupos={grupos} periodoInicial={periodoInicial}
          filtrosAtivos={filtrosAtivos} showGainDateFilter={false}
        />

        {loading ? (
          <div className="mt-4"><Skeleton className="h-[400px] w-full bg-gray-100 rounded" /></div>
        ) : !dados || dados.linhas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <BarChart3 className="h-10 w-10 opacity-30" />
            <span className="text-sm">Nenhum dado disponível para o período selecionado.</span>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto border border-gray-300 rounded">
            <table className="w-full border-collapse min-w-[1400px]">
              <thead>
                <tr>
                  <th className={`${thSort} bg-[#2E5984]`} rowSpan={2} onClick={() => hasSubItens ? toggleAll(allLinhaKeys) : handleSort('label')}>
                    {hasSubItens && (
                      <span className="inline-flex items-center mr-1">
                        {allExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </span>
                    )}
                    {colLabel}
                    {!hasSubItens && <SortIcon sortKey="label" currentSort={sortKey} currentDir={sortDir} />}
                  </th>
                  <th className={`${thSort} bg-[#2E5984]`} rowSpan={2} onClick={() => handleSort('novas_oportunidades')}>
                    NOVAS<br/>OPORT. <SortIcon sortKey="novas_oportunidades" currentSort={sortKey} currentDir={sortDir} />
                  </th>
                  <th className={`${thSort} bg-[#2E5984]`} rowSpan={2} onClick={() => handleSort('processadas_total')}>
                    PROCESSADAS<br/>(QTD. TOTAL) <SortIcon sortKey="processadas_total" currentSort={sortKey} currentDir={sortDir} />
                  </th>
                  <th className={`${thBase} bg-[#1B7A3D] text-center`} colSpan={5}>Processadas ganhas</th>
                  <th className={`${thBase} bg-[#9B2C2C] text-center`} colSpan={5}>Processadas perdidas</th>
                </tr>
                <tr>
                  <th className={`${thSort} bg-[#2E9B55]`} onClick={() => handleSort('ganhas.qtd')}>QTD. <SortIcon sortKey="ganhas.qtd" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#2E9B55]`} onClick={() => handleSort('ganhas.taxa')}>TAXA <SortIcon sortKey="ganhas.taxa" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#2E9B55]`} onClick={() => handleSort('ganhas.lead_time')}>LEAD TIME <SortIcon sortKey="ganhas.lead_time" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#2E9B55]`} onClick={() => handleSort('ganhas.valor')}>VALOR DE P&S <SortIcon sortKey="ganhas.valor" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#2E9B55]`} onClick={() => handleSort('ganhas.ticket_medio')}>TICKET MÉDIO <SortIcon sortKey="ganhas.ticket_medio" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#C53030]`} onClick={() => handleSort('perdidas.qtd')}>QTD. <SortIcon sortKey="perdidas.qtd" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#C53030]`} onClick={() => handleSort('perdidas.taxa')}>TAXA <SortIcon sortKey="perdidas.taxa" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#C53030]`} onClick={() => handleSort('perdidas.lead_time')}>LEAD TIME <SortIcon sortKey="perdidas.lead_time" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#C53030]`} onClick={() => handleSort('perdidas.valor')}>VALOR DE P&S <SortIcon sortKey="perdidas.valor" currentSort={sortKey} currentDir={sortDir} /></th>
                  <th className={`${thSort} bg-[#C53030]`} onClick={() => handleSort('perdidas.ticket_medio')}>TICKET MÉDIO <SortIcon sortKey="perdidas.ticket_medio" currentSort={sortKey} currentDir={sortDir} /></th>
                </tr>
              </thead>
              <tbody>
                {linhasOrdenadas.map((d, i) => {
                  const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  const isExpanded = expandedRows.has(d.chave)
                  const hasSubs = hasSubItens && d.subItens && d.subItens.length > 0

                  return (
                    <React.Fragment key={d.chave}>
                      <tr
                        className={`${rowBg} hover:bg-blue-50/40 transition-colors ${hasSubItens ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-blue-50/60' : ''}`}
                        onClick={hasSubItens ? () => toggleRow(d.chave) : undefined}
                      >
                        <td className={`${tdBase} font-medium text-gray-700 ${hasSubItens ? 'max-w-[200px]' : ''}`}>
                          <span className="inline-flex items-center gap-1">
                            {hasSubItens && (
                              <span className="flex-shrink-0 text-gray-400">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </span>
                            )}
                            <span className={`truncate ${hasSubItens ? 'font-semibold' : ''}`}>
                              {fmtLabel(d.label, agrupamento)}
                            </span>
                            {hasSubs && (
                              <span className="text-[9px] text-gray-400 ml-1 flex-shrink-0">({d.subItens!.length}d)</span>
                            )}
                          </span>
                        </td>
                        {renderDataCells(d)}
                      </tr>
                      {isExpanded && d.subItens && d.subItens.length > 0 && d.subItens.map((sub) => (
                        <tr key={`${d.chave}-sub-${sub.chave}`} className="bg-gray-50/80">
                          <td className={`${tdBase} text-gray-500 pl-8 border-l-2 border-l-blue-300`}>
                            <span className="text-[10px]">{fmtDate(sub.label)}</span>
                          </td>
                          {renderDataCells(sub, true)}
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400">
                  <td className={`${tdTotalBase} text-gray-900`}>TOTAL</td>
                  <td className={`${tdTotalNum} text-gray-900`}>{fmtNum(dados.totais.novas_oportunidades)}</td>
                  <td className={`${tdTotalNum} text-gray-900`}>{fmtNum(dados.totais.processadas_total)}</td>
                  <td className={`${tdTotalNum} text-green-800`}>{fmtNum(dados.totais.ganhas.qtd)}</td>
                  <td className={`${tdTotalNum} text-gray-900`}>{fmtPct(dados.totais.ganhas.taxa)}</td>
                  <td className={`${tdTotalNum} text-gray-900`}>{fmtLeadTime(dados.totais.ganhas.lead_time)}</td>
                  <td className={`${tdTotalNum} text-green-800`}>{fmtCur(dados.totais.ganhas.valor)}</td>
                  <td className={`${tdTotalNum} text-gray-900`}>{fmtCur(dados.totais.ganhas.ticket_medio)}</td>
                  <td className={`${tdTotalNum} text-red-700`}>{fmtNum(dados.totais.perdidas.qtd)}</td>
                  <td className={`${tdTotalNum} text-gray-900`}>{fmtPct(dados.totais.perdidas.taxa)}</td>
                  <td className={`${tdTotalNum} text-gray-900`}>{fmtLeadTime(dados.totais.perdidas.lead_time)}</td>
                  <td className={`${tdTotalNum} text-red-700`}>{fmtCur(dados.totais.perdidas.valor)}</td>
                  <td className={`${tdTotalNum} text-gray-900`}>{fmtCur(dados.totais.perdidas.ticket_medio)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
