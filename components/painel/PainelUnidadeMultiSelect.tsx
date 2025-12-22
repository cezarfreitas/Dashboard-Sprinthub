'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

interface PainelUnidadeMultiSelectProps {
  unidadesList: Array<{ id: number; nome: string }>
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

export default function PainelUnidadeMultiSelect({
  unidadesList,
  selectedIds,
  onChange
}: PainelUnidadeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleUnidade = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const toggleAll = () => {
    if (selectedIds.length === unidadesList.length) {
      onChange([])
    } else {
      onChange(unidadesList.map(u => u.id))
    }
  }

  const getDisplayText = () => {
    if (selectedIds.length === 0) {
      return 'Selecione unidades...'
    }
    if (selectedIds.length === unidadesList.length) {
      return 'Todas as unidades'
    }
    if (selectedIds.length === 1) {
      const unidade = unidadesList.find(u => u.id === selectedIds[0])
      return unidade?.nome || 'Selecione unidades...'
    }
    return `${selectedIds.length} unidades selecionadas`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full h-9 text-xs justify-between font-normal bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className={`ml-2 h-3 w-3 shrink-0 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-white border-gray-200 shadow-lg" align="start">
        <div className="flex flex-col">
          {/* Opção "Todas" */}
          <div
            className="flex items-center px-3 py-2 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
            onMouseDown={(e) => {
              e.preventDefault()
              toggleAll()
            }}
          >
            <Checkbox
              id="select-all"
              checked={selectedIds.length === unidadesList.length && unidadesList.length > 0}
              onCheckedChange={toggleAll}
              className="mr-2"
              onClick={(e) => e.stopPropagation()}
            />
            <label
              htmlFor="select-all"
              className="flex-1 text-xs font-semibold text-gray-700 cursor-pointer py-1"
            >
              Todas as unidades
            </label>
          </div>

          {/* Lista de unidades com scroll */}
          <ScrollArea className="h-[300px]">
            <div className="p-1">
              {unidadesList.map(unidade => {
                const isChecked = selectedIds.includes(unidade.id)
                return (
                  <div
                    key={unidade.id}
                    className="flex items-center px-3 py-2 rounded-sm hover:bg-gray-50 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      toggleUnidade(unidade.id)
                    }}
                  >
                    <Checkbox
                      id={`unidade-${unidade.id}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleUnidade(unidade.id)}
                      className="mr-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label
                      htmlFor={`unidade-${unidade.id}`}
                      className="flex-1 text-xs text-gray-700 cursor-pointer py-1 truncate"
                      title={unidade.nome}
                    >
                      {unidade.nome}
                    </label>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}

