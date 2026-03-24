"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import PainelFiltersInline from "@/components/painel/PainelFiltersInline"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ComparativoData {
  data_referencia: string
  mes_referencia: number
  ano_referencia: number
  nome_mes_anterior: string
  nome_mes_atual: string
  periodo: {
    mes_anterior: PeriodStats
    mes_atual: PeriodStats
    crescimento: Crescimento
  }
  meta_mes: {
    meta_valor: number
    real: number
    target: number | null
  }
  periodo_yoy: {
    mesmo_mes_ano_anterior: PeriodStats
    mes_atual: PeriodStats
    crescimento: Crescimento
  }
  acumulado_ano: {
    ano_anterior: PeriodStats
    ano_atual: PeriodStats
    crescimento: Crescimento
  }
  meta_anual: {
    meta_valor: number
    real: number
    target: number | null
    gap_valor: number
  }
  tendencia: {
    ano_anterior_completo: PeriodStats
    tendencia_ano_atual: PeriodStats
    crescimento: Crescimento
  }
}

interface PeriodStats {
  novas_oportunidades: number
  oportunidades_ganhas: number
  valor_vendas: number
}

interface Crescimento {
  novas_oportunidades: number | null
  oportunidades_ganhas: number | null
  valor_vendas: number | null
}

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function CrescimentoBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">-</span>

  const isPositive = value > 0
  const isNeutral = value === 0

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">
        <Minus className="h-3 w-3" />
        0%
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
      isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isPositive ? '+' : ''}{value}%
    </span>
  )
}

function TargetBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">#DIV/0!</span>

  const isPositive = value >= 0

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
      isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      <Target className="h-3 w-3" />
      {isPositive ? '+' : ''}{value}%
    </span>
  )
}

