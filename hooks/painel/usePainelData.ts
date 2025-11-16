'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Unidade, OportunidadeRecente, DadoGrafico, PainelStats, Filtros } from '@/types/painel.types'

interface UsePainelDataReturn {
  unidades: Unidade[]
  oportunidadesRecentes: OportunidadeRecente[]
  oportunidadesCriadas: DadoGrafico[]
  receitaDiaria: DadoGrafico[]
  stats: PainelStats
  filtros: Filtros
  loading: boolean
  loadingGraficos: boolean
  loadingStats: boolean
  loadingRecentes: boolean
  error: string | null
  filtrosAtivos: boolean
  setFiltros: (filtros: Filtros) => void
  refetchAll: () => Promise<void>
}

const OPORTUNIDADES_SIMULADAS: OportunidadeRecente[] = [
  {
    id: 1,
    nome: 'Oportunidade ABC - Cliente Premium',
    valor: 45000,
    status: 'gain',
    dataCriacao: '2024-11-16T10:00:00.000Z',
    vendedor: 'João Silva',
    unidade: 'Unidade Centro'
  },
  {
    id: 2,
    nome: 'Projeto XYZ - Empresa Tech',
    valor: 28000,
    status: 'open',
    dataCriacao: '2024-11-16T09:55:00.000Z',
    vendedor: 'Maria Santos',
    unidade: 'Unidade Norte'
  },
  {
    id: 3,
    nome: 'Contrato DEF - Startup',
    valor: 15000,
    status: 'lost',
    dataCriacao: '2024-11-16T09:50:00.000Z',
    vendedor: 'Pedro Costa',
    unidade: 'Unidade Sul'
  }
]

