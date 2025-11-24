import React, { memo } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface FilaLeadsFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  totalFilas?: number
  loading?: boolean
}

export const FilaLeadsFilters = memo(function FilaLeadsFilters({
  searchTerm,
  onSearchChange,
  totalFilas,
  loading = false
}: FilaLeadsFiltersProps) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por unidade..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              disabled={loading}
            />
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