export default function ComparativoVendasPage() {
  const abortControllerRef = useRef<AbortController | null>(null)

  const [mesRef, setMesRef] = useState(() => new Date().getMonth() + 1)
  const [anoRef, setAnoRef] = useState(() => new Date().getFullYear())

  const periodoInicial = useMemo(() => {
    const inicio = new Date(anoRef, mesRef - 1, 1)
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

  const fetchFunis = useCallback(async () => {
    try {
      const response = await fetch('/api/funis')
      const data = await response.json()
      if (data.success && data.funis) setFunis(data.funis)
    } catch { setFunis([]) }
  }, [])

  const fetchGrupos = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/grupos')
      const data = await response.json()
      if (data.success && data.grupos) setGrupos(data.grupos)
    } catch { setGrupos([]) }
  }, [])

  const fetchUnidadesList = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/list')
      const data = await response.json()
      if (data.success && data.unidades) setUnidadesList(data.unidades)
    } catch { setUnidadesList([]) }
  }, [])

  useEffect(() => {
    fetchFunis()
    fetchGrupos()
    fetchUnidadesList()
  }, [fetchFunis, fetchGrupos, fetchUnidadesList])

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
      return selecionadas.length > 0
        ? selecionadas.filter(id => unidadesDoGrupo!.includes(id))
        : unidadesDoGrupo
    }
    return selecionadas
  }, [filtros.unidadesSelecionadas, filtros.gruposSelecionados, grupos])

  const fetchComparativo = useCallback(async (signal: AbortSignal) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('mes', String(mesRef))
      params.set('ano', String(anoRef))

      if (unidadesIdsAplicadas.length > 0) {
        params.set('unidade_id', unidadesIdsAplicadas.join(','))
      }
      if (filtros.funisSelecionados.length > 0) {
        params.set('funil_id', filtros.funisSelecionados.join(','))
      }

      const response = await fetch(`/api/analytics/comparativo-vendas?${params.toString()}`, {
        cache: 'no-store',
        signal
      })

      if (signal.aborted) return

      const data = await response.json()
      if (signal.aborted) return

      if (data.success) {
        setDados(data)
      } else {
        setDados(null)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setDados(null)
    } finally {
      setLoading(false)
    }
  }, [mesRef, anoRef, unidadesIdsAplicadas, filtros.funisSelecionados])

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    fetchComparativo(controller.signal)

    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [fetchComparativo])

  const filtrosAtivos = useMemo(() => {
    return filtros.unidadesSelecionadas.length > 0 ||
      filtros.funisSelecionados.length > 0 ||
      filtros.gruposSelecionados.length > 0
  }, [filtros.unidadesSelecionadas, filtros.funisSelecionados, filtros.gruposSelecionados])

  const anosDisponiveis = useMemo(() => {
    const anoAtual = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i)
  }, [])

  function ComparativoTable({
    labelA, labelB, labelC = 'Var.',
    statsA, statsB, crescimento, accentColor = '#6b7280'
  }: {
    labelA: string, labelB: string, labelC?: string,
    statsA: { novas?: number, ganhas?: number, valor: number },
    statsB: { novas?: number, ganhas?: number, valor: number },
    crescimento?: Crescimento,
    accentColor?: string
  }) {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[36%] bg-gray-50 border-b border-gray-100" />
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">{labelA}</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider border-b" style={{ background: `${accentColor}10`, color: accentColor, borderColor: `${accentColor}20` }}>{labelB}</th>
            <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">{labelC}</th>
          </tr>
        </thead>
        <tbody>
          {statsA.novas !== undefined && statsB.novas !== undefined && (
            <tr className="border-b border-gray-50 group">
              <td className="px-4 py-3 text-xs text-gray-500 font-medium group-hover:bg-gray-50/80 transition-colors">Novas Oport.</td>
              <td className="px-4 py-3 text-right font-mono text-sm text-gray-400 group-hover:bg-gray-50/80 transition-colors">{formatNumber(statsA.novas)}</td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900 group-hover:opacity-90 transition-all" style={{ background: `${accentColor}06` }}>{formatNumber(statsB.novas)}</td>
              <td className="px-4 py-3 text-center group-hover:bg-gray-50/80 transition-colors">
                {crescimento && <CrescimentoBadge value={crescimento.novas_oportunidades} />}
              </td>
            </tr>
          )}
          {statsA.ganhas !== undefined && statsB.ganhas !== undefined && (
            <tr className="border-b border-gray-50 group">
              <td className="px-4 py-3 text-xs text-gray-500 font-medium group-hover:bg-gray-50/80 transition-colors">Oport. Ganhas</td>
              <td className="px-4 py-3 text-right font-mono text-sm text-gray-400 group-hover:bg-gray-50/80 transition-colors">{formatNumber(statsA.ganhas)}</td>
              <td className="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900 group-hover:opacity-90 transition-all" style={{ background: `${accentColor}06` }}>{formatNumber(statsB.ganhas)}</td>
              <td className="px-4 py-3 text-center group-hover:bg-gray-50/80 transition-colors">
                {crescimento && <CrescimentoBadge value={crescimento.oportunidades_ganhas} />}
              </td>
            </tr>
          )}
          <tr className="group">
            <td className="px-4 py-3 text-xs text-gray-500 font-medium group-hover:bg-gray-50/80 transition-colors">Valor Vendas</td>
            <td className="px-4 py-3 text-right font-mono text-sm text-gray-400 group-hover:bg-gray-50/80 transition-colors">{formatCurrency(statsA.valor)}</td>
            <td className="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900 group-hover:opacity-90 transition-all" style={{ background: `${accentColor}06` }}>{formatCurrency(statsB.valor)}</td>
            <td className="px-4 py-3 text-center group-hover:bg-gray-50/80 transition-colors">
              {crescimento && <CrescimentoBadge value={crescimento.valor_vendas} />}
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  return (
    <ProtectedRoute>
      <div className="w-full">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 rounded-xl">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Comparativo de Vendas</h1>
                {dados?.data_referencia && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    <span>Referência: {dados.data_referencia}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={String(mesRef)} onValueChange={(v) => setMesRef(parseInt(v))}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nomesMeses.map((nome, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(anoRef)} onValueChange={(v) => setAnoRef(parseInt(v))}>
              <SelectTrigger className="w-[100px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map(a => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtros */}
        <PainelFiltersInline
          filtros={filtros}
          setFiltros={setFiltros}
          unidadesList={unidadesList}
          funis={funis}
          grupos={grupos}
          periodoInicial={periodoInicial}
          filtrosAtivos={filtrosAtivos}
          showGainDateFilter={false}
        />

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[180px] w-full bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : !dados ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <BarChart3 className="h-10 w-10 opacity-30" />
            <span className="text-sm">Nenhum dado disponível para o período selecionado.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

            {/* SEÇÃO 1: Período Mês */}
            <SectionCard color="#06b6d4" title="Período" subtitle={`${dados.nome_mes_anterior} → ${dados.nome_mes_atual}`}>
              <ComparativoTable
                labelA={dados.nome_mes_anterior} labelB={dados.nome_mes_atual} accentColor="#06b6d4"
                statsA={{ novas: dados.periodo.mes_anterior.novas_oportunidades, ganhas: dados.periodo.mes_anterior.oportunidades_ganhas, valor: dados.periodo.mes_anterior.valor_vendas }}
                statsB={{ novas: dados.periodo.mes_atual.novas_oportunidades, ganhas: dados.periodo.mes_atual.oportunidades_ganhas, valor: dados.periodo.mes_atual.valor_vendas }}
                crescimento={dados.periodo.crescimento}
              />
            </SectionCard>

            {/* SEÇÃO 2: Meta Mês */}
            <SectionCard color="#f59e0b" title="Meta do Mês" subtitle={dados.data_referencia}>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[36%] bg-gray-50 border-b border-gray-100" />
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Meta</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider border-b" style={{ background: '#f59e0b10', color: '#f59e0b', borderColor: '#f59e0b20' }}>Real</th>
                    <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="group">
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">Valor Vendas</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-gray-400">{formatCurrency(dados.meta_mes.meta_valor)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900" style={{ background: '#f59e0b06' }}>{formatCurrency(dados.meta_mes.real)}</td>
                    <td className="px-4 py-3 text-center"><TargetBadge value={dados.meta_mes.target} /></td>
                  </tr>
                </tbody>
              </table>
              {dados.meta_mes.meta_valor > 0 && (
                <MetaBar real={dados.meta_mes.real} meta={dados.meta_mes.meta_valor} />
              )}
            </SectionCard>

            {/* SEÇÃO 3: YoY */}
            <SectionCard color="#64748b" title="Mês — Ano a Ano" subtitle={`${anoRef - 1} vs ${anoRef}`}>
              <ComparativoTable
                labelA={`${nomesMeses[mesRef - 1]?.substring(0, 3).toLowerCase()}/${String(anoRef - 1).slice(-2)}`}
                labelB={dados.nome_mes_atual} accentColor="#64748b"
                statsA={{ novas: dados.periodo_yoy.mesmo_mes_ano_anterior.novas_oportunidades, ganhas: dados.periodo_yoy.mesmo_mes_ano_anterior.oportunidades_ganhas, valor: dados.periodo_yoy.mesmo_mes_ano_anterior.valor_vendas }}
                statsB={{ novas: dados.periodo_yoy.mes_atual.novas_oportunidades, ganhas: dados.periodo_yoy.mes_atual.oportunidades_ganhas, valor: dados.periodo_yoy.mes_atual.valor_vendas }}
                crescimento={dados.periodo_yoy.crescimento}
              />
            </SectionCard>

            {/* SEÇÃO 4: Acumulado Ano */}
            <SectionCard color="#3b82f6" title="Acumulado Ano" subtitle={`Jan–${nomesMeses[mesRef - 1]?.substring(0, 3)}`}>
              <ComparativoTable
                labelA={`Ano ${anoRef - 1}`} labelB={`Ano ${anoRef}`} accentColor="#3b82f6"
                statsA={{ novas: dados.acumulado_ano.ano_anterior.novas_oportunidades, ganhas: dados.acumulado_ano.ano_anterior.oportunidades_ganhas, valor: dados.acumulado_ano.ano_anterior.valor_vendas }}
                statsB={{ novas: dados.acumulado_ano.ano_atual.novas_oportunidades, ganhas: dados.acumulado_ano.ano_atual.oportunidades_ganhas, valor: dados.acumulado_ano.ano_atual.valor_vendas }}
                crescimento={dados.acumulado_ano.crescimento}
              />
            </SectionCard>

            {/* SEÇÃO 5: Meta Anual */}
            <SectionCard color="#10b981" title={`Meta Anual ${anoRef}`} subtitle={`até 31/12/${anoRef}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[36%] bg-gray-50 border-b border-gray-100" />
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Meta</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider border-b" style={{ background: '#10b98110', color: '#10b981', borderColor: '#10b98120' }}>Real</th>
                    <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50 group">
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">Valor Vendas</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-gray-400">{dados.meta_anual.meta_valor > 0 ? formatCurrency(dados.meta_anual.meta_valor) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-gray-900" style={{ background: '#10b98106' }}>{formatCurrency(dados.meta_anual.real)}</td>
                    <td className="px-4 py-3 text-center"><TargetBadge value={dados.meta_anual.target} /></td>
                  </tr>
                  <tr className="group">
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">Gap</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" style={{ background: '#10b98106' }} />
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-bold ${dados.meta_anual.gap_valor >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {dados.meta_anual.gap_valor >= 0 ? '+' : ''}{formatCurrency(dados.meta_anual.gap_valor)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              {dados.meta_anual.meta_valor > 0 && (
                <MetaBar real={dados.meta_anual.real} meta={dados.meta_anual.meta_valor} />
              )}
            </SectionCard>

            {/* SEÇÃO 6: Tendência */}
            <SectionCard color="#8b5cf6" title="Tendência Anual" subtitle={`Projeção ${anoRef}`}>
              <ComparativoTable
                labelA={`Ano ${anoRef - 1}`} labelB={`Tendência ${anoRef}`} accentColor="#8b5cf6"
                statsA={{ novas: dados.tendencia.ano_anterior_completo.novas_oportunidades, ganhas: dados.tendencia.ano_anterior_completo.oportunidades_ganhas, valor: dados.tendencia.ano_anterior_completo.valor_vendas }}
                statsB={{ novas: dados.tendencia.tendencia_ano_atual.novas_oportunidades, ganhas: dados.tendencia.tendencia_ano_atual.oportunidades_ganhas, valor: dados.tendencia.tendencia_ano_atual.valor_vendas }}
                crescimento={dados.tendencia.crescimento}
              />
            </SectionCard>

          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
