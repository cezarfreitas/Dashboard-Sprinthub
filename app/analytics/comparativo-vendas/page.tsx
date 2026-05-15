"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import PainelFiltersInline from "@/components/painel/PainelFiltersInline"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart3, Calendar, TrendingUp, TrendingDown, DollarSign,
  Target, Clock, AlertTriangle, ShieldCheck, Percent, Download, Loader2
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

// ─── Tipos ───────────────────────────────────────────────

interface FullStats {
  novas_oportunidades: number
  oportunidades_ganhas: number
  valor_vendas: number
  oportunidades_perdidas: number
  valor_perdido: number
  oportunidades_abertas: number
  valor_aberto: number
  ticket_medio: number
  taxa_conversao: number
  tempo_medio_ganho: number | null
  tempo_medio_perda: number | null
}

interface CrescimentoFull {
  novas_oportunidades: number | null
  oportunidades_ganhas: number | null
  valor_vendas: number | null
  oportunidades_perdidas: number | null
  valor_perdido: number | null
  ticket_medio: number | null
  taxa_conversao: number | null
}

interface MotivoPerda {
  motivo: string
  quantidade: number
  valor_perdido: number
}

interface ComparativoData {
  data_referencia: string
  mes_referencia: number
  ano_referencia: number
  nome_mes_anterior: string
  nome_mes_atual: string
  periodo: { mes_anterior: FullStats; mes_atual: FullStats; crescimento: CrescimentoFull }
  meta_mes: { meta_valor: number; real: number; target: number | null }
  periodo_yoy: { mesmo_mes_ano_anterior: FullStats; mes_atual: FullStats; crescimento: CrescimentoFull }
  acumulado_ano: { ano_anterior: FullStats; ano_atual: FullStats; crescimento: CrescimentoFull }
  meta_anual: { meta_valor: number; real: number; target: number | null; gap_valor: number }
  tendencia: { ano_anterior_completo: FullStats; tendencia_ano_atual: FullStats; crescimento: CrescimentoFull }
  top_motivos_perda: MotivoPerda[]
  indicadores_mes_atual: {
    ticket_medio: number
    taxa_conversao: number
    tempo_medio_ganho: number | null
    tempo_medio_perda: number | null
    pipeline_aberto: { quantidade: number; valor: number }
  }
}

