'use client'

import { memo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

interface MetasCellProps {
  value: number
  isEditing: boolean
  editValue: string
  onStartEdit: () => void
  onEditChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

const formatCurrency = (value: number): string => {
  if (!value || isNaN(value)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const MetasCell = memo(function MetasCell({
  value,
  isEditing,
  editValue,
  onStartEdit,
  onEditChange,
  onSave,
  onCancel
}: MetasCellProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }, [onSave, onCancel])

  if (isEditing) {
    return (
      <div className="relative">
        <Input
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={handleKeyDown}
          className="w-20 h-7 text-center bg-white text-[0.675rem] font-medium [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
          autoFocus
          placeholder="0"
          type="number"
          step="0.01"
          min="0"
        />
      </div>
    )
  }

  const hasValue = value && value > 0 && !isNaN(value)
  const displayValue = hasValue ? formatCurrency(value) : 'Meta'
  const displayClass = hasValue 
    ? 'text-green-700 font-semibold text-[0.675rem]' 
    : 'text-gray-400 text-[0.675rem]'
  
  const cellBgClass = hasValue 
    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'

  return (
    <div 
      className={`w-20 h-7 flex items-center justify-center text-xs border-2 cursor-pointer rounded-md transition-all duration-200 ${cellBgClass}`}
      onClick={onStartEdit}
      title={hasValue ? `Meta: ${displayValue}` : 'Clique para definir meta'}
    >
      <span className={displayClass}>
        {hasValue ? displayValue : <Plus className="h-3 w-3" />}
      </span>
    </div>
  )
})

