"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import PainelFiltersInline from "@/components/painel/PainelFiltersInline"
import { AcumuladoMesTable } from "@/components/analytics/AcumuladoMesTable"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Calendar, TrendingUp, BarChart2 } from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts'

interface DadoPeriodo {
  dia: number
  data: string
  valor_total: number
  quantidade_total: number
  mes?: number
  ano?: number
  label?: string
  valor_total_ano_anterior?: number
  quantidade_total_ano_anterior?: number
}

export default function ReceitaMensalPage() {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [exporting, setExporting] = useState(false)

  // Período inicial (últimos 12 meses)
  const periodoInicial = useMemo(() => {
    const fim = new Date()
    const inicio = new Date()
    inicio.setMonth(inicio.getMonth() - 11)
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
    periodoTipo: 'personalizado' as string,
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
  const [dadosPeriodo, setDadosPeriodo] = useState<DadoPeriodo[]>([])
  const [loadingGrafico, setLoadingGrafico] = useState(true)
  const [tipoGrafico, setTipoGrafico] = useState<'area' | 'coluna'>('coluna')
  const [granularidade, setGranularidade] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes')

  const { mesAtual, anoAtual } = useMemo(() => {
    const dataAtual = new Date()
    return {
      mesAtual: dataAtual.getMonth() + 1,
      anoAtual: dataAtual.getFullYear()
    }
  }, [])

  // Calcular diferença em dias do período selecionado
  const diasDoPeriodo = useMemo(() => {
    if (!filtros.periodoInicio || !filtros.periodoFim) return 0

    const inicio = new Date(filtros.periodoInicio + 'T00:00:00')
    const fim = new Date(filtros.periodoFim + 'T00:00:00')

    const diffTime = fim.getTime() - inicio.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [filtros.periodoInicio, filtros.periodoFim])

  // Determinar granularidade sugerida baseada no período
  const granularidadeSugerida = useMemo((): 'dia' | 'semana' | 'mes' | 'ano' => {
    if (diasDoPeriodo < 45) return 'dia'
    if (diasDoPeriodo < 90) return 'semana'
    if (diasDoPeriodo < 365) return 'mes'
    return 'ano'
  }, [diasDoPeriodo])

  // Nomes dos meses para exibição
  const nomesMeses = useMemo(() => [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ], [])

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
      let inicio: Date
      let fim: Date

      switch (tipo) {
        case 'este-mes':
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
          break
        case 'mes-passado':
          inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
          break
        case 'esta-semana':
          const diaSemana = hoje.getDay()
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemana)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
          break
        case 'semana-passada':
          const diaSemanaAtual = hoje.getDay()
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemanaAtual - 7)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemanaAtual - 1)
          break
        case 'este-ano':
          inicio = new Date(hoje.getFullYear(), 0, 1)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
          break
        case 'ano-anterior':
          inicio = new Date(hoje.getFullYear() - 1, 0, 1)
          fim = new Date(hoje.getFullYear() - 1, 11, 31)
          break
        default:
          return { inicio: '', fim: '' }
      }

      const formatDate = (d: Date) => {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      return {
        inicio: formatDate(inicio),
        fim: formatDate(fim)
      }
    }
  }, [])

  const filtrosAtivos = useMemo(() => {
    return filtros.unidadesSelecionadas.length > 0 ||
           filtros.periodoTipo !== 'personalizado' ||
           filtros.funisSelecionados.length > 0 ||
           filtros.gruposSelecionados.length > 0
  }, [filtros])

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

  // Effect: Definir granularidade automaticamente baseada no período
  useEffect(() => {
    setGranularidade(granularidadeSugerida)
  }, [granularidadeSugerida])

  // Buscar dados por período (não acumulado)
  const fetchDadosPeriodo = useCallback(async (signal: AbortSignal, gran: string) => {
    try {
      setLoadingGrafico(true)

      const periodoInicio = filtros.periodoInicio || periodoInicial.inicio
      const periodoFim = filtros.periodoFim || periodoInicial.fim

      const unidadesParam = filtros.unidadesSelecionadas.length > 0
        ? `&unidade_id=${filtros.unidadesSelecionadas.join(',')}`
        : ''

      const granParam = `&granularidade=${gran}`

      const response = await fetch(
        `/api/oportunidades/diaria?tipo=ganhas&data_inicio=${periodoInicio}&data_fim=${periodoFim}${unidadesParam}${granParam}`,
        { cache: 'no-store', signal }
      )

      if (signal.aborted) return

      const data = await response.json()

      if (signal.aborted) return

      // Se for granularidade anual ou mensal, buscar dados do periodo anterior para comparação
      let dadosPeriodoAnterior: any[] = []
      if ((gran === 'ano' || gran === 'mes') && data.success && data.dados && data.dados.length > 0) {
        try {
          const inicioDate = new Date(periodoInicio + 'T00:00:00')
          const fimDate = new Date(periodoFim + 'T00:00:00')

          const inicioAnoAnterior = new Date(inicioDate)
          inicioAnoAnterior.setFullYear(inicioDate.getFullYear() - 1)
          const fimAnoAnterior = new Date(fimDate)
          fimAnoAnterior.setFullYear(fimDate.getFullYear() - 1)

          const periodoInicioAnterior = inicioAnoAnterior.toISOString().split('T')[0]
          const periodoFimAnterior = fimAnoAnterior.toISOString().split('T')[0]

          console.log('🔍 [Receita Mensal] Buscando ano anterior:', periodoInicioAnterior, '-', periodoFimAnterior)

          const responseAnterior = await fetch(
            `/api/oportunidades/diaria?tipo=ganhas&data_inicio=${periodoInicioAnterior}&data_fim=${periodoFimAnterior}${unidadesParam}${granParam}`,
            { cache: 'no-store', signal }
          )

          if (!signal.aborted && responseAnterior.ok) {
            const dataAnterior = await responseAnterior.json()
            if (dataAnterior.success && dataAnterior.dados) {
              dadosPeriodoAnterior = dataAnterior.dados
              console.log('✅ [Receita Mensal] Dados periodo anterior:', dadosPeriodoAnterior)
            }
          }
        } catch (err) {
          console.error('❌ [Receita Mensal] Erro ao buscar ano anterior:', err)
        }
      }

      if (data.success && data.dados) {
        // Criar mapa de dados do periodo anterior (ano ou mes)
        const mapaPeriodoAnterior = new Map<string, { valor: number; quantidade: number }>()
        if ((gran === 'ano' || gran === 'mes') && dadosPeriodoAnterior.length > 0) {
          dadosPeriodoAnterior.forEach((item: any) => {
            // Para mes: usar "ano-mes" como chave (ex: "2023-12")
            // Para ano: usar apenas "ano" como chave (ex: "2023")
            const chave = gran === 'mes'
              ? `${item.ano}-${String(item.mes).padStart(2, '0')}`
              : String(item.ano)

            mapaPeriodoAnterior.set(chave, {
              valor: Number(item.valor_total || 0),
              quantidade: Number(item.total || 0)
            })
          })
          console.log('📊 [Receita Mensal] Mapa periodo anterior:', Array.from(mapaPeriodoAnterior.entries()))
        }

        // NÃO calcular acumulado - usar valores diretos
        const dadosFormatados = data.dados.map((item: any) => {
          let label: string
          if (gran === 'mes') {
            const mes = Number(item.mes)
            const ano = Number(item.ano)
            label = `${nomesMeses[mes - 1]}/${String(ano).slice(-2)}`
          } else if (gran === 'semana') {
            const dataObj = new Date(item.data + 'T00:00:00')
            label = `Sem ${String(dataObj.getDate()).padStart(2, '0')}/${String(dataObj.getMonth() + 1).padStart(2, '0')}`
          } else if (gran === 'ano') {
            label = String(item.ano)
          } else {
            label = String(item.dia)
          }

          // Buscar dados do periodo anterior se disponível
          let dadosAnterior = null
          if (gran === 'ano') {
            const anoAtual = Number(item.ano)
            const chaveAnterior = String(anoAtual - 1)
            dadosAnterior = mapaPeriodoAnterior.get(chaveAnterior)
            console.log(`🔎 [Receita Mensal] Ano ${anoAtual}: buscando ${anoAtual - 1} no mapa ->`, dadosAnterior)
          } else if (gran === 'mes') {
            const anoAtual = Number(item.ano)
            const mesAtual = Number(item.mes)
            // Comparar com o mesmo mês do ano anterior (ex: 2024-01 -> 2023-01)
            const anoAnterior = anoAtual - 1
            const chaveAnterior = `${anoAnterior}-${String(mesAtual).padStart(2, '0')}`
            dadosAnterior = mapaPeriodoAnterior.get(chaveAnterior)
            console.log(`🔎 [Receita Mensal] Mês ${anoAtual}-${String(mesAtual).padStart(2, '0')}: buscando ${chaveAnterior} no mapa ->`, dadosAnterior)
          }

          return {
            dia: item.dia,
            data: item.data,
            mes: item.mes,
            ano: item.ano,
            label,
            valor_total: Number(item.valor_total || 0),
            quantidade_total: Number(item.total || 0),
            ...((gran === 'ano' || gran === 'mes') && dadosAnterior ? {
              valor_total_ano_anterior: dadosAnterior.valor,
              quantidade_total_ano_anterior: dadosAnterior.quantidade
            } : {})
          }
        })

        console.log('📈 [Receita Mensal] Dados finais com comparação:', dadosFormatados)

        setDadosPeriodo(dadosFormatados)
      } else {
        setDadosPeriodo([])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setDadosPeriodo([])
    } finally {
      setLoadingGrafico(false)
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas, periodoInicial, nomesMeses])

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

  // Effect: Carregar dados do gráfico quando filtros mudarem
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    if (!filtros.periodoInicio || !filtros.periodoFim) {
      return
    }

    fetchDadosPeriodo(controller.signal, granularidade)

    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas.join(','), granularidade, fetchDadosPeriodo])

  const periodoLabel = useMemo(() => {
    if (filtros.periodoInicio && filtros.periodoFim) {
      const inicio = new Date(filtros.periodoInicio + 'T00:00:00')
      const fim = new Date(filtros.periodoFim + 'T00:00:00')
      return `${inicio.toLocaleDateString('pt-BR')} - ${fim.toLocaleDateString('pt-BR')}`
    }
    return 'Período não definido'
  }, [filtros.periodoInicio, filtros.periodoFim])

  // Totais do período
  const totaisPeriodo = useMemo(() => {
    if (dadosPeriodo.length === 0) return { valor: 0, quantidade: 0 }
    return {
      valor: dadosPeriodo.reduce((sum, item) => sum + item.valor_total, 0),
      quantidade: dadosPeriodo.reduce((sum, item) => sum + item.quantidade_total, 0)
    }
  }, [dadosPeriodo])

  // Aplicar filtro de grupo sobre as unidades selecionadas
  const filtrosParaGrid = useMemo(() => {
    // Obter todas as unidades dos grupos selecionados
    let unidadesDoGrupo: number[] | null = null
    if (filtros.gruposSelecionados.length > 0) {
      unidadesDoGrupo = filtros.gruposSelecionados.flatMap(grupoId => {
        const grupo = grupos.find(g => Number(g.id) === grupoId)
        return grupo?.unidadeIds || []
      })
    }

    const unidadesSelecionadas = filtros.unidadesSelecionadas || []

    const unidadesIdsAplicadas =
      unidadesDoGrupo
        ? (unidadesSelecionadas.length > 0
            ? unidadesSelecionadas.filter(id => unidadesDoGrupo!.includes(id))
            : unidadesDoGrupo)
        : unidadesSelecionadas

    return {
      ...filtros,
      unidadesSelecionadas: unidadesIdsAplicadas
    }
  }, [filtros, grupos])

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

      if (filtros.funisSelecionados.length > 0) {
        params.set('funil_id', filtros.funisSelecionados.join(','))
      }

      if (filtros.gruposSelecionados.length > 0) {
        params.set('grupo_id', filtros.gruposSelecionados.join(','))
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
      a.download = `receita_mensal_${periodoInicio}_a_${periodoFim}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar:', error)
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
                <h1 className="text-2xl font-bold text-gray-900">Receita Mensal</h1>
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
          showGainDateFilter={false}
        />

        {/* Gráfico de Receita */}
        <Card className="bg-white border-gray-200 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-gray-900 font-bold text-sm uppercase">
                    Receita por Período
                  </h3>
                  <span className="text-xs text-gray-500">
                    ({diasDoPeriodo} {diasDoPeriodo === 1 ? 'dia' : 'dias'})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant={granularidade === 'dia' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGranularidade('dia')}
                    className={`h-7 px-2 text-[10px] relative ${
                      granularidadeSugerida === 'dia' && granularidade !== 'dia'
                        ? 'ring-1 ring-blue-300'
                        : ''
                    }`}
                    title={granularidadeSugerida === 'dia' ? 'Sugerido para este período' : ''}
                  >
                    Dia
                    {granularidadeSugerida === 'dia' && granularidade !== 'dia' && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                    )}
                  </Button>
                  <Button
                    variant={granularidade === 'semana' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGranularidade('semana')}
                    className={`h-7 px-2 text-[10px] relative ${
                      granularidadeSugerida === 'semana' && granularidade !== 'semana'
                        ? 'ring-1 ring-blue-300'
                        : ''
                    }`}
                    title={granularidadeSugerida === 'semana' ? 'Sugerido para este período' : ''}
                  >
                    Semana
                    {granularidadeSugerida === 'semana' && granularidade !== 'semana' && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                    )}
                  </Button>
                  <Button
                    variant={granularidade === 'mes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGranularidade('mes')}
                    className={`h-7 px-2 text-[10px] relative ${
                      granularidadeSugerida === 'mes' && granularidade !== 'mes'
                        ? 'ring-1 ring-blue-300'
                        : ''
                    }`}
                    title={granularidadeSugerida === 'mes' ? 'Sugerido para este período' : ''}
                  >
                    Mês
                    {granularidadeSugerida === 'mes' && granularidade !== 'mes' && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                    )}
                  </Button>
                  <Button
                    variant={granularidade === 'ano' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGranularidade('ano')}
                    className={`h-7 px-2 text-[10px] relative ${
                      granularidadeSugerida === 'ano' && granularidade !== 'ano'
                        ? 'ring-1 ring-blue-300'
                        : ''
                    }`}
                    title={granularidadeSugerida === 'ano' ? 'Sugerido para este período' : ''}
                  >
                    Ano
                    {granularidadeSugerida === 'ano' && granularidade !== 'ano' && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                    )}
                  </Button>
                </div>
                {/* Indicador de períodos comparados */}
                {(granularidade === 'ano' || granularidade === 'mes') && dadosPeriodo.some(d => d.valor_total_ano_anterior) && (
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                      <span className="text-gray-600">
                        {filtros.periodoInicio && filtros.periodoFim && (
                          <>
                            {new Date(filtros.periodoInicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' - '}
                            {new Date(filtros.periodoFim + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-slate-400"></div>
                      <span className="text-gray-600">
                        {filtros.periodoInicio && filtros.periodoFim && (
                          <>
                            {(() => {
                              const inicio = new Date(filtros.periodoInicio + 'T00:00:00')
                              const fim = new Date(filtros.periodoFim + 'T00:00:00')
                              inicio.setFullYear(inicio.getFullYear() - 1)
                              fim.setFullYear(fim.getFullYear() - 1)
                              return (
                                <>
                                  {inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  {' - '}
                                  {fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </>
                              )
                            })()}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-bold text-green-600">{formatCurrency(totaisPeriodo.valor)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Vendas:</span>
                    <span className="font-bold text-blue-600">{totaisPeriodo.quantidade}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-l pl-4">
                  <Button
                    type="button"
                    variant={tipoGrafico === 'area' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoGrafico('area')}
                    className="h-8 px-3"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Área
                  </Button>
                  <Button
                    type="button"
                    variant={tipoGrafico === 'coluna' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoGrafico('coluna')}
                    className="h-8 px-3"
                  >
                    <BarChart2 className="h-4 w-4 mr-1" />
                    Coluna
                  </Button>
                </div>
              </div>
            </div>

            {loadingGrafico ? (
              <Skeleton className="h-[250px] w-full bg-gray-100" />
            ) : dadosPeriodo.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                Nenhum dado disponível para o período selecionado
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGrafico === 'area' ? (
                    <AreaChart data={dadosPeriodo} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValorMensal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorValorMensalAnterior" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        stroke="#d1d5db"
                        tickLine={false}
                        interval={granularidade !== 'dia' ? 0 : 'preserveStartEnd'}
                        angle={granularidade !== 'dia' && dadosPeriodo.length > 6 ? -45 : 0}
                        textAnchor={granularidade !== 'dia' && dadosPeriodo.length > 6 ? 'end' : 'middle'}
                        height={granularidade !== 'dia' && dadosPeriodo.length > 6 ? 50 : 30}
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
                        formatter={(value, name) => {
                          if (name === 'valor_total') return [formatCurrency(value as number), 'Receita do Período']
                          if (name === 'valor_total_ano_anterior') return [formatCurrency(value as number), 'Ano Anterior']
                          return [value, name]
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const item = payload[0].payload as DadoPeriodo
                            if (granularidade === 'mes') {
                              const mesNome = nomesMeses[(item.mes || 1) - 1]
                              return `${mesNome}/${item.ano}`
                            } else if (granularidade === 'semana') {
                              return `${label} (Início da semana)`
                            } else if (granularidade === 'ano') {
                              return `Ano ${item.ano}`
                            }
                            return `Dia ${label}`
                          }
                          return label
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(value) => {
                          if (value === 'valor_total') return 'Receita do Período'
                          if (value === 'valor_total_ano_anterior') return 'Ano Anterior'
                          return value
                        }}
                      />
                      {/* Linha do periodo anterior (para granularidade anual ou mensal) */}
                      {(granularidade === 'ano' || granularidade === 'mes') && dadosPeriodo.some(d => d.valor_total_ano_anterior) && (
                        <Area
                          type="monotone"
                          dataKey="valor_total_ano_anterior"
                          stroke="#94a3b8"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fillOpacity={1}
                          fill="url(#colorValorMensalAnterior)"
                          dot={{ fill: '#94a3b8', r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: '#94a3b8', stroke: '#fff', strokeWidth: 2 }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="valor_total"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValorMensal)"
                        dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                      >
                        <LabelList
                          dataKey="valor_total"
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
                  ) : (
                    <BarChart data={dadosPeriodo} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        stroke="#d1d5db"
                        tickLine={false}
                        interval={granularidade !== 'dia' ? 0 : 'preserveStartEnd'}
                        angle={granularidade !== 'dia' && dadosPeriodo.length > 6 ? -45 : 0}
                        textAnchor={granularidade !== 'dia' && dadosPeriodo.length > 6 ? 'end' : 'middle'}
                        height={granularidade !== 'dia' && dadosPeriodo.length > 6 ? 50 : 30}
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
                        formatter={(value, name) => {
                          if (name === 'valor_total') return [formatCurrency(value as number), 'Receita do Período']
                          if (name === 'valor_total_ano_anterior') return [formatCurrency(value as number), 'Ano Anterior']
                          return [value, name]
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const item = payload[0].payload as DadoPeriodo
                            if (granularidade === 'mes') {
                              const mesNome = nomesMeses[(item.mes || 1) - 1]
                              return `${mesNome}/${item.ano}`
                            } else if (granularidade === 'semana') {
                              return `${label} (Início da semana)`
                            } else if (granularidade === 'ano') {
                              return `Ano ${item.ano}`
                            }
                            return `Dia ${label}`
                          }
                          return label
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(value) => {
                          if (value === 'valor_total') return 'Receita do Período'
                          if (value === 'valor_total_ano_anterior') return 'Ano Anterior'
                          return value
                        }}
                      />
                      {/* Barra do periodo anterior (para granularidade anual ou mensal) */}
                      {(granularidade === 'ano' || granularidade === 'mes') && dadosPeriodo.some(d => d.valor_total_ano_anterior) && (
                        <Bar
                          dataKey="valor_total_ano_anterior"
                          fill="#94a3b8"
                          radius={[4, 4, 0, 0]}
                        >
                          <LabelList
                            dataKey="valor_total_ano_anterior"
                            position="top"
                            style={{ fill: '#64748b', fontSize: '11px', fontWeight: '600' }}
                            formatter={(value) => {
                              const n = Number(value)
                              if (!Number.isFinite(n) || n === 0) return ''
                              if (n >= 1000000) return `R$ ${(n / 1000000).toFixed(1)}M`
                              if (n >= 1000) return `R$ ${(n / 1000).toFixed(0)}k`
                              return formatCurrency(n)
                            }}
                          />
                        </Bar>
                      )}
                      <Bar
                        dataKey="valor_total"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="valor_total"
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
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Unidades */}
        <AcumuladoMesTable
          filtros={filtrosParaGrid}
          mesAtual={mesAtual}
          anoAtual={anoAtual}
        />
      </div>
    </ProtectedRoute>
  )
}
