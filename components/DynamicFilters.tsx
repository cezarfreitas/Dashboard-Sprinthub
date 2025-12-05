"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export interface Filter {
  id: string
  campo: string
  operador: string
  valor: string
}

interface DynamicFiltersProps {
  filters: Filter[]
  onFiltersChange: (filters: Filter[]) => void
  camposDisponiveis: Array<{ value: string; label: string; tipo: 'categoria' | 'numerico' }>
}

const operadoresPorTipo = {
  categoria: [
    { value: 'igual', label: 'Igual a' },
    { value: 'diferente', label: 'Diferente de' },
    { value: 'contem', label: 'Contém' },
    { value: 'nao_contem', label: 'Não contém' },
  ],
  numerico: [
    { value: 'igual', label: 'Igual a' },
    { value: 'diferente', label: 'Diferente de' },
    { value: 'maior', label: 'Maior que' },
    { value: 'menor', label: 'Menor que' },
    { value: 'maior_igual', label: 'Maior ou igual' },
    { value: 'menor_igual', label: 'Menor ou igual' },
  ]
}

export default function DynamicFilters({ filters, onFiltersChange, camposDisponiveis }: DynamicFiltersProps) {
  const addFilter = () => {
    const newFilter: Filter = {
      id: Date.now().toString(),
      campo: '',
      operador: '',
      valor: ''
    }
    onFiltersChange([...filters, newFilter])
  }

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id))
  }

  const updateFilter = (id: string, field: keyof Filter, value: string) => {
    onFiltersChange(
      filters.map(f => {
        if (f.id === id) {
          const updated = { ...f, [field]: value }
          // Se mudar o campo, resetar operador e valor
          if (field === 'campo') {
            updated.operador = ''
            updated.valor = ''
          }
          return updated
        }
        return f
      })
    )
  }

  const getCampoTipo = (campoValue: string): 'categoria' | 'numerico' => {
    const campo = camposDisponiveis.find(c => c.value === campoValue)
    return campo?.tipo || 'categoria'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Filtros Avançados</Label>
        <Button 
          onClick={addFilter} 
          size="sm" 
          variant="outline" 
          className="h-7 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Filtro
        </Button>
      </div>

      {filters.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-3 space-y-2">
            {filters.map((filter, index) => {
              const campoTipo = getCampoTipo(filter.campo)
              const operadoresDisponiveis = filter.campo 
                ? operadoresPorTipo[campoTipo]
                : []

              return (
                <div 
                  key={filter.id} 
                  className="flex items-end gap-2 p-2 bg-muted/50 rounded-lg border border-border"
                >
                  {/* Campo */}
                  <div className="flex-1">
                    {index === 0 && <Label className="text-xs mb-1 block">Campo</Label>}
                    <Select 
                      value={filter.campo} 
                      onValueChange={(value) => updateFilter(filter.id, 'campo', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {camposDisponiveis.map(campo => (
                          <SelectItem key={campo.value} value={campo.value}>
                            {campo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operador */}
                  <div className="flex-1">
                    {index === 0 && <Label className="text-xs mb-1 block">Operador</Label>}
                    <Select 
                      value={filter.operador} 
                      onValueChange={(value) => updateFilter(filter.id, 'operador', value)}
                      disabled={!filter.campo}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {operadoresDisponiveis.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valor */}
                  <div className="flex-1">
                    {index === 0 && <Label className="text-xs mb-1 block">Valor</Label>}
                    <Input
                      type={campoTipo === 'numerico' ? 'number' : 'text'}
                      value={filter.valor}
                      onChange={(e) => updateFilter(filter.id, 'valor', e.target.value)}
                      placeholder="Digite o valor"
                      className="h-8 text-xs"
                      disabled={!filter.operador}
                    />
                  </div>

                  {/* Botão Remover */}
                  <Button
                    onClick={() => removeFilter(filter.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {filters.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-lg">
          Nenhum filtro adicionado. Clique em "Adicionar Filtro" para começar.
        </div>
      )}
    </div>
  )
}

