'use client'

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'

interface DashboardFilters {
  mes: number
  ano: number
  vendedorId: number | null
  unidadeId: number | null
}

interface DashboardFiltersContextValue extends DashboardFilters {
  setMes: (mes: number) => void
  setAno: (ano: number) => void
  setVendedorId: (id: number | null) => void
  setUnidadeId: (id: number | null) => void
  resetFilters: () => void
}

const DashboardFiltersContext = createContext<DashboardFiltersContextValue | undefined>(undefined)

interface DashboardFiltersProviderProps {
  children: ReactNode
}

export function DashboardFiltersProvider({ children }: DashboardFiltersProviderProps) {
  const dataAtual = useMemo(() => new Date(), [])
  
  const [mes, setMes] = useState(dataAtual.getMonth() + 1)
  const [ano, setAno] = useState(dataAtual.getFullYear())
  const [vendedorId, setVendedorId] = useState<number | null>(null)
  const [unidadeId, setUnidadeId] = useState<number | null>(null)

  const resetFilters = useCallback(() => {
    const now = new Date()
    setMes(now.getMonth() + 1)
    setAno(now.getFullYear())
    setVendedorId(null)
    setUnidadeId(null)
  }, [])

  const value = useMemo(() => ({
    mes,
    ano,
    vendedorId,
    unidadeId,
    setMes,
    setAno,
    setVendedorId,
    setUnidadeId,
    resetFilters
  }), [mes, ano, vendedorId, unidadeId, resetFilters])

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  )
}

export function useDashboardFilters() {
  const context = useContext(DashboardFiltersContext)
  
  if (context === undefined) {
    throw new Error('useDashboardFilters must be used within DashboardFiltersProvider')
  }
  
  return context
}

