import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { PainelUnidade, PainelFiltros } from '@/types/painel.types'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface UsePainelUnidadesReturn {
  unidades: PainelUnidade[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePainelUnidades(
  filtros: PainelFiltros,
  mesAtual: number,
  anoAtual: number
): UsePainelUnidadesReturn {
  const { user, loading: authLoading } = useAuthSistema()
  const [unidades, setUnidades] = useState<PainelUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Memoizar chave de filtros para evitar recriação desnecessária
  const filtrosKey = useMemo(() => {
    return JSON.stringify({
      periodoInicio: filtros.periodoInicio,
      periodoFim: filtros.periodoFim,
      unidades: filtros.unidadesSelecionadas?.sort().join(',') || '',
      grupo: filtros.grupoSelecionado,
      funil: filtros.funilSelecionado
    })
  }, [
    filtros.periodoInicio,
    filtros.periodoFim,
    filtros.unidadesSelecionadas?.join(','),
    filtros.grupoSelecionado,
    filtros.funilSelecionado
  ])

  const fetchUnidades = useCallback(async (signal: AbortSignal) => {
    if (authLoading || !user) {
      setUnidades([])
      setLoading(false)
      return
    }

    if (!filtros.periodoInicio || !filtros.periodoFim) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar unidades primeiro para ter a lista
      const paramsUnidades = new URLSearchParams()
      if (filtros.unidadesSelecionadas && filtros.unidadesSelecionadas.length > 0) {
        paramsUnidades.append('unidade_id', filtros.unidadesSelecionadas.join(','))
      }

      const [responseUnidades, ...responsesStats] = await Promise.all([
        fetch(`/api/unidades/list?${paramsUnidades.toString()}`, { cache: 'no-store', signal }),
        // Buscar stats para cada unidade (abertas, ganhas, perdidas)
        ...(filtros.unidadesSelecionadas && filtros.unidadesSelecionadas.length > 0
          ? filtros.unidadesSelecionadas.map(unidadeId => {
              const paramsStats = new URLSearchParams()
              paramsStats.append('status', 'open')
              paramsStats.append('created_date_start', filtros.periodoInicio!)
              paramsStats.append('created_date_end', filtros.periodoFim!)
              paramsStats.append('unidade_id', String(unidadeId))
              paramsStats.append('all', '1')
              
              if (filtros.funilSelecionado && filtros.funilSelecionado !== 'todos' && filtros.funilSelecionado !== 'undefined') {
                paramsStats.append('funil_id', String(filtros.funilSelecionado))
              }
              
              return fetch(`/api/oportunidades/stats?${paramsStats.toString()}`, { cache: 'no-store', signal })
            })
          : [])
      ])

      if (signal.aborted) return

      const dataUnidades = await responseUnidades.json()
      
      if (!dataUnidades.success || !dataUnidades.unidades) {
        throw new Error('Erro ao carregar unidades')
      }

      // Buscar stats de ganhas e perdidas também
      const responsesGanhas = filtros.unidadesSelecionadas && filtros.unidadesSelecionadas.length > 0
        ? await Promise.all(
            filtros.unidadesSelecionadas.map(unidadeId => {
              const paramsStats = new URLSearchParams()
              paramsStats.append('status', 'won')
              paramsStats.append('gain_date_start', filtros.periodoInicio!)
              paramsStats.append('gain_date_end', filtros.periodoFim!)
              paramsStats.append('unidade_id', String(unidadeId))
              
              if (filtros.funilSelecionado && filtros.funilSelecionado !== 'todos' && filtros.funilSelecionado !== 'undefined') {
                paramsStats.append('funil_id', String(filtros.funilSelecionado))
              }
              
              return fetch(`/api/oportunidades/stats?${paramsStats.toString()}`, { cache: 'no-store', signal })
            })
          )
        : []

      const responsesPerdidas = filtros.unidadesSelecionadas && filtros.unidadesSelecionadas.length > 0
        ? await Promise.all(
            filtros.unidadesSelecionadas.map(unidadeId => {
              const paramsStats = new URLSearchParams()
              paramsStats.append('status', 'lost')
              paramsStats.append('lost_date_start', filtros.periodoInicio!)
              paramsStats.append('lost_date_end', filtros.periodoFim!)
              paramsStats.append('unidade_id', String(unidadeId))
              
              if (filtros.funilSelecionado && filtros.funilSelecionado !== 'todos' && filtros.funilSelecionado !== 'undefined') {
                paramsStats.append('funil_id', String(filtros.funilSelecionado))
              }
              
              return fetch(`/api/oportunidades/stats?${paramsStats.toString()}`, { cache: 'no-store', signal })
            })
          )
        : []

      if (signal.aborted) return

      const dataStatsAbertas = await Promise.all(responsesStats.map(r => r.json()))
      const dataStatsGanhas = await Promise.all(responsesGanhas.map(r => r.json()))
      const dataStatsPerdidas = await Promise.all(responsesPerdidas.map(r => r.json()))

      // Buscar metas das unidades
      const mesMeta = new Date(filtros.periodoInicio + 'T00:00:00').getMonth() + 1
      const anoMeta = new Date(filtros.periodoInicio + 'T00:00:00').getFullYear()
      
      const unidadesComStats = await Promise.all(
        dataUnidades.unidades.map(async (unidade: any, index: number) => {
          const statsAbertas = dataStatsAbertas[index]?.data || {}
          const statsGanhas = dataStatsGanhas[index]?.data || {}
          const statsPerdidas = dataStatsPerdidas[index]?.data || {}

          // Buscar meta da unidade
          const responseMeta = await fetch(
            `/api/meta/stats?unidade_id=${unidade.id}&mes=${mesMeta}&ano=${anoMeta}`,
            { cache: 'no-store', signal }
          )
          const dataMeta = await responseMeta.json()
          const metaValor = dataMeta.success && dataMeta.data?.meta_valor ? Number(dataMeta.data.meta_valor) : 0

          return {
            id: unidade.id,
            nome: unidade.nome || unidade.name,
            name: unidade.nome || unidade.name,
            nome_exibicao: unidade.nome || unidade.name,
            grupo_id: unidade.grupo_id || null,
            oportunidades_abertas: Number(statsAbertas.total_abertas_geral || statsAbertas.total_abertas || 0),
            oportunidades_ganhas: Number(statsGanhas.total || 0),
            oportunidades_perdidas: Number(statsPerdidas.total || 0),
            valor_aberto: Number(statsAbertas.valor_abertas || 0),
            valor_ganho: Number(statsGanhas.valor_total || 0),
            valor_perdido: Number(statsPerdidas.valor_total || 0),
            meta_valor: metaValor
          }
        })
      )

      if (signal.aborted) return

      setUnidades(unidadesComStats)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setUnidades([])
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, filtrosKey])

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    if (!authLoading) {
      fetchUnidades(controller.signal)
    }
    
    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [authLoading, fetchUnidades])

  return {
    unidades,
    loading,
    error,
    refetch: async () => {
      const controller = new AbortController()
      await fetchUnidades(controller.signal)
    },
  }
}

