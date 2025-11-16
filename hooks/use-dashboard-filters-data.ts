'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface Vendedor {
  id: number
  name: string
  lastName: string
}

export interface Unidade {
  id: number
  nome: string
  users?: string | number[]
}

interface UseDashboardFiltersDataReturn {
  vendedores: Vendedor[]
  unidades: Unidade[]
  loading: boolean
  loadingVendedores: boolean
  fetchVendedoresByUnidade: (unidadeId: number | null) => Promise<void>
}

export function useDashboardFiltersData(): UseDashboardFiltersDataReturn {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingVendedores, setLoadingVendedores] = useState(false)
  
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const createAbortController = useCallback((key: string): AbortController => {
    const existing = abortControllersRef.current.get(key)
    if (existing) {
      existing.abort()
    }
    const controller = new AbortController()
    abortControllersRef.current.set(key, controller)
    return controller
  }, [])

  const fetchUnidades = useCallback(async () => {
    try {
      setLoading(true)
      const controller = createAbortController('unidades')
      
      const response = await fetch('/api/unidades', {
        signal: controller.signal
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.unidades)) {
          const unidadesComNome = data.unidades.map((u: Unidade) => ({
            ...u,
            nome: u.nome || 'Sem nome'
          }))
          setUnidades(unidadesComNome)
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setLoading(false)
    }
  }, [createAbortController])

  const fetchVendedoresByUnidade = useCallback(async (unidadeId: number | null) => {
    try {
      setLoadingVendedores(true)
      const controller = createAbortController('vendedores')
      
      if (unidadeId) {
        const [unidadeRes, vendedoresRes] = await Promise.all([
          fetch(`/api/unidades/${unidadeId}`, { signal: controller.signal }),
          fetch('/api/vendedores/mysql', { signal: controller.signal })
        ])

        const [unidadeData, vendedoresData] = await Promise.all([
          unidadeRes.json(),
          vendedoresRes.json()
        ])
        
        if (unidadeData.success && unidadeData.unidade?.users && vendedoresData.success) {
          try {
            const users = typeof unidadeData.unidade.users === 'string'
              ? JSON.parse(unidadeData.unidade.users)
              : unidadeData.unidade.users
            
            if (Array.isArray(users)) {
              const userIds = users
                .map((u: unknown) => typeof u === 'object' && u !== null && 'id' in u ? (u as { id: number }).id : u)
                .filter((id: unknown): id is number => typeof id === 'number')
              
              const vendedoresFiltrados = (vendedoresData.vendedores || []).filter(
                (v: Vendedor) => userIds.includes(v.id)
              )
              setVendedores(vendedoresFiltrados)
              return
            }
          } catch {
            setVendedores([])
            return
          }
        }
        setVendedores([])
      } else {
        const response = await fetch('/api/vendedores/mysql', {
          signal: controller.signal
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setVendedores(data.vendedores || [])
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setVendedores([])
    } finally {
      setLoadingVendedores(false)
    }
  }, [createAbortController])

  useEffect(() => {
    fetchUnidades()
  }, [fetchUnidades])

  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  return {
    vendedores,
    unidades,
    loading,
    loadingVendedores,
    fetchVendedoresByUnidade
  }
}

