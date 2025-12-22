"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import PainelFiltersInline from "@/components/painel/PainelFiltersInline"
import { PainelUnidadesGrid } from "@/components/painel/PainelUnidadesGrid"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Calendar } from "lucide-react"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts'

interface AcumuladoDiario {
  dia: number
  data: string
  valor_acumulado: number
  quantidade_acumulada: number
}

export default function AcumuladoMesPage() {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [exporting, setExporting] = useState(false)

  // Período inicial (mês atual)
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

  const [filtros, setFiltros] = useState(() => ({
    unidadesSelecionadas: [] as number[],
    periodoTipo: 'este-mes' as string,
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos',
    gainDateInicio: undefined as string | undefined,
    gainDateFim: undefined as string | undefined
  }))

  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string; unidadeIds?: number[] }>>([])
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])
  const [dadosAcumulados, setDadosAcumulados] = useState<AcumuladoDiario[]>([])
  const [loadingGrafico, setLoadingGrafico] = useState(true)

  const { mesAtual, anoAtual } = useMemo(() => {
    const dataAtual = new Date()
    return {
      mesAtual: dataAtual.getMonth() + 1,
      anoAtual: dataAtual.getFullYear()
    }
  }, [])

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

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

  // Buscar dados acumulados dia a dia
  const fetchDadosAcumulados = useCallback(async (signal: AbortSignal) => {
    try {
      setLoadingGrafico(true)

      const periodoInicio = filtros.periodoInicio || periodoInicial.inicio
      const periodoFim = filtros.periodoFim || periodoInicial.fim

      const unidadesParam = filtros.unidadesSelecionadas.length > 0
        ? `&unidade_id=${filtros.unidadesSelecionadas.join(',')}`
        : ''

      // Buscar dados de ganhas dia a dia
      const response = await fetch(
        `/api/oportunidades/diaria?tipo=ganhas&data_inicio=${periodoInicio}&data_fim=${periodoFim}${unidadesParam}`,
        { cache: 'no-store', signal }
      )

      if (signal.aborted) return

      const data = await response.json()

      if (signal.aborted) return

      if (data.success && data.dados) {
        // Calcular acumulado
        let valorAcumulado = 0
        let quantidadeAcumulada = 0

        const dadosComAcumulado = data.dados.map((item: any) => {
          valorAcumulado += Number(item.valor_total || 0)
          quantidadeAcumulada += Number(item.total || 0)

          return {
            dia: item.dia,
            data: item.data,
            valor_acumulado: valorAcumulado,
            quantidade_acumulada: quantidadeAcumulada
          }
        })

        setDadosAcumulados(dadosComAcumulado)
      } else {
        setDadosAcumulados([])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setDadosAcumulados([])
    } finally {
      setLoadingGrafico(false)
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas, periodoInicial])

  const fetchFunis = useCallback(async () => {
    try {
      const response = await fetch('/api/funis')
      const data = await response.json()
      if (data.success && data.funis) {
        setFunis(data.funis)
      }
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      setUnidadesList([])
    }
  }, [])

  // Effect 1: Atualizar período quando o tipo mudar
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

  // Effect 2: Carregar dados estáticos uma vez
  useEffect(() => {
    fetchFunis()
    fetchGrupos()
    fetchUnidadesList()
  }, [fetchFunis, fetchGrupos, fetchUnidadesList])

  // Effect 3: Carregar dados do gráfico quando filtros mudarem
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    if (!filtros.periodoInicio || !filtros.periodoFim) {
      return
    }

    fetchDadosAcumulados(controller.signal)

    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas.join(','), fetchDadosAcumulados])

  const periodoLabel = useMemo(() => {
    if (filtros.periodoInicio && filtros.periodoFim) {
      const inicio = new Date(filtros.periodoInicio + 'T00:00:00')
      const fim = new Date(filtros.periodoFim + 'T00:00:00')
      return `${inicio.toLocaleDateString('pt-BR')} - ${fim.toLocaleDateString('pt-BR')}`
    }
    return 'Período não definido'
  }, [filtros.periodoInicio, filtros.periodoFim])

  // Aplicar filtro de grupo sobre as unidades selecionadas
  const filtrosParaGrid = useMemo(() => {
    const grupoSelecionadoId =
      filtros.grupoSelecionado && filtros.grupoSelecionado !== 'todos' && filtros.grupoSelecionado !== 'undefined'
        ? Number(filtros.grupoSelecionado)
        : null

    const unidadesDoGrupo =
      grupoSelecionadoId != null
        ? (grupos.find(g => Number(g.id) === grupoSelecionadoId)?.unidadeIds || [])
        : null

    const unidadesSelecionadas = filtros.unidadesSelecionadas || []

    const unidadesIdsAplicadas =
      unidadesDoGrupo
        ? (unidadesSelecionadas.length > 0
            ? unidadesSelecionadas.filter(id => unidadesDoGrupo.includes(id))
            : unidadesDoGrupo)
        : unidadesSelecionadas

    return {
      ...filtros,
      unidadesSelecionadas: unidadesIdsAplicadas
    }
  }, [filtros, grupos])

  // Valor total acumulado (último valor do array)
  const totalAcumulado = useMemo(() => {
    if (dadosAcumulados.length === 0) return { valor: 0, quantidade: 0 }
    const ultimo = dadosAcumulados[dadosAcumulados.length - 1]
    return {
      valor: ultimo.valor_acumulado,
      quantidade: ultimo.quantidade_acumulada
    }
  }, [dadosAcumulados])

  const handleExportExcel = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    try {
      const periodoInicio = filtros.periodoInicio || periodoInicial.inicio
      const periodoFim = filtros.periodoFim || periodoInicial.fim

      const unidadesParam = filtrosParaGrid.unidadesSelecionadas.length > 0
        ? filtrosParaGrid.unidadesSelecionadas.join(',')
        : ''

      const params = new URLSearchParams()
      params.set('data_inicio', periodoInicio)
      params.set('data_fim', periodoFim)

      if (unidadesParam) params.set('unidade_id', unidadesParam)

      if (filtros.funilSelecionado && filtros.funilSelecionado !== 'todos') {
        params.set('funil_id', filtros.funilSelecionado)
      }

      if (filtros.grupoSelecionado && filtros.grupoSelecionado !== 'todos') {
        params.set('grupo_id', filtros.grupoSelecionado)
      }

      const res = await fetch(`/api/analytics/acumulado-mes/export?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Falha ao exportar Excel')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `acumulado_${periodoInicio}_a_${periodoFim}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // Evitar console.*; falha silenciosa (página já mostra dados sem bloquear)
    } finally {
      setExporting(false)
    }
  }, [exporting, filtros, filtrosParaGrid.unidadesSelecionadas, periodoInicial.fim, periodoInicial.inicio])

  return (
    <ProtectedRoute>
      <div className="w-full">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-7 w-7 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Acumulado do Período</h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{periodoLabel}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              disabled={exporting || !filtros.periodoInicio || !filtros.periodoFim}
            >
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
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
        />

        {/* Gráfico de Acumulado Dia a Dia */}
        <Card className="bg-white border-gray-200 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-bold text-sm uppercase">Receita Acumulada Dia a Dia</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalAcumulado.valor)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Vendas:</span>
                  <span className="font-bold text-blue-600">{totalAcumulado.quantidade}</span>
                </div>
              </div>
            </div>
            
            {loadingGrafico ? (
              <Skeleton className="h-[250px] w-full bg-gray-100" />
            ) : dadosAcumulados.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                Nenhum dado disponível para o período selecionado
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosAcumulados} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      stroke="#d1d5db"
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      stroke="#d1d5db"
                      tickLine={false}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`
                        if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`
                        return `R$ ${value}`
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#111827',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'valor_acumulado') return [formatCurrency(value), 'Receita Acumulada']
                        return [value, name]
                      }}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      formatter={(value) => {
                        if (value === 'valor_acumulado') return 'Receita Acumulada'
                        return value
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="valor_acumulado" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValor)"
                      dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                    >
                      <LabelList 
                        dataKey="valor_acumulado" 
                        position="top" 
                        style={{ fill: '#059669', fontSize: '11px', fontWeight: '600' }}
                        formatter={(value) => {
                          const n = Number(value)
                          if (!Number.isFinite(n) || n === 0) return ''
                          if (n >= 1000000) return `R$ ${(n / 1000000).toFixed(1)}M`
                          if (n >= 1000) return `R$ ${(n / 1000).toFixed(0)}k`
                          return formatCurrency(n)
                        }}
                      />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grid de Unidades (igual ao painel) */}
        <PainelUnidadesGrid
          filtros={filtrosParaGrid}
          mesAtual={mesAtual}
          anoAtual={anoAtual}
        />
      </div>
    </ProtectedRoute>
  )
}
