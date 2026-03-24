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
import { X, Calendar, SlidersHorizontal } from 'lucide-react'

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

const periodoOptions = [
  { value: 'este-mes', label: 'Este Mês' },
  { value: 'mes-passado', label: 'Mês Passado' },
  { value: 'esta-semana', label: 'Esta Semana' },
  { value: 'semana-passada', label: 'Semana Passada' },
  { value: 'este-ano', label: 'Este Ano' },
  { value: 'ano-anterior', label: 'Ano Anterior' },
  { value: 'personalizado', label: 'Personalizado' },
]

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
  const hasGainDate = !!(filtros.gainDateInicio || filtros.gainDateFim)

  const activeCount =
    (filtros.unidadesSelecionadas.length > 0 ? 1 : 0) +
    (filtros.periodoTipo !== 'este-mes' ? 1 : 0) +
    (filtros.funisSelecionados.length > 0 ? 1 : 0) +
    (filtros.gruposSelecionados.length > 0 ? 1 : 0) +
    (hasGainDate ? 1 : 0)

  return (
    <div className="w-full mb-5">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Linha principal de filtros */}
        <div className="flex items-center gap-0 divide-x divide-gray-100 overflow-x-auto">
          {/* Ícone de filtros */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 bg-gray-50/80">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
            {activeCount > 0 && (
              <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeCount}
              </span>
            )}
          </div>

          {/* Unidades */}
          <div className="flex items-center gap-2 px-3 py-2 shrink-0">
            <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">Unidades</span>
            <div className="w-[190px]">
              <PainelUnidadeMultiSelect
                unidadesList={unidadesList}
                selectedIds={filtros.unidadesSelecionadas}
                onChange={(ids) => setFiltros({ ...filtros, unidadesSelecionadas: ids })}
              />
            </div>
          </div>

          {/* Período */}
          <div className="flex items-center gap-2 px-3 py-2 shrink-0">
            <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">Período</span>
            <Select
              value={filtros.periodoTipo}
              onValueChange={(value) => setFiltros({ ...filtros, periodoTipo: value })}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-gray-200 text-gray-900 w-[148px] focus:ring-0 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-900">
                {periodoOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-xs text-gray-900 focus:bg-gray-100"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datas personalizadas */}
          {filtros.periodoTipo === 'personalizado' && (
            <div className="flex items-center gap-1.5 px-3 py-2 shrink-0">
              <Input
                type="date"
                value={filtros.periodoInicio}
                onChange={(e) => setFiltros({ ...filtros, periodoInicio: e.target.value })}
                className="h-8 text-xs bg-white border-gray-200 text-gray-900 w-[130px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <span className="text-gray-400 text-xs">–</span>
              <Input
                type="date"
                value={filtros.periodoFim}
                onChange={(e) => setFiltros({ ...filtros, periodoFim: e.target.value })}
                className="h-8 text-xs bg-white border-gray-200 text-gray-900 w-[130px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          )}

          {/* Funil */}
          {funis.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 shrink-0">
              <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">Funil</span>
              <PainelMultiSelect
                items={funis.map((f) => ({ id: f.id, label: f.funil_nome }))}
                selectedIds={filtros.funisSelecionados}
                onChange={(ids) => setFiltros({ ...filtros, funisSelecionados: ids })}
                allLabel="Todos"
                width="160px"
              />
            </div>
          )}

          {/* Grupo */}
          {grupos.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 shrink-0">
              <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">Grupo</span>
              <PainelMultiSelect
                items={grupos.map((g) => ({ id: g.id, label: g.nome }))}
                selectedIds={filtros.gruposSelecionados}
                onChange={(ids) => setFiltros({ ...filtros, gruposSelecionados: ids })}
                allLabel="Todos"
                width="160px"
              />
            </div>
          )}

          {/* Data de Ganho */}
          {showGainDateFilter && (
            <div className="flex items-center gap-1.5 px-3 py-2 shrink-0">
              <Calendar className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">Ganho</span>
              <Input
                type="date"
                value={filtros.gainDateInicio || ''}
                onChange={(e) => setFiltros({ ...filtros, gainDateInicio: e.target.value || undefined })}
                className="h-8 text-xs bg-white border-gray-200 text-gray-900 w-[125px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <span className="text-gray-400 text-xs">–</span>
              <Input
                type="date"
                value={filtros.gainDateFim || ''}
                onChange={(e) => setFiltros({ ...filtros, gainDateFim: e.target.value || undefined })}
                className="h-8 text-xs bg-white border-gray-200 text-gray-900 w-[125px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {hasGainDate && (
                <button
                  onClick={() => setFiltros({ ...filtros, gainDateInicio: undefined, gainDateFim: undefined })}
                  className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Limpar datas de ganho"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Botão limpar — alinhado à direita */}
          {filtrosAtivos && (
            <div className="flex items-center px-3 py-2 shrink-0 ml-auto">
              <Button
                variant="ghost"
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
                className="h-8 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
