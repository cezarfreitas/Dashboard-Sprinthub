'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'

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
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className={`w-3 h-3 ml-1 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-64 overflow-y-auto">
          {/* Opção "Todas" */}
          <label className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700">
            <input
              type="checkbox"
              checked={selectedIds.length === unidadesList.length}
              onChange={toggleAll}
              className="w-3 h-3 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="ml-2 text-xs text-white font-semibold">
              Todas as unidades
            </span>
            {selectedIds.length === unidadesList.length && (
              <Check className="w-3 h-3 ml-auto text-blue-400" />
            )}
          </label>

          {/* Lista de unidades */}
          {unidadesList.map(unidade => (
            <label
              key={unidade.id}
              className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(unidade.id)}
                onChange={() => toggleUnidade(unidade.id)}
                className="w-3 h-3 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="ml-2 text-xs text-white">
                {unidade.nome}
              </span>
              {selectedIds.includes(unidade.id) && (
                <Check className="w-3 h-3 ml-auto text-blue-400" />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

