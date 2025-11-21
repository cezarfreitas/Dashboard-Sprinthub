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

      const params = new URLSearchParams()
      params.append('date_start', filtros.periodoInicio)
      params.append('date_end', filtros.periodoFim)

      if (filtros.unidadesSelecionadas && filtros.unidadesSelecionadas.length > 0) {
        params.append('unidade_id', filtros.unidadesSelecionadas.join(','))
      }

      if (filtros.grupoSelecionado && filtros.grupoSelecionado !== 'todos' && filtros.grupoSelecionado !== 'undefined') {
        params.append('grupo_id', String(filtros.grupoSelecionado))
      }

      if (filtros.funilSelecionado && filtros.funilSelecionado !== 'todos' && filtros.funilSelecionado !== 'undefined') {
        params.append('funil_id', String(filtros.funilSelecionado))
      }

      const response = await fetch(
        `/api/oportunidades/unidades?${params.toString()}`,
        { cache: 'no-store', signal }
      )
      
      if (signal.aborted) return
      
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao carregar unidades')
      }

      if (signal.aborted) return

      const unidadesMapeadas: PainelUnidade[] = (data.unidades || []).map((item: any) => ({
        id: item.unidade_id,
        nome: item.unidade_nome,
        name: item.unidade_nome,
        nome_exibicao: item.unidade_nome,
        grupo_id: null,
        oportunidades_abertas: item.abertas?.quantidade || 0,
        oportunidades_ganhas: item.ganhas?.quantidade || 0,
        oportunidades_perdidas: item.perdidas?.quantidade || 0,
        valor_aberto: item.abertas?.valor || 0,
        valor_ganho: item.ganhas?.valor || 0,
        valor_perdido: item.perdidas?.valor || 0,
        meta_valor: item.meta?.valor || 0
      }))

      setUnidades(unidadesMapeadas)
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

