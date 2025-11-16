'use client'

import { memo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Building2, Users } from 'lucide-react'

interface MetasFiltersProps {
  selectedAno: number
  visualizacao: 'unidade' | 'geral'
  onAnoChange: (ano: number) => void
  onVisualizacaoChange: (viz: 'unidade' | 'geral') => void
}

const ANOS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

export const MetasFilters = memo(function MetasFilters({
  selectedAno,
  visualizacao,
  onAnoChange,
  onVisualizacaoChange
}: MetasFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Ano:</span>
        <Select value={selectedAno.toString()} onValueChange={(value) => onAnoChange(parseInt(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANOS.map(ano => (
              <SelectItem key={ano} value={ano.toString()}>
                {ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Visualização:</span>
        <div className="flex items-center space-x-1">
          <Button
            variant={visualizacao === 'unidade' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onVisualizacaoChange('unidade')}
            className="text-xs"
          >
            <Building2 className="h-3 w-3 mr-1" />
            Por Unidade
          </Button>
          <Button
            variant={visualizacao === 'geral' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onVisualizacaoChange('geral')}
            className="text-xs"
          >
            <Users className="h-3 w-3 mr-1" />
            Geral
          </Button>
        </div>
      </div>
    </div>
  )
})

