import { useState, useEffect, useCallback, useRef } from 'react'

export interface VendedorFila {
  id: number
  nome: string
  sequencia: number
  total_distribuicoes?: number
  ausencia_retorno?: string | null
}

export interface FilaLeads {
  id: number
  unidade_id: number
  unidade_nome: string
  total_vendedores: number
  vendedores_fila: VendedorFila[]
  ultima_distribuicao: string | null
  ultima_distribuicao_vendedor: string | null
  ultima_distribuicao_lead_id: number | null
  ultima_distribuicao_total_fila: number | null
  total_leads_distribuidos: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface FilaLeadsStats {
  total_unidades: number
  unidades_com_fila: number
  total_vendedores: number
  total_leads_distribuidos: number
  ultima_atualizacao: string | null
}

interface UseFilaLeadsReturn {
  filas: FilaLeads[]
  stats: FilaLeadsStats | null
  loading: boolean
  error: string
  searchTerm: string
  setSearchTerm: (term: string) => void
  refreshFilas: (showLoading?: boolean) => Promise<void>
  updateFilaVendedores: (unidadeId: number, vendedores: VendedorFila[]) => Promise<void>
  toggleFilaStatus: (unidadeId: number, currentStatus: boolean) => Promise<void>
}

export function useFilaLeads(): UseFilaLeadsReturn {
  const [filas, setFilas] = useState<FilaLeads[]>([])
  const [stats, setStats] = useState<FilaLeadsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchFilas = useCallback(async (showLoading = true) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      if (showLoading) {
        setLoading(true)
      }
      setError('')

      // Buscar gestor do localStorage
      let gestorId: string | null = null
      try {
        const gestorData = localStorage.getItem('gestor')
        if (gestorData) {
          const gestor = JSON.parse(gestorData)
          gestorId = gestor.id?.toString() || null
        }
      } catch (e) {
        // Ignore errors
      }

      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const headers: HeadersInit = {}
      if (gestorId) {
        headers['x-gestor-id'] = gestorId
      }

      const response = await fetch(`/api/fila?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
        headers
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar filas de leads')
      }

      const data = await response.json()
      
      if (data.success) {
        setFilas(data.filas || [])
        setStats(data.stats || null)
      } else {
        throw new Error(data.message || 'Erro ao carregar filas de leads')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      setError(err.message || 'Erro ao carregar filas de leads')
    } finally {
      if (showLoading) {
        setLoading(false)
      }
      abortControllerRef.current = null
    }
  }, [searchTerm])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchFilas()
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [fetchFilas])

  const refreshFilas = useCallback(async (showLoading = true) => {
    await fetchFilas(showLoading)
  }, [fetchFilas])

  const updateFilaVendedores = useCallback(async (unidadeId: number, vendedores: VendedorFila[]) => {
    try {
      const response = await fetch(`/api/fila/${unidadeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vendedores }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar fila de vendedores')
      }

      const data = await response.json()
      
      if (data.success) {
        await refreshFilas(false)
      } else {
        throw new Error(data.message || 'Erro ao atualizar fila de vendedores')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar fila de vendedores')
      throw err
    }
  }, [refreshFilas])

  const toggleFilaStatus = useCallback(async (unidadeId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/fila/${unidadeId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ativo: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error('Erro ao alternar status da fila')
      }

      const data = await response.json()
      
      if (data.success) {
        await refreshFilas(false)
      } else {
        throw new Error(data.message || 'Erro ao alternar status da fila')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao alternar status da fila')
      throw err
    }
  }, [refreshFilas])

  return {
    filas,
    stats,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    refreshFilas,
    updateFilaVendedores,
    toggleFilaStatus
  }
}

