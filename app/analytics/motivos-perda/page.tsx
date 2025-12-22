"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import PainelFiltersInline from "@/components/painel/PainelFiltersInline"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface FiltrosType {
  unidadesSelecionadas: number[]
  periodoTipo: string
  periodoInicio: string
  periodoFim: string
  funilSelecionado: string
  grupoSelecionado: string
}

interface MotivoPerda {
  motivo_id: number | null
  motivo: string
  total_oportunidades: number
  valor_total: number
  lost_time: number
}

interface ApiResponse {
  success: boolean
  data?: {
    motivos_perda?: MotivoPerda[]
    totais?: {
      total_oportunidades: number
      valor_total: number
      total_motivos: number
    }
  }
}

export default function MotivosPerdaPage() {
  // Período inicial (mesmo do painel)
  const periodoInicial = useMemo(() => {
    const inicio = new Date()
    const fim = new Date()
    inicio.setDate(1)
    inicio.setHours(0, 0, 0, 0)
    fim.setHours(23, 59, 59, 999)
    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0]
    }
  }, [])
  
  const [filtros, setFiltros] = useState<FiltrosType>({
    unidadesSelecionadas: [],
    periodoTipo: 'este-mes',
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos'
  })
  
  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string; unidadeIds?: number[] }>>([])
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])
  
  // Função para calcular datas baseado no tipo de período
  const calcularPeriodo = useMemo(() => {
    return (tipo: string) => {
      const hoje = new Date()
      const inicio = new Date()
      const fim = new Date()

      switch (tipo) {
        case 'este-mes':
          inicio.setDate(1)
          inicio.setHours(0, 0, 0, 0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'mes-passado':
          inicio.setMonth(hoje.getMonth() - 1, 1)
          inicio.setHours(0, 0, 0, 0)
          fim.setDate(0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'esta-semana':
          const diaSemana = hoje.getDay()
          inicio.setDate(hoje.getDate() - diaSemana)
          inicio.setHours(0, 0, 0, 0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'semana-passada':
          const diaSemanaAtual = hoje.getDay()
          inicio.setDate(hoje.getDate() - diaSemanaAtual - 7)
          inicio.setHours(0, 0, 0, 0)
          fim.setDate(hoje.getDate() - diaSemanaAtual - 1)
          fim.setHours(23, 59, 59, 999)
          break
        case 'este-ano':
          inicio.setMonth(0, 1)
          inicio.setHours(0, 0, 0, 0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'ano-anterior':
          inicio.setFullYear(hoje.getFullYear() - 1, 0, 1)
          inicio.setHours(0, 0, 0, 0)
          fim.setFullYear(hoje.getFullYear() - 1, 11, 31)
          fim.setHours(23, 59, 59, 999)
          break
        default:
          return { inicio: '', fim: '' }
      }

      return {
        inicio: inicio.toISOString().split('T')[0],
        fim: fim.toISOString().split('T')[0]
      }
    }
  }, [])

  const filtrosAtivos = useMemo(() => {
    return filtros.unidadesSelecionadas.length > 0 ||
           filtros.periodoTipo !== 'este-mes' ||
           filtros.funilSelecionado !== 'todos' ||
           filtros.grupoSelecionado !== 'todos'
  }, [filtros])
  
  const [loading, setLoading] = useState(false)
  const [motivosGerais, setMotivosGerais] = useState<MotivoPerda[]>([])
  const [totais, setTotais] = useState({ total_oportunidades: 0, valor_total: 0, total_motivos: 0 })

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  const formatPercent = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100)
  }, [])

  const fetchData = useCallback(async () => {
    if (!filtros.periodoInicio || !filtros.periodoFim) {
      setMotivosGerais([])
      setTotais({ total_oportunidades: 0, valor_total: 0, total_motivos: 0 })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      // Padronizado (igual ranking de vendedores)
      params.append('dataInicio', filtros.periodoInicio)
      params.append('dataFim', filtros.periodoFim)
      
      if (filtros.unidadesSelecionadas.length > 0) {
        params.append('unidades', filtros.unidadesSelecionadas.join(','))
      }

      if (filtros.funilSelecionado && filtros.funilSelecionado !== 'todos') {
        params.append('funil', filtros.funilSelecionado)
      }

      if (filtros.grupoSelecionado && filtros.grupoSelecionado !== 'todos') {
        params.append('grupo', filtros.grupoSelecionado)
      }
      
      const apiUrl = `/api/oportunidades/lost?${params.toString()}`
      
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const result: ApiResponse = await response.json()
      
      if (result.success && result.data) {
        // Processar motivos gerais
        if (result.data.motivos_perda && Array.isArray(result.data.motivos_perda)) {
          setMotivosGerais(result.data.motivos_perda.map((m: any) => ({
            motivo_id: m.motivo_id,
            motivo: m.motivo || 'Sem motivo',
            total_oportunidades: Number(m.total_oportunidades || 0),
            valor_total: Number(m.valor_total || 0),
            lost_time: Number(m.lost_time || 0)
          })))
        } else {
          setMotivosGerais([])
        }

        // Processar totais
        if (result.data.totais) {
          setTotais({
            total_oportunidades: Number(result.data.totais.total_oportunidades || 0),
            valor_total: Number(result.data.totais.valor_total || 0),
            total_motivos: Number(result.data.totais.total_motivos || 0)
          })
        }
      } else {
        setMotivosGerais([])
        setTotais({ total_oportunidades: 0, valor_total: 0, total_motivos: 0 })
      }
    } catch {
      setMotivosGerais([])
      setTotais({ total_oportunidades: 0, valor_total: 0, total_motivos: 0 })
    } finally {
      setLoading(false)
    }
  }, [filtros])

  // Buscar funis, grupos e unidades
  const fetchFunis = useCallback(async () => {
    try {
      const response = await fetch('/api/funis')
      const data = await response.json()
      if (data.success && data.funis) {
        setFunis(data.funis)
      }
    } catch {
      setFunis([])
    }
  }, [])

  const fetchGrupos = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/grupos')
      const data = await response.json()
      if (data.success && data.grupos) {
        setGrupos(data.grupos)
      }
    } catch {
      setGrupos([])
    }
  }, [])

  const fetchUnidadesList = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/list')
      const data = await response.json()
      if (data.success && data.unidades) {
        setUnidadesList(data.unidades)
      }
    } catch {
      setUnidadesList([])
    }
  }, [])

  // Effect: Atualizar período quando o tipo mudar
  useEffect(() => {
    if (filtros.periodoTipo !== 'personalizado') {
      const { inicio, fim } = calcularPeriodo(filtros.periodoTipo)
      if (filtros.periodoInicio !== inicio || filtros.periodoFim !== fim) {
        setFiltros(prev => ({
          ...prev,
          periodoInicio: inicio,
          periodoFim: fim
        }))
      }
    }
  }, [filtros.periodoTipo, filtros.periodoInicio, filtros.periodoFim, calcularPeriodo])

  // Effect: Carregar dados estáticos uma vez
  useEffect(() => {
    fetchFunis()
    fetchGrupos()
    fetchUnidadesList()
  }, [fetchFunis, fetchGrupos, fetchUnidadesList])

  // Carregar dados automaticamente quando filtros de período mudarem
  useEffect(() => {
    if (filtros.periodoInicio && filtros.periodoFim) {
      fetchData()
    }
  }, [
    filtros.periodoInicio,
    filtros.periodoFim,
    filtros.unidadesSelecionadas,
    filtros.funilSelecionado,
    filtros.grupoSelecionado,
    fetchData
  ])

  const totalGeralOportunidades = useMemo(() => {
    return totais.total_oportunidades || motivosGerais.reduce((sum, m) => sum + m.total_oportunidades, 0)
  }, [totais, motivosGerais])

  const totalGeralValor = useMemo(() => {
    return totais.valor_total || motivosGerais.reduce((sum, m) => sum + m.valor_total, 0)
  }, [totais, motivosGerais])

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    return motivosGerais
      .sort((a, b) => b.total_oportunidades - a.total_oportunidades)
      .slice(0, 15) // Limitar a 15 motivos no gráfico
      .map((m) => ({
        motivo: m.motivo.length > 35 ? m.motivo.slice(0, 35) + '...' : m.motivo,
        motivoFull: m.motivo,
        quantidade: m.total_oportunidades,
        valor: m.valor_total,
        valorLabel: m.valor_total > 0 ? formatCurrency(m.valor_total) : 'R$ 0',
        percentual: totalGeralOportunidades > 0
          ? ((m.total_oportunidades / totalGeralOportunidades) * 100).toFixed(1)
          : '0.0',
      }))
  }, [motivosGerais, totalGeralOportunidades])

  // Cores do gráfico - gradiente de vermelho
  const barColors = [
    '#dc2626', '#e53e3e', '#ef4444', '#f56565', '#f87171',
    '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2', '#fff5f5',
    '#dc2626', '#e53e3e', '#ef4444', '#f56565', '#f87171'
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Cabeçalho */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Motivos de perda
              </h1>
              <p className="text-sm text-muted-foreground">
                Entenda os principais motivos de perda no período selecionado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filtrosAtivos ? (
                <Badge variant="secondary" className="font-medium">
                  Filtros ativos
                </Badge>
              ) : (
                <Badge variant="outline" className="font-medium">
                  Sem filtros
                </Badge>
              )}

              <Badge variant="outline" className="font-medium tabular-nums">
                {loading ? "Atualizando..." : `${totalGeralOportunidades} perdas`}
              </Badge>
            </div>
          </div>

          <div className="mt-4">
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
          </div>

          {/* Resumo */}
          <div className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Resumo
                </CardTitle>
                <CardDescription>
                  Totais do período e leitura rápida dos resultados.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">Qtd. de perdas</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {loading ? <Skeleton className="h-8 w-24" /> : totalGeralOportunidades.toLocaleString("pt-BR")}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">Valor (P&amp;S)</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {loading ? <Skeleton className="h-8 w-40" /> : formatCurrency(totalGeralValor)}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs text-muted-foreground">Motivos distintos</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {loading ? <Skeleton className="h-8 w-16" /> : motivosGerais.length.toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <p className="text-xs text-muted-foreground">
                  Observação: “Valor de P&amp;S / Ticket de P&amp;S” usam o campo <span className="font-medium">`oportunidades.value`</span>.
                  Campos de MRR não aparecem no schema atual da tabela.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 space-y-6">
            {/* Gráfico */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Distribuição por motivo
                    </CardTitle>
                    <CardDescription>
                      Top {chartData.length} motivos por quantidade (com valor total em tooltip).
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="w-fit tabular-nums">
                    {loading ? "Carregando" : `Top ${chartData.length}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-[320px] w-full" />
                  </div>
                ) : chartData.length > 0 ? (
                  <div className="h-[420px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 8, right: 140, left: 16, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={{ stroke: "hsl(var(--border))" }}
                          tickLine={{ stroke: "hsl(var(--border))" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="motivo"
                          width={240}
                          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                          axisLine={{ stroke: "hsl(var(--border))" }}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "10px",
                            boxShadow: "0 10px 20px -12px rgba(0,0,0,0.35)",
                            fontSize: "12px",
                          }}
                          formatter={(value, _name, props) => {
                            const payload = props?.payload as { percentual?: string; valor?: number } | undefined
                            const percentual = payload?.percentual || "0"
                            const valor = payload?.valor || 0
                            return [`${value} ops (${percentual}%) • ${formatCurrency(valor)}`, "Perdas"]
                          }}
                          labelFormatter={(label, payload) => {
                            const item = payload?.[0]?.payload as { motivoFull?: string } | undefined
                            return item?.motivoFull || String(label)
                          }}
                        />
                        <Bar dataKey="quantidade" radius={[0, 6, 6, 0]} maxBarSize={34}>
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                          ))}
                          <LabelList
                            dataKey="valorLabel"
                            position="right"
                            fill="hsl(var(--muted-foreground))"
                            fontSize={11}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-10 text-sm text-muted-foreground">
                    Nenhum dado para gerar o gráfico.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabela */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Tabela detalhada</CardTitle>
                    <CardDescription>
                      Ordenação visual e leitura rápida (números com alinhamento tabular).
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="w-fit tabular-nums">
                    {loading ? "Carregando" : `${motivosGerais.length} linhas`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : motivosGerais.length > 0 ? (
                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-left">
                            <span className="text-xs font-semibold text-muted-foreground">Motivo</span>
                          </TableHead>
                          <TableHead className="text-right whitespace-nowrap tabular-nums">
                            <span className="text-xs font-semibold text-muted-foreground">Qtd.</span>
                          </TableHead>
                          <TableHead className="text-center whitespace-nowrap">
                            <span className="text-xs font-semibold text-muted-foreground">Taxa</span>
                          </TableHead>
                          <TableHead className="text-right whitespace-nowrap tabular-nums">
                            <span className="text-xs font-semibold text-muted-foreground">Lead time</span>
                          </TableHead>
                          <TableHead className="text-right whitespace-nowrap tabular-nums">
                            <span className="text-xs font-semibold text-muted-foreground">Valor de P&amp;S</span>
                          </TableHead>
                          <TableHead className="text-right whitespace-nowrap tabular-nums">
                            <span className="text-xs font-semibold text-muted-foreground">Ticket de P&amp;S</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {motivosGerais.map((motivo, idx) => {
                          const taxa =
                            totalGeralOportunidades > 0
                              ? (motivo.total_oportunidades / totalGeralOportunidades) * 100
                              : 0

                          const ticketPS =
                            motivo.total_oportunidades > 0 && motivo.valor_total > 0
                              ? motivo.valor_total / motivo.total_oportunidades
                              : 0

                          return (
                            <TableRow
                              key={motivo.motivo_id || `motivo-${idx}`}
                              className={[
                                idx % 2 === 0 ? "bg-muted/20" : "",
                                "hover:bg-muted/40"
                              ].join(" ")}
                            >
                              <TableCell className="py-2 px-3">
                                <div className="text-sm font-medium text-foreground whitespace-normal break-words" title={motivo.motivo}>
                                  {motivo.motivo}
                                </div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-semibold whitespace-nowrap">
                                {motivo.total_oportunidades.toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <span className="inline-flex items-center rounded-md bg-red-500/10 text-red-600 px-2 py-1 text-xs font-medium tabular-nums">
                                  {formatPercent(taxa)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                                {motivo.lost_time}d
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                                {motivo.valor_total > 0 ? formatCurrency(motivo.valor_total) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-right tabular-nums whitespace-nowrap">
                                {ticketPS > 0 ? formatCurrency(ticketPS) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-card p-10 text-center">
                    <TrendingDown className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium">Nenhum motivo de perda encontrado</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Não há oportunidades perdidas no período selecionado.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