// ─── Helpers ─────────────────────────────────────────────

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function fmtCur(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function fmtNum(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`
}

// ─── Componentes auxiliares ──────────────────────────────

function CrescimentoCell({ value, isTaxaDiff }: { value: number | null; isTaxaDiff?: boolean }) {
  if (value === null) return <td className="px-3 py-2 text-center text-sm text-gray-400 border border-gray-200">-</td>

  const isPositive = value > 0
  const isNegative = value < 0
  const suffix = isTaxaDiff ? 'p.p.' : '%'

  return (
    <td className={`px-3 py-2 text-center text-sm font-semibold border border-gray-200 ${
      isPositive ? 'bg-green-100 text-green-800' : isNegative ? 'bg-red-100 text-red-700' : 'text-gray-600'
    }`}>
      {isTaxaDiff ? (value > 0 ? '+' : '') : ''}{isTaxaDiff ? value.toFixed(1) : value}{suffix}
    </td>
  )
}

function CrescimentoCellInverted({ value }: { value: number | null }) {
  if (value === null) return <td className="px-3 py-2 text-center text-sm text-gray-400 border border-gray-200">-</td>

  const isPositive = value > 0
  const isNegative = value < 0

  return (
    <td className={`px-3 py-2 text-center text-sm font-semibold border border-gray-200 ${
      isNegative ? 'bg-green-100 text-green-800' : isPositive ? 'bg-red-100 text-red-700' : 'text-gray-600'
    }`}>
      {value}%
    </td>
  )
}

function TargetCell({ value }: { value: number | null }) {
  if (value === null) {
    return <td className="px-3 py-2 text-center text-sm font-semibold bg-green-100 text-green-800 border border-gray-200">#DIV/0!</td>
  }
  return (
    <td className={`px-3 py-2 text-center text-sm font-semibold border border-gray-200 ${value >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
      {value}%
    </td>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: color + '18' }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Tabela genérica ─────────────────────────────────────

function ComparativoSection({ bgHeader, bgCols, title, colA, colB, colC, statsA, statsB, crescimento, showPerdidas }: {
  bgHeader: string
  bgCols: string
  title: string
  colA: string
  colB: string
  colC: string
  statsA: FullStats
  statsB: FullStats
  crescimento: CrescimentoFull
  showPerdidas?: boolean
}) {
  const cell = "px-3 py-2 text-sm border border-gray-200"

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 text-xs font-bold text-white uppercase border" style={{ backgroundColor: bgHeader, borderColor: bgHeader, width: '30%' }}>{title}</th>
            <th className="text-center px-3 py-2 text-xs font-bold text-white border" style={{ backgroundColor: bgCols, borderColor: bgCols, width: '22%' }}>{colA}</th>
            <th className="text-center px-3 py-2 text-xs font-bold text-white border" style={{ backgroundColor: bgCols, borderColor: bgCols, width: '22%' }}>{colB}</th>
            <th className="text-center px-3 py-2 text-xs font-bold text-white border" style={{ backgroundColor: bgCols, borderColor: bgCols, width: '26%' }}>{colC}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${cell} font-medium text-gray-800 bg-white`}>NOVAS OPORTUNIDADES</td>
            <td className={`${cell} text-center font-mono bg-white`}>{fmtNum(statsA.novas_oportunidades)}</td>
            <td className={`${cell} text-center font-mono bg-white`}>{fmtNum(statsB.novas_oportunidades)}</td>
            <CrescimentoCell value={crescimento.novas_oportunidades} />
          </tr>
          <tr>
            <td className={`${cell} font-medium text-gray-800 bg-white`}>OPORTUNIDADES GANHAS</td>
            <td className={`${cell} text-center font-mono bg-white`}>{fmtNum(statsA.oportunidades_ganhas)}</td>
            <td className={`${cell} text-center font-mono bg-white`}>{fmtNum(statsB.oportunidades_ganhas)}</td>
            <CrescimentoCell value={crescimento.oportunidades_ganhas} />
          </tr>
          <tr>
            <td className={`${cell} font-medium text-gray-800 bg-white`}>VALOR DE VENDAS</td>
            <td className={`${cell} text-center font-mono bg-white`}>{fmtCur(statsA.valor_vendas)}</td>
            <td className={`${cell} text-center font-mono bg-white`}>{fmtCur(statsB.valor_vendas)}</td>
            <CrescimentoCell value={crescimento.valor_vendas} />
          </tr>
          {showPerdidas && (
            <>
              <tr>
                <td className={`${cell} font-medium text-gray-800 bg-gray-50`}>OPORTUNIDADES PERDIDAS</td>
                <td className={`${cell} text-center font-mono bg-gray-50`}>{fmtNum(statsA.oportunidades_perdidas)}</td>
                <td className={`${cell} text-center font-mono bg-gray-50`}>{fmtNum(statsB.oportunidades_perdidas)}</td>
                <CrescimentoCellInverted value={crescimento.oportunidades_perdidas} />
              </tr>
              <tr>
                <td className={`${cell} font-medium text-gray-800 bg-gray-50`}>VALOR PERDIDO</td>
                <td className={`${cell} text-center font-mono bg-gray-50`}>{fmtCur(statsA.valor_perdido)}</td>
                <td className={`${cell} text-center font-mono bg-gray-50`}>{fmtCur(statsB.valor_perdido)}</td>
                <CrescimentoCellInverted value={crescimento.valor_perdido} />
              </tr>
              <tr>
                <td className={`${cell} font-medium text-gray-800 bg-white`}>TICKET MÉDIO</td>
                <td className={`${cell} text-center font-mono bg-white`}>{fmtCur(statsA.ticket_medio)}</td>
                <td className={`${cell} text-center font-mono bg-white`}>{fmtCur(statsB.ticket_medio)}</td>
                <CrescimentoCell value={crescimento.ticket_medio} />
              </tr>
              <tr>
                <td className={`${cell} font-medium text-gray-800 bg-white`}>TAXA DE CONVERSÃO</td>
                <td className={`${cell} text-center font-mono bg-white`}>{fmtPct(statsA.taxa_conversao)}</td>
                <td className={`${cell} text-center font-mono bg-white`}>{fmtPct(statsB.taxa_conversao)}</td>
                <CrescimentoCell value={crescimento.taxa_conversao} isTaxaDiff />
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────

export default function ComparativoVendasPage() {
  const abortControllerRef = useRef<AbortController | null>(null)

  const [mesRef, setMesRef] = useState(() => new Date().getMonth() + 1)
  const [anoRef, setAnoRef] = useState(() => new Date().getFullYear())
  const [mostrarDetalhes, setMostrarDetalhes] = useState(true)

  const periodoInicial = useMemo(() => {
    const fim = new Date(anoRef, mesRef, 0)
    return {
      inicio: `${anoRef}-${String(mesRef).padStart(2, '0')}-01`,
      fim: `${anoRef}-${String(mesRef).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`
    }
  }, [mesRef, anoRef])

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
  const [dados, setDados] = useState<ComparativoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchFunis = useCallback(async () => {
    try { const r = await fetch('/api/funis'); const d = await r.json(); if (d.success && d.funis) setFunis(d.funis) } catch { setFunis([]) }
  }, [])
  const fetchGrupos = useCallback(async () => {
    try { const r = await fetch('/api/unidades/grupos'); const d = await r.json(); if (d.success && d.grupos) setGrupos(d.grupos) } catch { setGrupos([]) }
  }, [])
  const fetchUnidadesList = useCallback(async () => {
    try { const r = await fetch('/api/unidades/list'); const d = await r.json(); if (d.success && d.unidades) setUnidadesList(d.unidades) } catch { setUnidadesList([]) }
  }, [])

  useEffect(() => { fetchFunis(); fetchGrupos(); fetchUnidadesList() }, [fetchFunis, fetchGrupos, fetchUnidadesList])

  const unidadesIdsAplicadas = useMemo(() => {
    let unidadesDoGrupo: number[] | null = null
    if (filtros.gruposSelecionados.length > 0) {
      unidadesDoGrupo = filtros.gruposSelecionados.flatMap(grupoId => {
        const grupo = grupos.find(g => Number(g.id) === grupoId)
        return grupo?.unidadeIds || []
      })
    }
    const selecionadas = filtros.unidadesSelecionadas || []
    if (unidadesDoGrupo) {
      return selecionadas.length > 0 ? selecionadas.filter(id => unidadesDoGrupo!.includes(id)) : unidadesDoGrupo
    }
    return selecionadas
  }, [filtros.unidadesSelecionadas, filtros.gruposSelecionados, grupos])

  const handleExport = useCallback(async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      params.set('mes', String(mesRef))
      params.set('ano', String(anoRef))
      if (unidadesIdsAplicadas.length > 0) params.set('unidade_id', unidadesIdsAplicadas.join(','))
      if (filtros.funisSelecionados.length > 0) params.set('funil_id', filtros.funisSelecionados.join(','))

      const res = await fetch(`/api/analytics/comparativo-vendas/export?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Falha ao exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comparativo-vendas_${anoRef}-${String(mesRef).padStart(2, '0')}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Erro ao exportar arquivo.')
    } finally {
      setExporting(false)
    }
  }, [mesRef, anoRef, unidadesIdsAplicadas, filtros.funisSelecionados])

  const fetchComparativo = useCallback(async (signal: AbortSignal) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('mes', String(mesRef))
      params.set('ano', String(anoRef))
      if (unidadesIdsAplicadas.length > 0) params.set('unidade_id', unidadesIdsAplicadas.join(','))
      if (filtros.funisSelecionados.length > 0) params.set('funil_id', filtros.funisSelecionados.join(','))

      const response = await fetch(`/api/analytics/comparativo-vendas?${params.toString()}`, { cache: 'no-store', signal })
      if (signal.aborted) return
      const data = await response.json()
      if (signal.aborted) return
      setDados(data.success ? data : null)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setDados(null)
    } finally { setLoading(false) }
  }, [mesRef, anoRef, unidadesIdsAplicadas, filtros.funisSelecionados])

  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    fetchComparativo(controller.signal)
    return () => { controller.abort(); abortControllerRef.current = null }
  }, [fetchComparativo])

  const filtrosAtivos = useMemo(() => {
    return filtros.unidadesSelecionadas.length > 0 || filtros.funisSelecionados.length > 0 || filtros.gruposSelecionados.length > 0
  }, [filtros.unidadesSelecionadas, filtros.funisSelecionados, filtros.gruposSelecionados])

  const anosDisponiveis = useMemo(() => {
    const a = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => a - 2 + i)
  }, [])

  const mesAbrev = (m: number, a: number) => `${nomesMeses[m - 1]?.substring(0, 3).toLowerCase()}/${String(a).slice(-2)}`

  const cell = "px-3 py-2 text-sm border border-gray-200"

  return (
    <ProtectedRoute>
      <div className="w-full max-w-[1400px] mx-auto">

        {/* ─── Cabeçalho ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Comparativo de Vendas</h1>
                {dados?.data_referencia && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    <span>{dados.data_referencia}/{dados.ano_referencia}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || loading || !dados}
              className="h-9 px-3 text-xs gap-1.5"
              title="Exportar para Excel (XLSX) com dados formatados e oportunidades brutas"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Exportar
            </Button>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={mostrarDetalhes} onChange={e => setMostrarDetalhes(e.target.checked)} className="rounded border-gray-300" />
              Detalhes (perdidas, ticket, conversão)
            </label>
            <Select value={String(mesRef)} onValueChange={(v) => setMesRef(parseInt(v))}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{nomesMeses.map((nome, i) => <SelectItem key={i + 1} value={String(i + 1)}>{nome}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(anoRef)} onValueChange={(v) => setAnoRef(parseInt(v))}>
              <SelectTrigger className="w-[100px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{anosDisponiveis.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* ─── Filtros ─── */}
        <PainelFiltersInline
          filtros={filtros} setFiltros={setFiltros} unidadesList={unidadesList}
          funis={funis} grupos={grupos} periodoInicial={periodoInicial}
          filtrosAtivos={filtrosAtivos} showGainDateFilter={false}
        />

        {loading ? (
          <div className="space-y-4 mt-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[140px] w-full bg-gray-100 rounded" />)}
          </div>
        ) : !dados ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <BarChart3 className="h-10 w-10 opacity-30" />
            <span className="text-sm">Nenhum dado disponível para o período selecionado.</span>
          </div>
        ) : (
          <div className="space-y-5 mt-4">

            {/* ═══ KPIs RESUMO DO MÊS ATUAL ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard icon={TrendingUp} label="Vendas no Mês" value={fmtCur(dados.periodo.mes_atual.valor_vendas)} sub={`${fmtNum(dados.periodo.mes_atual.oportunidades_ganhas)} ganhas`} color="#22c55e" />
              <KpiCard icon={TrendingDown} label="Perdidas no Mês" value={fmtCur(dados.periodo.mes_atual.valor_perdido)} sub={`${fmtNum(dados.periodo.mes_atual.oportunidades_perdidas)} perdidas`} color="#ef4444" />
              <KpiCard icon={DollarSign} label="Ticket Médio" value={fmtCur(dados.indicadores_mes_atual.ticket_medio)} color="#8b5cf6" />
              <KpiCard icon={Percent} label="Taxa Conversão" value={fmtPct(dados.indicadores_mes_atual.taxa_conversao)} color="#06b6d4" />
              <KpiCard icon={Clock} label="Tempo Médio Ganho" value={dados.indicadores_mes_atual.tempo_medio_ganho != null ? `${dados.indicadores_mes_atual.tempo_medio_ganho} dias` : '-'} color="#f59e0b" />
              <KpiCard icon={ShieldCheck} label="Pipeline Aberto" value={fmtCur(dados.indicadores_mes_atual.pipeline_aberto.valor)} sub={`${fmtNum(dados.indicadores_mes_atual.pipeline_aberto.quantidade)} abertas`} color="#3b82f6" />
            </div>

            {/* ═══ SEÇÃO 1: PERÍODO (mês anterior vs mês atual) ═══ */}
            <ComparativoSection
              bgHeader="#2E86AB" bgCols="#4A9EBF" title="PERÍODO"
              colA={dados.nome_mes_anterior} colB={dados.nome_mes_atual} colC="Crescimento"
              statsA={dados.periodo.mes_anterior} statsB={dados.periodo.mes_atual}
              crescimento={dados.periodo.crescimento} showPerdidas={mostrarDetalhes}
            />

            {/* ═══ SEÇÃO 2: META MÊS ═══ */}
            <div className="border border-gray-300 rounded overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-bold text-white uppercase bg-[#D4A017] border border-[#D4A017] w-[30%]">META MÊS - {dados.data_referencia}</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-white bg-[#D4B44A] border border-[#D4B44A] w-[22%]">{dados.nome_mes_atual}</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-white bg-[#D4B44A] border border-[#D4B44A] w-[22%]">{dados.nome_mes_atual}</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-white bg-[#D4B44A] border border-[#D4B44A] w-[26%]">TARGET</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${cell} font-medium text-gray-800 bg-white`}>VALOR DE VENDAS</td>
                    <td className={`${cell} text-center font-mono bg-white`}>{dados.meta_mes.meta_valor > 0 ? fmtCur(dados.meta_mes.meta_valor) : 'R$ -'}</td>
                    <td className={`${cell} text-center font-mono bg-white`}>{fmtCur(dados.meta_mes.real)}</td>
                    <TargetCell value={dados.meta_mes.target} />
                  </tr>
                </tbody>
              </table>
              {dados.meta_mes.meta_valor > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Progresso</span>
                    <span className="text-xs font-bold" style={{ color: (dados.meta_mes.real / dados.meta_mes.meta_valor) >= 1 ? '#22c55e' : (dados.meta_mes.real / dados.meta_mes.meta_valor) >= 0.7 ? '#f59e0b' : '#ef4444' }}>
                      {((dados.meta_mes.real / dados.meta_mes.meta_valor) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min((dados.meta_mes.real / dados.meta_mes.meta_valor) * 100, 100)}%`,
                      backgroundColor: (dados.meta_mes.real / dados.meta_mes.meta_valor) >= 1 ? '#22c55e' : (dados.meta_mes.real / dados.meta_mes.meta_valor) >= 0.7 ? '#f59e0b' : '#ef4444'
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* ═══ SEÇÃO 3: PERÍODO YoY ═══ */}
            <ComparativoSection
              bgHeader="#4A6FA5" bgCols="#6B8FBF" title={`PERÍODO - MÊS ${anoRef - 1} X MÊS ${anoRef}`}
              colA={mesAbrev(mesRef, anoRef - 1)} colB={dados.nome_mes_atual} colC="Crescimento"
              statsA={dados.periodo_yoy.mesmo_mes_ano_anterior} statsB={dados.periodo_yoy.mes_atual}
              crescimento={dados.periodo_yoy.crescimento} showPerdidas={mostrarDetalhes}
            />

            {/* ═══ SEÇÃO 4: ACUMULADO ANO ═══ */}
            <ComparativoSection
              bgHeader="#2E5984" bgCols="#4A7BA8" title="PERÍODO ACUMULADO ANO"
              colA={`ANO ${anoRef - 1}`} colB={`ANO ${anoRef}`} colC="Crescimento"
              statsA={dados.acumulado_ano.ano_anterior} statsB={dados.acumulado_ano.ano_atual}
              crescimento={dados.acumulado_ano.crescimento} showPerdidas={mostrarDetalhes}
            />

            {/* ═══ SEÇÃO 5: META ANUAL ═══ */}
            <div className="border border-gray-300 rounded overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-bold text-white uppercase bg-[#1B7A3D] border border-[#1B7A3D] w-[30%]">META</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-white bg-[#2E9B55] border border-[#2E9B55] w-[22%]">META {anoRef} até 31/12</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-white bg-[#2E9B55] border border-[#2E9B55] w-[22%]">REAL</th>
                    <th className="text-center px-3 py-2 text-xs font-bold text-white bg-[#2E9B55] border border-[#2E9B55] w-[26%]">TARGET</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${cell} font-medium text-gray-800 bg-white`}>VALOR DE VENDAS</td>
                    <td className={`${cell} text-center font-mono bg-white`}>{dados.meta_anual.meta_valor > 0 ? fmtCur(dados.meta_anual.meta_valor) : 'R$ -'}</td>
                    <td className={`${cell} text-center font-mono bg-white`}>{fmtCur(dados.meta_anual.real)}</td>
                    <TargetCell value={dados.meta_anual.target} />
                  </tr>
                  <tr>
                    <td className={`${cell} font-medium text-gray-800 bg-white`}>GAP VALOR</td>
                    <td className={`${cell} text-center font-mono bg-white`}>R$</td>
                    <td className={`${cell} bg-white`}></td>
                    <td className={`${cell} text-center font-mono font-semibold bg-white`}>{fmtCur(Math.abs(dados.meta_anual.gap_valor)).replace('R$', '').trim()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ═══ SEÇÃO 6: TENDÊNCIA ═══ */}
            <ComparativoSection
              bgHeader="#2E5984" bgCols="#4A7BA8" title="PERÍODO"
              colA={`ANO ${anoRef - 1}`} colB={`TENDÊNCIA ${anoRef}`} colC="Crescimento"
              statsA={dados.tendencia.ano_anterior_completo} statsB={dados.tendencia.tendencia_ano_atual}
              crescimento={dados.tendencia.crescimento} showPerdidas={mostrarDetalhes}
            />

            {/* ═══ SEÇÃO 7: TOP MOTIVOS DE PERDA ═══ */}
            {dados.top_motivos_perda && dados.top_motivos_perda.length > 0 && (
              <div className="border border-gray-300 rounded overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-bold text-white uppercase bg-[#9B2C2C] border border-[#9B2C2C]" colSpan={4}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          TOP MOTIVOS DE PERDA - {dados.nome_mes_atual}
                        </div>
                      </th>
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 w-[40%]">Motivo</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 w-[20%]">Quantidade</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 w-[25%]">Valor Perdido</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 w-[15%]">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.top_motivos_perda.map((motivo, i) => {
                      const totalPerdidas = dados.periodo.mes_atual.oportunidades_perdidas
                      const pct = totalPerdidas > 0 ? ((motivo.quantidade / totalPerdidas) * 100).toFixed(1) : '0'
                      return (
                        <tr key={i}>
                          <td className={`${cell} font-medium text-gray-800 bg-white`}>{motivo.motivo}</td>
                          <td className={`${cell} text-center font-mono bg-white`}>{fmtNum(motivo.quantidade)}</td>
                          <td className={`${cell} text-center font-mono bg-white text-red-600`}>{fmtCur(motivo.valor_perdido)}</td>
                          <td className={`${cell} text-center font-mono bg-white`}>{pct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
