import React, { memo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, RefreshCw, Building2 } from 'lucide-react'

interface UnidadeFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  totalUnidades: number
  loading: boolean
}

export const UnidadeFilters = memo(function UnidadeFilters({
  searchTerm,
  onSearchChange,
  totalUnidades,
  loading
}: UnidadeFiltersProps) {
  return (
    <div className="flex items-center justify-between mb-4 gap-4">
      <div className="flex items-center space-x-2">
        <Building2 className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Unidades Cadastradas</h2>
        {totalUnidades > 0 && (
          <Badge variant="secondary">{totalUnidades}</Badge>
        )}
      </div>
      
      <div className="relative flex-1 max-w-md">
        {loading ? (
          <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          placeholder="Buscar por nome..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )
})

