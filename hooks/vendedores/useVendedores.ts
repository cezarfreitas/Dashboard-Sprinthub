import { useState, useEffect, useCallback, useRef } from 'react'

export interface VendedorMySQL {
  id: number
  name: string
  lastName: string
  email: string
  cpf: string | null
  username: string
  birthDate: string
  telephone: string | null
  photo: string | null
  admin: number
  branch: string | null
  position_company: string | null
  skills: string | null
  state: string | null
  city: string | null
  whatsapp_automation: string | null
  ativo: boolean
  last_login: string | null
  last_action: string | null
  status: 'active' | 'inactive' | 'blocked'
  synced_at: string
  created_at: string
  updated_at: string
}

export interface VendedoresStats {
  total: number
  active: number
  inactive: number
  blocked: number
  com_telefone: number
  com_cpf: number
  admins: number
  ultima_sincronizacao: string | null
}

interface UseVendedoresReturn {
  vendedores: VendedorMySQL[]
  stats: VendedoresStats | null
  loading: boolean
  error: string
  searchTerm: string
  page: number
  setSearchTerm: (term: string) => void
  setPage: (page: number) => void
  refreshVendedores: (showLoading?: boolean) => Promise<void>
  toggleVendedorStatus: (vendedorId: number, currentStatus: boolean) => Promise<void>
}

export function useVendedores(): UseVendedoresReturn {
  const [vendedores, setVendedores] = useState<VendedorMySQL[]>([])
  const [stats, setStats] = useState<VendedoresStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  
  // Ref to track ongoing requests to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchVendedores = useCallback(async (showLoading = true) => {
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
      
      const response = await fetch(`/api/vendedores/mysql?${params}`, {
        signal: controller.signal
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar vendedores')
      }
      
      // Only update if this request wasn't cancelled
      if (!controller.signal.aborted) {
        setVendedores(data.vendedores || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setVendedores([])
      setStats(null)
    } finally {
      if (showLoading && !controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [page, searchTerm])

  const toggleVendedorStatus = useCallback(async (vendedorId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/vendedores/mysql?id=${vendedorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: !currentStatus })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao alterar status do vendedor')
      }
      
      // Optimistic update
      setVendedores(prev => prev.map(v => 
        v.id === vendedorId 
          ? { ...v, ativo: !currentStatus }
          : v
      ))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar vendedor'
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
        fetchVendedores(false)
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
    fetchVendedores()
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
    vendedores,
    stats,
    loading,
    error,
    searchTerm,
    page,
    setSearchTerm,
    setPage,
    refreshVendedores: fetchVendedores,
    toggleVendedorStatus
  }
}

