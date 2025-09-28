"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Filter, X, Calendar, Building2, User } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Unidade {
  id: number
  nome: string
  gerente: string
}

interface Vendedor {
  id: number
  name: string
  lastName: string
  unidade_id?: number
}

interface CompactFiltersProps {
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

export default function CompactFilters({ 
  onFiltersChange, 
  initialFilters,
  showPeriodo = true,
  showUnidades = true,
  showVendedores = true,
  className = ""
}: CompactFiltersProps) {
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
      const url = unidadeId ? `/api/vendedores/mysql?unidade_id=${unidadeId}` : '/api/vendedores/mysql'
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
    const vendedor = vendedores.find(v => v.id.toString() === filters.vendedorId)
    return vendedor ? `${vendedor.name} ${vendedor.lastName}` : 'Vendedor selecionado'
  }

  const getPeriodoText = () => {
    return new Date(filters.periodo.ano, filters.periodo.mes - 1).toLocaleDateString('pt-BR', { 
      month: 'short', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button variant="outline" size="sm" disabled>
          <Filter className="h-4 w-4 mr-2" />
          Carregando...
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Período - sempre visível se ativado */}
      {showPeriodo && (
        <div className="flex items-center space-x-1">
          <Select
            value={filters.periodo.mes.toString()}
            onValueChange={(value) => handlePeriodoChange(parseInt(value), filters.periodo.ano)}
          >
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                <SelectItem key={mes} value={mes.toString()} className="text-xs">
                  {new Date(2024, mes - 1).toLocaleDateString('pt-BR', { month: 'short' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={filters.periodo.ano.toString()}
            onValueChange={(value) => handlePeriodoChange(filters.periodo.mes, parseInt(value))}
          >
            <SelectTrigger className="w-16 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(ano => (
                <SelectItem key={ano} value={ano.toString()} className="text-xs">
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Unidade - dropdown compacto */}
      {showUnidades && (
        <Select
          value={filters.unidadeId?.toString() || 'all'}
          onValueChange={handleUnidadeChange}
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todas</SelectItem>
            {unidades.map(unidade => (
              <SelectItem key={unidade.id} value={unidade.id.toString()} className="text-xs">
                {unidade.nome.length > 15 ? `${unidade.nome.substring(0, 15)}...` : unidade.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Vendedor - dropdown compacto */}
      {showVendedores && (
        <Select
          value={filters.vendedorId || 'all'}
          onValueChange={handleVendedorChange}
          disabled={!filters.unidadeId && unidades.length > 0}
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <User className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos</SelectItem>
            {vendedores.map(vendedor => (
              <SelectItem key={vendedor.id} value={vendedor.id.toString()} className="text-xs">
                {`${vendedor.name} ${vendedor.lastName}`.length > 15 
                  ? `${vendedor.name} ${vendedor.lastName}`.substring(0, 15) + '...'
                  : `${vendedor.name} ${vendedor.lastName}`
                }
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Botão limpar filtros */}
      {getActiveFiltersCount() > 0 && (
        <Button 
          onClick={clearFilters} 
          variant="ghost" 
          size="sm"
          className="h-8 px-2"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Badge com contador de filtros ativos */}
      {getActiveFiltersCount() > 0 && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
          {getActiveFiltersCount()}
        </Badge>
      )}
    </div>
  )
}
