'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface PainelMultiSelectItem {
  id: number
  label: string
}

interface PainelMultiSelectProps {
  items: PainelMultiSelectItem[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  placeholder?: string
  allLabel?: string
  width?: string
}

export default function PainelMultiSelect({
  items,
  selectedIds,
  onChange,
  placeholder = 'Selecione...',
  allLabel = 'Todos',
  width = '180px'
}: PainelMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleItem = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const toggleAll = () => {
    if (selectedIds.length === items.length) {
      onChange([])
    } else {
      onChange(items.map((item) => item.id))
    }
  }

  const getDisplayText = () => {
    if (selectedIds.length === 0) {
      return allLabel
    }
    if (selectedIds.length === items.length) {
      return allLabel
    }
    if (selectedIds.length === 1) {
      const item = items.find((i) => i.id === selectedIds[0])
      return item?.label ?? allLabel
    }
    return `${selectedIds.length} selecionados`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="h-9 text-xs justify-between font-normal bg-white border-gray-300 text-gray-900 hover:bg-gray-50 min-w-0"
          style={{ width }}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown
            className={`ml-2 h-3 w-3 shrink-0 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-white border-gray-200 shadow-lg" align="start">
        <div className="flex flex-col">
          <div
            className="flex items-center px-3 py-2 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleAll()
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Checkbox
              id="select-all"
              checked={selectedIds.length === items.length && items.length > 0}
              onCheckedChange={toggleAll}
              className="mr-2"
              onClick={(e) => e.stopPropagation()}
            />
            <label
              htmlFor="select-all"
              className="flex-1 text-xs font-semibold text-gray-700 cursor-pointer py-1"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleAll()
              }}
            >
              {allLabel}
            </label>
          </div>
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {items.map((item) => {
                const isChecked = selectedIds.includes(item.id)
                return (
                  <div
                    key={item.id}
                    className="flex items-center px-3 py-2 rounded-sm hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleItem(item.id)
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mr-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label
                      htmlFor={`item-${item.id}`}
                      className="flex-1 text-xs text-gray-700 cursor-pointer py-1 truncate"
                      title={item.label}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleItem(item.id)
                      }}
                    >
                      {item.label}
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
