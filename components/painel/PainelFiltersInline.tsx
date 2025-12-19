'use client'

import { useState } from 'react'
import PainelUnidadeMultiSelect from './PainelUnidadeMultiSelect'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { X, Calendar } from 'lucide-react'

interface PainelFiltersInlineProps {
  filtros: {
    unidadesSelecionadas: number[]
    periodoTipo: string
    periodoInicio: string
    periodoFim: string
    funilSelecionado: string
    grupoSelecionado: string
    gainDateInicio?: string
    gainDateFim?: string
  }
  setFiltros: (filtros: any) => void
  unidadesList: Array<{ id: number; nome: string }>
  funis: Array<{ id: number; funil_nome: string }>
  grupos: Array<{ id: number; nome: string }>
  periodoInicial: { inicio: string; fim: string }
  filtrosAtivos: boolean
}

export default function PainelFiltersInline({
  filtros,
  setFiltros,
  unidadesList,
  funis,
  grupos,
  periodoInicial,
  filtrosAtivos
}: PainelFiltersInlineProps) {
  const periodoOptions = [
    { value: 'este-mes', label: 'Este Mês' },
    { value: 'mes-passado', label: 'Mês Passado' },
    { value: 'esta-semana', label: 'Esta Semana' },
    { value: 'semana-passada', label: 'Semana Passada' },
    { value: 'este-ano', label: 'Este Ano' },
    { value: 'ano-anterior', label: 'Ano Anterior' },
    { value: 'personalizado', label: 'Personalizado' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4 shadow-sm">
      {/* Filtro de Unidade (Multi-select) */}
      <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
        <Label className="text-xs font-medium text-gray-400">Unidades</Label>
        <PainelUnidadeMultiSelect
          unidadesList={unidadesList}
          selectedIds={filtros.unidadesSelecionadas}
          onChange={(ids) => setFiltros({ ...filtros, unidadesSelecionadas: ids })}
        />
      </div>

      {/* Filtro de Período */}
      <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
        <Label className="text-xs font-medium text-gray-400">Período</Label>
        <Select
          value={filtros.periodoTipo}
          onValueChange={(value) => setFiltros({ ...filtros, periodoTipo: value })}
        >
          <SelectTrigger className="h-9 text-xs bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            {periodoOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs text-white focus:bg-gray-800 focus:text-white">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Datas Personalizadas (condicional) */}
      {filtros.periodoTipo === 'personalizado' && (
        <>
          <div className="flex flex-col gap-2 min-w-[150px]">
            <Label className="text-xs font-medium text-gray-400">De</Label>
            <Input
              type="date"
              value={filtros.periodoInicio}
              onChange={(e) => setFiltros({ ...filtros, periodoInicio: e.target.value })}
              className="h-9 text-xs bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="flex flex-col gap-2 min-w-[150px]">
            <Label className="text-xs font-medium text-gray-400">Até</Label>
            <Input
              type="date"
              value={filtros.periodoFim}
              onChange={(e) => setFiltros({ ...filtros, periodoFim: e.target.value })}
              className="h-9 text-xs bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </>
      )}

      {/* Filtro de Funil */}
      <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
        <Label className="text-xs font-medium text-gray-400">Funil</Label>
        <Select
          value={filtros.funilSelecionado}
          onValueChange={(value) => setFiltros({ ...filtros, funilSelecionado: value })}
        >
          <SelectTrigger className="h-9 text-xs bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Selecione o funil" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            <SelectItem value="todos" className="text-xs text-white focus:bg-gray-800 focus:text-white">Todos</SelectItem>
            {funis.map((funil) => (
              <SelectItem key={funil.id} value={String(funil.id)} className="text-xs text-white focus:bg-gray-800 focus:text-white">
                {funil.funil_nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Grupo */}
      <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
        <Label className="text-xs font-medium text-gray-400">Grupo</Label>
        <Select
          value={filtros.grupoSelecionado}
          onValueChange={(value) => setFiltros({ ...filtros, grupoSelecionado: value })}
        >
          <SelectTrigger className="h-9 text-xs bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Selecione o grupo" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800 text-white">
            <SelectItem value="todos" className="text-xs text-white focus:bg-gray-800 focus:text-white">Todos</SelectItem>
            {grupos.map((grupo) => (
              <SelectItem key={grupo.id} value={String(grupo.id)} className="text-xs text-white focus:bg-gray-800 focus:text-white">
                {grupo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Data de Ganho */}
      <div className="flex flex-col gap-2 min-w-[280px]">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-green-400" />
          <Label className="text-xs font-medium text-gray-400">Data de Ganho</Label>
          {(filtros.gainDateInicio || filtros.gainDateFim) && (
            <button
              onClick={() => setFiltros({ ...filtros, gainDateInicio: undefined, gainDateFim: undefined })}
              className="text-xs text-gray-500 hover:text-red-400 ml-auto"
              title="Limpar filtro de data de ganho"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filtros.gainDateInicio || ''}
            onChange={(e) => setFiltros({ ...filtros, gainDateInicio: e.target.value || undefined })}
            placeholder="De"
            className="h-9 text-xs bg-gray-800 border-gray-700 text-white flex-1"
          />
          <span className="text-gray-500 text-xs">até</span>
          <Input
            type="date"
            value={filtros.gainDateFim || ''}
            onChange={(e) => setFiltros({ ...filtros, gainDateFim: e.target.value || undefined })}
            placeholder="Até"
            className="h-9 text-xs bg-gray-800 border-gray-700 text-white flex-1"
          />
        </div>
      </div>

      {/* Botão Limpar Filtros */}
      {filtrosAtivos && (
        <div className="flex flex-col gap-2 min-w-[100px]">
          <Label className="text-xs font-medium text-gray-400 opacity-0">Ações</Label>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setFiltros({
              unidadesSelecionadas: [],
              periodoTipo: 'este-mes',
              periodoInicio: periodoInicial.inicio,
              periodoFim: periodoInicial.fim,
              funilSelecionado: 'todos',
              grupoSelecionado: 'todos',
              gainDateInicio: undefined,
              gainDateFim: undefined
            })}
            className="h-9 text-xs gap-1"
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  )
}

