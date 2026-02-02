'use client'

import PainelUnidadeMultiSelect from './PainelUnidadeMultiSelect'
import PainelMultiSelect from './PainelMultiSelect'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Calendar } from 'lucide-react'

interface PainelFiltersInlineProps {
  filtros: {
    unidadesSelecionadas: number[]
    periodoTipo: string
    periodoInicio: string
    periodoFim: string
    funisSelecionados: number[]
    gruposSelecionados: number[]
    gainDateInicio?: string
    gainDateFim?: string
  }
  setFiltros: (filtros: any) => void
  unidadesList: Array<{ id: number; nome: string }>
  funis: Array<{ id: number; funil_nome: string }>
  grupos: Array<{ id: number; nome: string }>
  periodoInicial: { inicio: string; fim: string }
  filtrosAtivos: boolean
  showGainDateFilter?: boolean
}

export default function PainelFiltersInline({
  filtros,
  setFiltros,
  unidadesList,
  funis,
  grupos,
  periodoInicial,
  filtrosAtivos,
  showGainDateFilter = true
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
    <div className="w-full mb-6">
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 shadow-sm overflow-x-auto whitespace-nowrap">
        {/* Unidades */}
        <div className="flex items-center gap-2 shrink-0 min-w-[260px]">
          <span className="text-xs font-medium text-gray-600">Unidades</span>
          <div className="min-w-[200px]">
            <PainelUnidadeMultiSelect
              unidadesList={unidadesList}
              selectedIds={filtros.unidadesSelecionadas}
              onChange={(ids) => setFiltros({ ...filtros, unidadesSelecionadas: ids })}
            />
          </div>
        </div>

        {/* Período */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-gray-600">Período</span>
          <Select
            value={filtros.periodoTipo}
            onValueChange={(value) => setFiltros({ ...filtros, periodoTipo: value })}
          >
            <SelectTrigger className="h-9 text-xs bg-white border-gray-300 text-gray-900 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900">
              {periodoOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs text-gray-900 focus:bg-gray-100 focus:text-gray-900"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Datas Personalizadas */}
        {filtros.periodoTipo === 'personalizado' && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-gray-600">Datas</span>
            <Input
              type="date"
              value={filtros.periodoInicio}
              onChange={(e) => setFiltros({ ...filtros, periodoInicio: e.target.value })}
              className="h-9 text-xs bg-white border-gray-300 text-gray-900 w-[145px]"
            />
            <span className="text-gray-500 text-xs">até</span>
            <Input
              type="date"
              value={filtros.periodoFim}
              onChange={(e) => setFiltros({ ...filtros, periodoFim: e.target.value })}
              className="h-9 text-xs bg-white border-gray-300 text-gray-900 w-[145px]"
            />
          </div>
        )}

        {/* Funil - multi-select */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-gray-600">Funil</span>
          <PainelMultiSelect
            items={funis.map((f) => ({ id: f.id, label: f.funil_nome }))}
            selectedIds={filtros.funisSelecionados}
            onChange={(ids) => setFiltros({ ...filtros, funisSelecionados: ids })}
            allLabel="Todos"
            width="180px"
          />
        </div>

        {/* Grupo - multi-select */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-gray-600">Grupo</span>
          <PainelMultiSelect
            items={grupos.map((g) => ({ id: g.id, label: g.nome }))}
            selectedIds={filtros.gruposSelecionados}
            onChange={(ids) => setFiltros({ ...filtros, gruposSelecionados: ids })}
            allLabel="Todos"
            width="180px"
          />
        </div>

        {/* Data de Ganho */}
        {showGainDateFilter && (
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-gray-600">Ganho</span>
            <Input
              type="date"
              value={filtros.gainDateInicio || ''}
              onChange={(e) => setFiltros({ ...filtros, gainDateInicio: e.target.value || undefined })}
              className="h-9 text-xs bg-white border-gray-300 text-gray-900 w-[145px]"
            />
            <span className="text-gray-500 text-xs">até</span>
            <Input
              type="date"
              value={filtros.gainDateFim || ''}
              onChange={(e) => setFiltros({ ...filtros, gainDateFim: e.target.value || undefined })}
              className="h-9 text-xs bg-white border-gray-300 text-gray-900 w-[145px]"
            />
            {(filtros.gainDateInicio || filtros.gainDateFim) && (
              <button
                onClick={() => setFiltros({ ...filtros, gainDateInicio: undefined, gainDateFim: undefined })}
                className="text-xs text-gray-400 hover:text-red-500"
                title="Limpar filtro de data de ganho"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Limpar */}
        {filtrosAtivos && (
          <div className="shrink-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                setFiltros({
                  unidadesSelecionadas: [],
                  periodoTipo: 'este-mes',
                  periodoInicio: periodoInicial.inicio,
                  periodoFim: periodoInicial.fim,
                  funisSelecionados: [],
                  gruposSelecionados: [],
                  gainDateInicio: undefined,
                  gainDateFim: undefined
                })
              }
              className="h-9 text-xs gap-1"
            >
              <X className="h-3 w-3" />
              Limpar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

