import { useState, useEffect, useCallback, useRef } from 'react'

export interface VendedorFila {
  id: number
  nome: string
  sequencia: number
  total_distribuicoes?: number
  ausencia_retorno?: string | null
}

export interface Vendedor {
  id: number
  name: string
  lastName: string
  sequencia: number
  isGestor?: boolean
}

export interface Unidade {
  id: number
  name: string
  nome?: string
  grupo_id?: number | null
  grupo_nome?: string | null
  department_id: number | null
  show_sac360: number
  show_crm: number
  create_date: string | null
  update_date: string | null
  total_vendedores: number
  vendedores: string[]
  vendedores_detalhes: Vendedor[]
  user_gestao: number | null
  nome_user_gestao: string | null
  dpto_gestao: number | null
  accs: any[]
  branches: any[]
  subs: any[]
  subs_id: number | null
  fila_leads: VendedorFila[]
  ativo: boolean
  synced_at: string
  created_at: string
  updated_at: string
  // Estatísticas de distribuição
  total_leads_distribuidos?: number
  ultima_distribuicao?: string | null
  ultima_distribuicao_vendedor?: string | null
  ultima_distribuicao_lead_id?: number | null
  ultima_distribuicao_total_fila?: number | null
}

export interface UnidadesStats {
  total: number
  ativas: number
  inativas: number
  ultima_sincronizacao: string | null
}

interface UseUnidadesReturn {
  unidades: Unidade[]
  stats: UnidadesStats | null
  loading: boolean
  error: string
  searchTerm: string
  page: number
  setSearchTerm: (term: string) => void
  setPage: (page: number) => void
  refreshUnidades: (showLoading?: boolean) => Promise<void>
  toggleUnidadeStatus: (unidadeId: number, currentStatus: boolean) => Promise<void>
  updateUnidadeFila: (unidadeId: number, fila: VendedorFila[]) => Promise<void>
}

export function useUnidades(): UseUnidadesReturn {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [stats, setStats] = useState<UnidadesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  
  // Ref to track ongoing requests to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchUnidades = useCallback(async (showLoading = true) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    const controller = new AbortController()
    abortControllerRef.current = controller

    if (showLoading) setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm })
      })
      
      const response = await fetch(`/api/unidades/list?${params}`, {
        signal: controller.signal
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
        throw new Error(errorData.message || 'Erro ao carregar unidades')
      }
      
      const text = await response.text()
      if (!text || text.trim() === '') {
        throw new Error('Resposta vazia do servidor')
      }
      
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError, 'Resposta:', text)
        throw new Error('Resposta inválida do servidor')
      }
      
      // Only update if this request wasn't cancelled
      if (!controller.signal.aborted) {
        setUnidades(data.unidades || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setUnidades([])
      setStats(null)
    } finally {
      if (showLoading && !controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [page, searchTerm])

  const toggleUnidadeStatus = useCallback(async (unidadeId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/unidades/list?id=${unidadeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: !currentStatus })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
        throw new Error(errorData.message || 'Erro ao alterar status da unidade')
      }
      
      const text = await response.text()
      if (!text || text.trim() === '') {
        throw new Error('Resposta vazia do servidor')
      }
      
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError, 'Resposta:', text)
        throw new Error('Resposta inválida do servidor')
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao alterar status da unidade')
      }
      
      // Optimistic update
      setUnidades(prev => prev.map(u => 
        u.id === unidadeId 
          ? { ...u, ativo: !currentStatus }
          : u
      ))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar unidade'
      setError(errorMsg)
      throw err
    }
  }, [])

  const updateUnidadeFila = useCallback(async (unidadeId: number, fila: VendedorFila[]) => {
    try {
      const response = await fetch(`/api/unidades/list?id=${unidadeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fila_leads: fila })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
        throw new Error(errorData.message || 'Erro ao salvar fila')
      }

      const text = await response.text()
      if (!text || text.trim() === '') {
        throw new Error('Resposta vazia do servidor')
      }
      
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError, 'Resposta:', text)
        throw new Error('Resposta inválida do servidor')
      }

      if (!data.success) {
        throw new Error(data.message || 'Erro ao salvar fila')
      }
      
      // Optimistic update
      setUnidades(prev => prev.map(u => 
        u.id === unidadeId 
          ? { ...u, fila_leads: fila }
          : u
      ))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar fila'
      setError(errorMsg)
      throw err
    }
  }, [])

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (page === 1) {
        fetchUnidades(false)
      } else {
        setPage(1)
      }
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchTerm])

  // Fetch on page change
  useEffect(() => {
    fetchUnidades()
  }, [page])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    unidades,
    stats,
    loading,
    error,
    searchTerm,
    page,
    setSearchTerm,
    setPage,
    refreshUnidades: fetchUnidades,
    toggleUnidadeStatus,
    updateUnidadeFila
  }
}

