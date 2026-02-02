"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { PainelUnidadesGrid } from "@/components/painel/PainelUnidadesGrid"
import PainelFiltersInline from "@/components/painel/PainelFiltersInline"
import PainelHojeCard from "@/components/estatisticas/painel/PainelHojeCard"
import PainelOportunidadesAbertasCard from "@/components/estatisticas/painel/PainelOportunidadesAbertasCard"
import PainelOportunidadesPerdidasCard from "@/components/estatisticas/painel/PainelOportunidadesPerdidasCard"
import PainelOportunidadesGanhasCard from "@/components/estatisticas/painel/PainelOportunidadesGanhasCard"
import PainelTaxaConversaoCard from "@/components/estatisticas/painel/PainelTaxaConversaoCard"
import PainelTicketMedioCard from "@/components/estatisticas/painel/PainelTicketMedioCard"
import PainelBarraProgressoMeta from "@/components/painel/PainelBarraProgressoMeta"
import { ProtectedRoute } from "@/components/protected-route"
import { Header } from "@/components/header"
import { AppFooter } from "@/components/app-footer"

export default function PainelPage() {
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Estados
  const [oportunidadesCriadas, setOportunidadesCriadas] = useState<any[]>([])
  const [receitaDiaria, setReceitaDiaria] = useState<any[]>([])
  const [loadingGraficos, setLoadingGraficos] = useState(true)
  
  // Período inicial
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
    funisSelecionados: [] as number[],
    gruposSelecionados: [] as number[],
    gainDateInicio: undefined as string | undefined,
    gainDateFim: undefined as string | undefined
  }))
  
  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string; unidadeIds?: number[] }>>([])
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])
  
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

  // Determinar granularidade baseada no período (para gráficos)
  const granularidadeGrafico = useMemo((): 'dia' | 'mes' => {
    // Se o período for maior ou igual a 300 dias (aproximadamente 10 meses), usar granularidade mensal
    if (diasDoPeriodo >= 300) return 'mes'
    return 'dia'
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

  const getMesNome = useCallback((mes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1] || ''
  }, [])

  // Função para calcular datas baseado no tipo de período
  const calcularPeriodo = useMemo(() => {
    return (tipo: string) => {
      const hoje = new Date()
      let inicio: Date
      let fim: Date

      switch (tipo) {
        case 'este-mes':
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999)
          break
        case 'mes-passado':
          inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1, 0, 0, 0, 0)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999)
          break
        case 'esta-semana':
          const diaSemana = hoje.getDay()
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemana, 0, 0, 0, 0)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999)
          break
        case 'semana-passada':
          const diaSemanaAtual = hoje.getDay()
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemanaAtual - 7, 0, 0, 0, 0)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemanaAtual - 1, 23, 59, 59, 999)
          break
        case 'este-ano':
          inicio = new Date(hoje.getFullYear(), 0, 1, 0, 0, 0, 0)
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999)
          break
        case 'ano-anterior':
          const anoAnterior = hoje.getFullYear() - 1
          inicio = new Date(anoAnterior, 0, 1, 0, 0, 0, 0)
          fim = new Date(anoAnterior, 11, 31, 23, 59, 59, 999)
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
           filtros.periodoTipo !== 'este-mes' ||
           filtros.funisSelecionados.length > 0 ||
           filtros.gruposSelecionados.length > 0
  }, [filtros])

  // Strings para APIs que aceitam múltiplos ids separados por vírgula
  const funilIdParam = useMemo(
    () => (filtros.funisSelecionados.length > 0 ? filtros.funisSelecionados.join(',') : undefined),
    [filtros.funisSelecionados]
  )
  const grupoIdParam = useMemo(
    () => (filtros.gruposSelecionados.length > 0 ? filtros.gruposSelecionados.join(',') : undefined),
    [filtros.gruposSelecionados]
  )

  const periodoLabel = useMemo(() => {
    if (filtros.periodoInicio && filtros.periodoFim) {
      const inicio = new Date(filtros.periodoInicio + 'T00:00:00')
      const fim = new Date(filtros.periodoFim + 'T00:00:00')

      // Verificar se o período está dentro do mesmo ano
      if (inicio.getFullYear() === fim.getFullYear()) {
        return `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
      } else {
        return `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
      }
    }
    return ''
  }, [filtros.periodoInicio, filtros.periodoFim])

  // Função de fetch para gráficos com AbortController
  const fetchGraficos = useCallback(async (signal: AbortSignal, gran: string) => {
    try {
      setLoadingGraficos(true)

      const periodoInicio = filtros.periodoInicio || periodoInicial.inicio
      const periodoFim = filtros.periodoFim || periodoInicial.fim

      const unidadesParam = filtros.unidadesSelecionadas.length > 0
        ? `&unidade_id=${filtros.unidadesSelecionadas.join(',')}`
        : ''

      const funilParam = funilIdParam ? `&funil_id=${funilIdParam}` : ''

      const granParam = `&granularidade=${gran}`

      const [responseCriadas, responseReceita] = await Promise.all([
        fetch(
          `/api/oportunidades/diaria?tipo=criadas&data_inicio=${periodoInicio}&data_fim=${periodoFim}${unidadesParam}${funilParam}${granParam}`,
          { cache: 'no-store', signal }
        ),
        fetch(
          `/api/oportunidades/diaria?tipo=ganhas&data_inicio=${periodoInicio}&data_fim=${periodoFim}${unidadesParam}${funilParam}${granParam}`,
          { cache: 'no-store', signal }
        )
      ])

      if (signal.aborted) return

      const [dataCriadas, dataReceita] = await Promise.all([
        responseCriadas.json(),
        responseReceita.json()
      ])

      if (signal.aborted) return

      if (dataCriadas.success && dataCriadas.dados) {
        // Filtrar dados dentro do período selecionado
        const dataInicio = new Date(periodoInicio + 'T00:00:00')
        const dataFim = new Date(periodoFim + 'T00:00:00')

        const dadosFiltrados = dataCriadas.dados.filter((item: any) => {
          if (gran === 'mes' && item.ano && item.mes) {
            // Para granularidade mensal, filtrar por ano/mês
            const anoItem = Number(item.ano)
            const mesItem = Number(item.mes)
            const anoInicio = dataInicio.getFullYear()
            const mesInicio = dataInicio.getMonth() + 1
            const anoFim = dataFim.getFullYear()
            const mesFim = dataFim.getMonth() + 1

            // Comparar ano/mês
            if (anoItem < anoInicio || anoItem > anoFim) return false
            if (anoItem === anoInicio && mesItem < mesInicio) return false
            if (anoItem === anoFim && mesItem > mesFim) return false
            return true
          } else {
            // Para granularidade diária, filtrar por data
            const dataItem = new Date(item.data + 'T00:00:00')
            return dataItem >= dataInicio && dataItem <= dataFim
          }
        })

        setOportunidadesCriadas(dadosFiltrados.map((item: any) => {
          let label: string
          if (gran === 'mes') {
            const mes = Number(item.mes)
            const ano = Number(item.ano)
            label = `${nomesMeses[mes - 1]}/${String(ano).slice(-2)}`
          } else {
            label = String(item.dia)
          }

          return {
            dia: item.dia,
            data: item.data,
            mes: item.mes,
            ano: item.ano,
            label,
            total_criadas: item.total
          }
        }))
      } else {
        setOportunidadesCriadas([])
      }

      if (dataReceita.success && dataReceita.dados) {
        // Filtrar dados dentro do período selecionado
        const dataInicio = new Date(periodoInicio + 'T00:00:00')
        const dataFim = new Date(periodoFim + 'T00:00:00')

        const dadosFiltrados = dataReceita.dados.filter((item: any) => {
          if (gran === 'mes' && item.ano && item.mes) {
            // Para granularidade mensal, filtrar por ano/mês
            const anoItem = Number(item.ano)
            const mesItem = Number(item.mes)
            const anoInicio = dataInicio.getFullYear()
            const mesInicio = dataInicio.getMonth() + 1
            const anoFim = dataFim.getFullYear()
            const mesFim = dataFim.getMonth() + 1

            // Comparar ano/mês
            if (anoItem < anoInicio || anoItem > anoFim) return false
            if (anoItem === anoInicio && mesItem < mesInicio) return false
            if (anoItem === anoFim && mesItem > mesFim) return false
            return true
          } else {
            // Para granularidade diária, filtrar por data
            const dataItem = new Date(item.data + 'T00:00:00')
            return dataItem >= dataInicio && dataItem <= dataFim
          }
        })

        setReceitaDiaria(dadosFiltrados.map((item: any) => {
          let label: string
          if (gran === 'mes') {
            const mes = Number(item.mes)
            const ano = Number(item.ano)
            label = `${nomesMeses[mes - 1]}/${String(ano).slice(-2)}`
          } else {
            label = String(item.dia)
          }

          return {
            dia: item.dia,
            data: item.data,
            mes: item.mes,
            ano: item.ano,
            label,
            total_oportunidades: item.total,
            valor_total: item.valor_total || 0
          }
        }))
      } else {
        setReceitaDiaria([])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setLoadingGraficos(false)
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas, funilIdParam, periodoInicial, nomesMeses])

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

  // Effect 3: Carregar gráficos quando filtros mudarem (CONSOLIDADO - evita carregamento duplo)
  useEffect(() => {
    // Cancelar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Criar novo AbortController
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Aguardar período estar definido
    if (!filtros.periodoInicio || !filtros.periodoFim) {
      return
    }

    // Carregar dados com granularidade apropriada
    fetchGraficos(controller.signal, granularidadeGrafico)

    // Cleanup
    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas.join(','), funilIdParam, granularidadeGrafico, fetchGraficos])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        
        <div className="w-full overflow-y-auto scrollbar-hide">
        <div className="p-6">
          <PainelFiltersInline
            filtros={filtros}
            setFiltros={setFiltros}
            unidadesList={unidadesList}
            funis={funis}
            grupos={grupos}
            periodoInicial={periodoInicial}
            filtrosAtivos={filtrosAtivos}
          />
          
          {(() => {
            // Aplicar filtro de grupo (se houver) sobre o multi-select de unidades.
            const unidadesDoGrupo =
              filtros.gruposSelecionados.length > 0
                ? Array.from(
                    new Set(
                      filtros.gruposSelecionados.flatMap(
                        (id) => grupos.find((g) => g.id === id)?.unidadeIds || []
                      )
                    )
                  )
                : null

            const unidadesSelecionadas = filtros.unidadesSelecionadas || []

            const unidadesIdsAplicadas =
              unidadesDoGrupo && unidadesDoGrupo.length > 0
                ? unidadesSelecionadas.length > 0
                  ? unidadesSelecionadas.filter((id) => unidadesDoGrupo.includes(id))
                  : unidadesDoGrupo
                : unidadesSelecionadas

            return (
              <PainelBarraProgressoMeta
                unidadesIds={unidadesIdsAplicadas}
                periodoInicio={filtros.periodoInicio}
                periodoFim={filtros.periodoFim}
                funilId={funilIdParam}
              />
            )
          })()}
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <PainelHojeCard 
              unidadesIds={filtros.unidadesSelecionadas}
              funilId={funilIdParam}
              grupoId={grupoIdParam}
            />
            <PainelOportunidadesAbertasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
            <PainelOportunidadesPerdidasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
            <PainelOportunidadesGanhasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
            <PainelTaxaConversaoCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
            <PainelTicketMedioCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-gray-900 font-bold text-sm uppercase">
                      Oportunidades Criadas {granularidadeGrafico === 'mes' ? 'por Mês' : 'Dia a Dia'}
                    </h3>
                    {granularidadeGrafico === 'mes' && (
                      <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded">
                        Visão Mensal
                      </span>
                    )}
                  </div>
                  {periodoLabel && (
                    <span className="text-xs text-gray-500">
                      {periodoLabel}
                    </span>
                  )}
                </div>
                {loadingGraficos ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[150px] w-full bg-gray-100" />
                  </div>
                ) : (
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={oportunidadesCriadas} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey={granularidadeGrafico === 'mes' ? 'label' : 'dia'}
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          stroke="#d1d5db"
                          interval={granularidadeGrafico === 'mes' ? 0 : 'preserveStartEnd'}
                          angle={granularidadeGrafico === 'mes' && oportunidadesCriadas.length > 6 ? -45 : 0}
                          textAnchor={granularidadeGrafico === 'mes' && oportunidadesCriadas.length > 6 ? 'end' : 'middle'}
                          height={granularidadeGrafico === 'mes' && oportunidadesCriadas.length > 6 ? 40 : 30}
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          stroke="#d1d5db"
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
                          formatter={(value) => [value, 'Oportunidades']}
                          labelFormatter={(label) => {
                            if (granularidadeGrafico === 'mes') {
                              return label
                            }
                            return `Dia ${label}`
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total_criadas"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 3 }}
                          activeDot={{ r: 5 }}
                          name={`${filtros.periodoInicio} a ${filtros.periodoFim}`}
                          isAnimationActive={false}
                        >
                          <LabelList
                            dataKey="total_criadas"
                            position="top"
                            style={{ fill: '#6b7280', fontSize: '10px' }}
                            formatter={(value: any) => value === 0 ? '' : String(value)}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-gray-900 font-bold text-sm uppercase">
                      Receita {granularidadeGrafico === 'mes' ? 'por Mês' : 'Dia a Dia'}
                    </h3>
                    {granularidadeGrafico === 'mes' && (
                      <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded">
                        Visão Mensal
                      </span>
                    )}
                  </div>
                  {periodoLabel && (
                    <span className="text-xs text-gray-500">
                      {periodoLabel}
                    </span>
                  )}
                </div>
                {loadingGraficos ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[150px] w-full bg-gray-100" />
                  </div>
                ) : (
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={receitaDiaria} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey={granularidadeGrafico === 'mes' ? 'label' : 'dia'}
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          stroke="#d1d5db"
                          interval={granularidadeGrafico === 'mes' ? 0 : 'preserveStartEnd'}
                          angle={granularidadeGrafico === 'mes' && receitaDiaria.length > 6 ? -45 : 0}
                          textAnchor={granularidadeGrafico === 'mes' && receitaDiaria.length > 6 ? 'end' : 'middle'}
                          height={granularidadeGrafico === 'mes' && receitaDiaria.length > 6 ? 40 : 30}
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          stroke="#d1d5db"
                          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
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
                          formatter={(value) => [formatCurrency(value as number), 'Receita']}
                          labelFormatter={(label) => {
                            if (granularidadeGrafico === 'mes') {
                              return label
                            }
                            return `Dia ${label}`
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="valor_total"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ fill: '#22c55e', r: 3 }}
                          activeDot={{ r: 5 }}
                          name="Receita"
                          isAnimationActive={false}
                        >
                          <LabelList
                            dataKey="valor_total"
                            position="top"
                            style={{ fill: '#6b7280', fontSize: '10px' }}
                            formatter={(value: any) => value === 0 ? '' : `R$ ${(Number(value) / 1000).toFixed(0)}k`}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <PainelUnidadesGrid 
            filtros={filtros}
            mesAtual={mesAtual}
            anoAtual={anoAtual}
          />
        </div>
      </div>
      <AppFooter />
    </div>
    </ProtectedRoute>
  )
}