export function usePainelData(): UsePainelDataReturn {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [oportunidadesRecentes, setOportunidadesRecentes] = useState<OportunidadeRecente[]>([])
  const [oportunidadesCriadas, setOportunidadesCriadas] = useState<DadoGrafico[]>([])
  const [receitaDiaria, setReceitaDiaria] = useState<DadoGrafico[]>([])
  const [stats, setStats] = useState<PainelStats>({
    criadasHoje: 0,
    criadasOntem: 0,
    totalCriadasMes: 0,
    crescimentoPercentual: 0,
    ganhasHoje: 0,
    ganhasOntem: 0,
    totalGanhasMes: 0,
    valorTotalGanhasMes: 0,
    crescimentoGanhasPercentual: 0,
    acumuladoMes: 0,
    acumuladoMesAnterior: 0,
    metaMes: 0,
    metaVsMesAnterior: 0,
    perdidasMes: 0,
    taxaConversao: 0,
    ticketMedio: 0
  })
  
  const [filtros, setFiltros] = useState<Filtros>({
    unidadeSelecionada: 'todas',
    periodoInicio: '',
    periodoFim: '',
    statusOportunidade: 'todas'
  })
  
  const [loading, setLoading] = useState(true)
  const [loadingGraficos, setLoadingGraficos] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingRecentes, setLoadingRecentes] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const { mesAtual, anoAtual, diaAtual } = useMemo(() => {
    const dataAtual = new Date()
    return {
      mesAtual: dataAtual.getMonth() + 1,
      anoAtual: dataAtual.getFullYear(),
      diaAtual: dataAtual.getDate()
    }
  }, [])

  const filtrosAtivos = useMemo(() => {
    return filtros.unidadeSelecionada !== 'todas' ||
           filtros.periodoInicio !== '' ||
           filtros.periodoFim !== '' ||
           filtros.statusOportunidade !== 'todas'
  }, [filtros])

  const abortRequest = useCallback((key: string) => {
    const controller = abortControllersRef.current.get(key)
    if (controller) {
      controller.abort()
    }
  }, [])

  const createAbortController = useCallback((key: string): AbortController => {
    abortRequest(key)
    const controller = new AbortController()
    abortControllersRef.current.set(key, controller)
    return controller
  }, [abortRequest])

  const fetchUnidades = useCallback(async () => {
    try {
      setLoading(true)
      const controller = createAbortController('unidades')
      
      const response = await fetch('/api/unidades/painel', {
        signal: controller.signal
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao carregar unidades')
      }

      setUnidades(data.unidades || [])
      setError(null)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setUnidades([])
    } finally {
      setLoading(false)
    }
  }, [createAbortController])

  const fetchGraficos = useCallback(async () => {
    try {
      setLoadingGraficos(true)
      const controller = createAbortController('graficos')
      
      const [responseCriadas, responseReceita] = await Promise.all([
        fetch(`/api/oportunidades/daily-created?mes=${mesAtual}&ano=${anoAtual}`, {
          signal: controller.signal
        }),
        fetch(`/api/oportunidades/daily-gain?mes=${mesAtual}&ano=${anoAtual}`, {
          signal: controller.signal
        })
      ])

      const [dataCriadas, dataReceita] = await Promise.all([
        responseCriadas.json(),
        responseReceita.json()
      ])
      
      if (dataCriadas.success) {
        setOportunidadesCriadas(dataCriadas.dados || [])
      }
      
      if (dataReceita.success) {
        setReceitaDiaria(dataReceita.dados || [])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setLoadingGraficos(false)
    }
  }, [mesAtual, anoAtual, createAbortController])

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      const controller = createAbortController('stats')
      
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
      const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
      
      const [
        criadasHojeResponse,
        criadasMesAnteriorResponse,
        ganhasResponse,
        acumuladoMesAnteriorResponse,
        perdidasResponse,
        ganhasMesResponse,
        ganhasMesAnteriorResponse
      ] = await Promise.all([
        fetch(`/api/oportunidades/daily-created?mes=${mesAtual}&ano=${anoAtual}`, { signal: controller.signal }),
        fetch(`/api/oportunidades/daily-created?mes=${mesAnterior}&ano=${anoAnterior}`, { signal: controller.signal }),
        fetch(`/api/oportunidades/daily-gain?mes=${mesAtual}&ano=${anoAtual}`, { signal: controller.signal }),
        fetch(`/api/oportunidades/daily-gain?mes=${mesAnterior}&ano=${anoAnterior}`, { signal: controller.signal }),
        fetch(`/api/oportunidades/perdidos?mes=${mesAtual}&ano=${anoAtual}`, { signal: controller.signal }),
        fetch(`/api/oportunidades/ganhos?mes=${mesAtual}&ano=${anoAtual}`, { signal: controller.signal }),
        fetch(`/api/oportunidades/ganhos?mes=${mesAnterior}&ano=${anoAnterior}`, { signal: controller.signal })
      ])

      const [
        criadasHojeData,
        criadasMesAnteriorData,
        ganhasData,
        acumuladoMesAnteriorData,
        perdidasData,
        ganhasMesData,
        ganhasMesAnteriorData
      ] = await Promise.all([
        criadasHojeResponse.json(),
        criadasMesAnteriorResponse.json(),
        ganhasResponse.json(),
        acumuladoMesAnteriorResponse.json(),
        perdidasResponse.json(),
        ganhasMesResponse.json(),
        ganhasMesAnteriorResponse.json()
      ])
      
      const criadasHoje = criadasHojeData.success 
        ? (criadasHojeData.dados.find((d: DadoGrafico) => d.dia === diaAtual)?.total_criadas || 0)
        : 0
      const criadasOntem = criadasHojeData.success 
        ? (criadasHojeData.dados.find((d: DadoGrafico) => d.dia === diaAtual - 1)?.total_criadas || 0)
        : 0
      
      const totalCriadasMes = criadasHojeData.success 
        ? (criadasHojeData.dados.reduce((acc: number, d: DadoGrafico) => acc + (d.total_criadas || 0), 0))
        : 0
      
      const totalCriadasMesAnterior = criadasMesAnteriorData.success 
        ? (criadasMesAnteriorData.dados.reduce((acc: number, d: DadoGrafico) => acc + (d.total_criadas || 0), 0))
        : 0
      
      const crescimentoPercentual = totalCriadasMesAnterior > 0
        ? ((totalCriadasMes - totalCriadasMesAnterior) / totalCriadasMesAnterior) * 100
        : 0
      
      const ganhasHoje = ganhasData.success 
        ? (ganhasData.dados.find((d: DadoGrafico) => d.dia === diaAtual)?.valor_total || 0)
        : 0
      const ganhasOntem = ganhasData.success 
        ? (ganhasData.dados.find((d: DadoGrafico) => d.dia === diaAtual - 1)?.valor_total || 0)
        : 0
      const acumuladoMes = ganhasData.success 
        ? (ganhasData.valor_total_mes || 0)
        : 0
      
      const acumuladoMesAnterior = acumuladoMesAnteriorData.success 
        ? (acumuladoMesAnteriorData.valor_total_mes || 0)
        : 0
      
      const metaMes = ganhasData.success 
        ? (ganhasData.meta_total_mes || 0)
        : 0
      
      const metaVsMesAnterior = acumuladoMesAnterior > 0
        ? ((metaMes - acumuladoMesAnterior) / acumuladoMesAnterior) * 100
        : 0
      
      const perdidasMes = perdidasData.success 
        ? (perdidasData.data?.totalOportunidades || 0)
        : 0
      
      const totalGanhasMes = ganhasMesData.success 
        ? (ganhasMesData.data?.totalOportunidades || 0)
        : 0
      const valorTotalGanhasMes = ganhasMesData.success 
        ? (ganhasMesData.data?.totalValor || 0)
        : 0
      
      const totalGanhasMesAnterior = ganhasMesAnteriorData.success 
        ? (ganhasMesAnteriorData.data?.totalOportunidades || 0)
        : 0
      
      const crescimentoGanhasPercentual = totalGanhasMesAnterior > 0
        ? ((totalGanhasMes - totalGanhasMesAnterior) / totalGanhasMesAnterior) * 100
        : 0
      
      const taxaConversao = totalCriadasMes > 0
        ? (totalGanhasMes / totalCriadasMes) * 100
        : 0
      
      const ticketMedio = totalGanhasMes > 0
        ? valorTotalGanhasMes / totalGanhasMes
        : 0
      
      setStats({
        criadasHoje,
        criadasOntem,
        totalCriadasMes,
        crescimentoPercentual,
        ganhasHoje,
        ganhasOntem,
        totalGanhasMes,
        valorTotalGanhasMes,
        crescimentoGanhasPercentual,
        acumuladoMes,
        acumuladoMesAnterior,
        metaMes,
        metaVsMesAnterior,
        perdidasMes,
        taxaConversao,
        ticketMedio
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setLoadingStats(false)
    }
  }, [mesAtual, anoAtual, diaAtual, createAbortController])

  const fetchRecentes = useCallback(async () => {
    try {
      setLoadingRecentes(true)
      const controller = createAbortController('recentes')
      
      const response = await fetch('/api/oportunidades/recentes?limit=20', {
        signal: controller.signal
      })
      const data = await response.json()
      
      if (data.success && data.oportunidades && data.oportunidades.length > 0) {
        setOportunidadesRecentes(data.oportunidades)
      } else {
        setOportunidadesRecentes(OPORTUNIDADES_SIMULADAS)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setOportunidadesRecentes(OPORTUNIDADES_SIMULADAS)
    } finally {
      setLoadingRecentes(false)
    }
  }, [createAbortController])

  const refetchAll = useCallback(async () => {
    await Promise.all([
      fetchUnidades(),
      fetchGraficos(),
      fetchStats(),
      fetchRecentes()
    ])
  }, [fetchUnidades, fetchGraficos, fetchStats, fetchRecentes])

  useEffect(() => {
    refetchAll()
  }, [refetchAll])

  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  return {
    unidades,
    oportunidadesRecentes,
    oportunidadesCriadas,
    receitaDiaria,
    stats,
    filtros,
    loading,
    loadingGraficos,
    loadingStats,
    loadingRecentes,
    error,
    filtrosAtivos,
    setFiltros,
    refetchAll
  }
}

