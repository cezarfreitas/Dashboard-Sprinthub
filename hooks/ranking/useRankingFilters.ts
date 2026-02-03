'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { calcularPeriodoPorTipo, getAnoFromDateStr, formatDateDisplay } from '@/lib/date-utils'

export interface RankingFiltros {
  unidadesSelecionadas: number[]
  periodoTipo: string
  periodoInicio: string
  periodoFim: string
  funisSelecionados: number[]
  gruposSelecionados: number[]
  gainDateInicio?: string
  gainDateFim?: string
}

export interface UnidadeItem {
  id: number
  nome: string
}

export interface FunilItem {
  id: number
  funil_nome: string
}

export interface GrupoItem {
  id: number
  nome: string
  unidadeIds?: number[]
}

interface UseRankingFiltersReturn {
  filtrosPainel: RankingFiltros
  setFiltrosPainel: React.Dispatch<React.SetStateAction<RankingFiltros>>
  handleFiltrosChange: (novosFiltros: RankingFiltros) => void
  periodoInicial: { inicio: string; fim: string }
  anoDoPeríodo: number
  tituloPeriodo: string
  filtrosAtivos: boolean
  funilNomeSelecionado: string | null
  grupoNomeSelecionado: string | null
  dataGanhoLabel: string | null
  unidadesList: UnidadeItem[]
  funis: FunilItem[]
  grupos: GrupoItem[]
  isLoadingAuxData: boolean
}

export function useRankingFilters(): UseRankingFiltersReturn {
  // Período inicial calculado uma única vez
  const periodoInicial = useMemo(() => calcularPeriodoPorTipo('este-mes'), [])
  
  // Estado único para todos os filtros
  const [filtrosPainel, setFiltrosPainel] = useState<RankingFiltros>(() => ({
    unidadesSelecionadas: [],
    periodoTipo: 'este-mes',
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funisSelecionados: [],
    gruposSelecionados: [],
    gainDateInicio: undefined,
    gainDateFim: undefined
  }))
  
  // Dados auxiliares para os filtros
  const [unidadesList, setUnidadesList] = useState<UnidadeItem[]>([])
  const [funis, setFunis] = useState<FunilItem[]>([])
  const [grupos, setGrupos] = useState<GrupoItem[]>([])
  const [isLoadingAuxData, setIsLoadingAuxData] = useState(true)
  
  // Ref para AbortController
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Derivar ano do período selecionado
  const anoDoPeríodo = useMemo(() => {
    return getAnoFromDateStr(filtrosPainel.periodoInicio)
  }, [filtrosPainel.periodoInicio])
  
  // Verificar se há filtros ativos
  const filtrosAtivos = useMemo(() => {
    return filtrosPainel.unidadesSelecionadas.length > 0 ||
           filtrosPainel.periodoTipo !== 'este-mes' ||
           filtrosPainel.funisSelecionados.length > 0 ||
           filtrosPainel.gruposSelecionados.length > 0 ||
           filtrosPainel.gainDateInicio !== undefined ||
           filtrosPainel.gainDateFim !== undefined
  }, [filtrosPainel])
  
  // Formatar título do período para exibição
  const tituloPeriodo = useMemo(() => {
    if (filtrosPainel.periodoInicio && filtrosPainel.periodoFim) {
      return `${formatDateDisplay(filtrosPainel.periodoInicio)} a ${formatDateDisplay(filtrosPainel.periodoFim)}`
    }
    return 'Período não definido'
  }, [filtrosPainel.periodoInicio, filtrosPainel.periodoFim])

  const funilNomeSelecionado = useMemo(() => {
    if (filtrosPainel.funisSelecionados.length === 0) return null
    if (filtrosPainel.funisSelecionados.length === 1) {
      const found = funis.find((f) => Number(f.id) === filtrosPainel.funisSelecionados[0])
      return found?.funil_nome || `Funil ${filtrosPainel.funisSelecionados[0]}`
    }
    return `${filtrosPainel.funisSelecionados.length} funis`
  }, [filtrosPainel.funisSelecionados, funis])

  const grupoNomeSelecionado = useMemo(() => {
    if (filtrosPainel.gruposSelecionados.length === 0) return null
    if (filtrosPainel.gruposSelecionados.length === 1) {
      const found = grupos.find((g) => Number(g.id) === filtrosPainel.gruposSelecionados[0])
      return found?.nome || `Grupo ${filtrosPainel.gruposSelecionados[0]}`
    }
    return `${filtrosPainel.gruposSelecionados.length} grupos`
  }, [filtrosPainel.gruposSelecionados, grupos])

  const dataGanhoLabel = useMemo(() => {
    if (!filtrosPainel.gainDateInicio && !filtrosPainel.gainDateFim) return null
    const inicio = filtrosPainel.gainDateInicio ? filtrosPainel.gainDateInicio.split('-').reverse().join('/') : '...'
    const fim = filtrosPainel.gainDateFim ? filtrosPainel.gainDateFim.split('-').reverse().join('/') : '...'
    return `Ganho: ${inicio} a ${fim}`
  }, [filtrosPainel.gainDateInicio, filtrosPainel.gainDateFim])
  
  // Buscar dados auxiliares (unidades, funis, grupos) - apenas uma vez
  useEffect(() => {
    const fetchAuxData = async () => {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal
      
      setIsLoadingAuxData(true)
      
      try {
        const [unidadesRes, funisRes, gruposRes] = await Promise.all([
          fetch('/api/unidades', { signal }),
          fetch('/api/funis', { signal }),
          fetch('/api/unidades/grupos', { signal })
        ])
        
        if (signal.aborted) return
        
        if (unidadesRes.ok) {
          const unidadesData = await unidadesRes.json()
          setUnidadesList(unidadesData.unidades?.map((u: Record<string, unknown>) => ({
            id: u.id as number,
            nome: (u.nome || u.name || 'Sem nome') as string
          })) || [])
        }
        
        if (funisRes.ok) {
          const funisData = await funisRes.json()
          setFunis(funisData.funis || [])
        }
        
        if (gruposRes.ok) {
          const gruposData = await gruposRes.json()
          setGrupos(gruposData.grupos || [])
        }
      } catch (error) {
        // Ignorar erros de abort
        if (error instanceof Error && error.name === 'AbortError') return
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoadingAuxData(false)
        }
      }
    }
    
    fetchAuxData()
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])
  
  // Handler para mudança de filtros - atualiza período quando tipo muda
  const handleFiltrosChange = useCallback((novosFiltros: RankingFiltros) => {
    // Se o tipo de período mudou e não é personalizado, recalcular datas
    if (novosFiltros.periodoTipo !== filtrosPainel.periodoTipo && novosFiltros.periodoTipo !== 'personalizado') {
      const { inicio, fim } = calcularPeriodoPorTipo(novosFiltros.periodoTipo)
      setFiltrosPainel({
        ...novosFiltros,
        periodoInicio: inicio,
        periodoFim: fim
      })
    } else {
      setFiltrosPainel(novosFiltros)
    }
  }, [filtrosPainel.periodoTipo])
  
  return {
    filtrosPainel,
    setFiltrosPainel,
    handleFiltrosChange,
    periodoInicial,
    anoDoPeríodo,
    tituloPeriodo,
    filtrosAtivos,
    funilNomeSelecionado,
    grupoNomeSelecionado,
    dataGanhoLabel,
    unidadesList,
    funis,
    grupos,
    isLoadingAuxData
  }
}
