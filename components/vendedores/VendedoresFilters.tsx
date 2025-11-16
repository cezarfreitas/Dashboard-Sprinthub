import React, { memo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CardTitle } from '@/components/ui/card'
import { Search, Users } from 'lucide-react'

interface VendedoresFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  totalVendedores: number
}

export const VendedoresFilters = memo(function VendedoresFilters({
  searchTerm,
  onSearchChange,
  totalVendedores
}: VendedoresFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center space-x-2">
        <Users className="h-5 w-5" />
        <span>Vendedores Cadastrados</span>
        {totalVendedores > 0 && (
          <Badge variant="secondary">{totalVendedores}</Badge>
        )}
      </CardTitle>
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, username, telefone..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )
})

