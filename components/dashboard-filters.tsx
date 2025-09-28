"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Filter, X, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Unidade {
  id: number
  nome: string
  gerente: string
}

interface Vendedor {
  id: string
  name: string
  unidade_id?: number
}

interface DashboardFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  initialFilters?: FilterState
  showPeriodo?: boolean
  showUnidades?: boolean
  showVendedores?: boolean
  className?: string
}

export interface FilterState {
  periodo: {
    mes: number
    ano: number
  }
  unidadeId?: number
  vendedorId?: string
  dateRange?: {
    from: Date
    to: Date
  }
}

export default function DashboardFilters({ 
  onFiltersChange, 
  initialFilters,
  showPeriodo = true,
  showUnidades = true,
  showVendedores = true,
  className = ""
}: DashboardFiltersProps) {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    periodo: {
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear()
    },
    ...initialFilters
  })

  // Carregar unidades
  const fetchUnidades = async () => {
    if (!showUnidades) return
    
    try {
      const response = await fetch('/api/unidades')
      if (response.ok) {
        const data = await response.json()
        setUnidades(data.unidades || [])
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error)
    }
  }

  // Carregar vendedores
  const fetchVendedores = async (unidadeId?: number) => {
    if (!showVendedores) return
    
    try {
      const url = unidadeId ? `/api/vendedores?unidade_id=${unidadeId}` : '/api/vendedores'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setVendedores(data.vendedores || [])
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const promises = []
      
      if (showUnidades) promises.push(fetchUnidades())
      if (showVendedores) promises.push(fetchVendedores())
      
      await Promise.all(promises)
      setLoading(false)
    }
    loadData()
  }, [showUnidades, showVendedores])

  // Carregar vendedores quando unidade mudar
  useEffect(() => {
    if (!showVendedores) return
    
    if (filters.unidadeId) {
      fetchVendedores(filters.unidadeId)
    } else {
      fetchVendedores()
    }
  }, [filters.unidadeId, showVendedores])

  // Notificar mudanças nos filtros
  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const handlePeriodoChange = (mes: number, ano: number) => {
    setFilters(prev => ({
      ...prev,
      periodo: { mes, ano }
    }))
  }

  const handleUnidadeChange = (unidadeId: string) => {
    const id = unidadeId === 'all' ? undefined : parseInt(unidadeId)
    setFilters(prev => ({
      ...prev,
      unidadeId: id,
      vendedorId: undefined // Reset vendedor quando unidade muda
    }))
  }

  const handleVendedorChange = (vendedorId: string) => {
    const id = vendedorId === 'all' ? undefined : vendedorId
    setFilters(prev => ({
      ...prev,
      vendedorId: id
    }))
  }

  const clearFilters = () => {
    setFilters({
      periodo: {
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear()
      }
    })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.unidadeId) count++
    if (filters.vendedorId) count++
    if (filters.dateRange) count++
    return count
  }

  const getSelectedUnidadeName = () => {
    if (!filters.unidadeId) return 'Todas as unidades'
    const unidade = unidades.find(u => u.id === filters.unidadeId)
    return unidade?.nome || 'Unidade selecionada'
  }

  const getSelectedVendedorName = () => {
    if (!filters.vendedorId) return 'Todos os vendedores'
    const vendedor = vendedores.find(v => v.id === filters.vendedorId)
    return vendedor?.name || 'Vendedor selecionado'
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Carregando filtros...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calcular número de colunas baseado nos filtros ativos
  const activeFiltersCount = [showPeriodo, showUnidades, showVendedores].filter(Boolean).length
  const gridCols = activeFiltersCount === 1 ? 'grid-cols-1' : 
                   activeFiltersCount === 2 ? 'grid-cols-1 md:grid-cols-2' : 
                   'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </CardTitle>
          <Button 
            onClick={clearFilters} 
            variant="ghost" 
            size="sm"
            disabled={getActiveFiltersCount() === 0}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className={`grid ${gridCols} gap-4`}>
          {/* Período */}
          {showPeriodo && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <div className="flex gap-2">
                <Select
                  value={filters.periodo.mes.toString()}
                  onValueChange={(value) => handlePeriodoChange(parseInt(value), filters.periodo.ano)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                      <SelectItem key={mes} value={mes.toString()}>
                        {new Date(2024, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={filters.periodo.ano.toString()}
                  onValueChange={(value) => handlePeriodoChange(filters.periodo.mes, parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(ano => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Unidade */}
          {showUnidades && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Unidade</label>
              <Select
                value={filters.unidadeId?.toString() || 'all'}
                onValueChange={handleUnidadeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {unidades.map(unidade => (
                    <SelectItem key={unidade.id} value={unidade.id.toString()}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Vendedor */}
          {showVendedores && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendedor</label>
              <Select
                value={filters.vendedorId || 'all'}
                onValueChange={handleVendedorChange}
                disabled={!filters.unidadeId && unidades.length > 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {vendedores.map(vendedor => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Resumo dos filtros - só mostra se há mais de um filtro ativo */}
          {activeFiltersCount > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtros Ativos</label>
              <div className="space-y-1">
                {showPeriodo && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(filters.periodo.ano, filters.periodo.mes - 1).toLocaleDateString('pt-BR', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </div>
                )}
                {showUnidades && (
                  <div className="text-xs text-muted-foreground">
                    {getSelectedUnidadeName()}
                  </div>
                )}
                {showVendedores && (
                  <div className="text-xs text-muted-foreground">
                    {getSelectedVendedorName()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
