import { useState, useEffect, useCallback, useMemo } from 'react'
import type { PainelUnidade, PainelFiltros } from '@/types/painel.types'

interface UsePainelUnidadesReturn {
  unidades: PainelUnidade[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Função para calcular período baseado no tipo
function calcularPeriodo(tipo: string): { inicio: string; fim: string } {
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

export function usePainelUnidades(
  filtros: PainelFiltros,
  mesAtual: number,
  anoAtual: number
): UsePainelUnidadesReturn {
  const [unidades, setUnidades] = useState<PainelUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calcular período baseado no tipo de filtro
  const periodoCalculado = useMemo(() => {
    if (filtros.periodoTipo === 'personalizado' && filtros.periodoInicio && filtros.periodoFim) {
      return {
        inicio: filtros.periodoInicio,
        fim: filtros.periodoFim
      }
    } else if (filtros.periodoTipo !== 'personalizado') {
      return calcularPeriodo(filtros.periodoTipo)
    }
    return { inicio: '', fim: '' }
  }, [filtros.periodoTipo, filtros.periodoInicio, filtros.periodoFim])

  const fetchUnidades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()

      // Se há período calculado, usar data_inicio/data_fim
      if (periodoCalculado.inicio && periodoCalculado.fim) {
        params.append('data_inicio', periodoCalculado.inicio)
        params.append('data_fim', periodoCalculado.fim)
      } else {
        // Senão, usar mês/ano atual
        params.append('mes', mesAtual.toString())
        params.append('ano', anoAtual.toString())
      }

      if (filtros.unidadeSelecionada !== 'todas') {
        params.append('unidade_id', filtros.unidadeSelecionada)
      }

      if (filtros.grupoSelecionado !== 'todos') {
        params.append('grupo_id', filtros.grupoSelecionado)
      }

      if (filtros.funilSelecionado !== 'todos') {
        params.append('funil_id', filtros.funilSelecionado)
      }

      const response = await fetch(`/api/unidades/painel?${params.toString()}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao carregar unidades')
      }

      setUnidades(data.unidades || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setUnidades([])
    } finally {
      setLoading(false)
    }
  }, [filtros, mesAtual, anoAtual, periodoCalculado])

  useEffect(() => {
    fetchUnidades()
  }, [fetchUnidades])

  return {
    unidades,
    loading,
    error,
    refetch: fetchUnidades,
  }
}

