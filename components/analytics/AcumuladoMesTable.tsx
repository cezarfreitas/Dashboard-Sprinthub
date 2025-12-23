'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PainelUnidadeDialog } from '@/components/painel/PainelUnidadeDialog'
import { PainelUnidadesTable } from '@/components/painel/PainelUnidadesTable'
import { usePainelUnidades } from '@/hooks/painel/usePainelUnidades'
import type { PainelFiltros, PainelUnidade } from '@/types/painel.types'

type SortField = 'valor_ganho' | 'percentual_meta' | 'oportunidades_abertas' | 'oportunidades_ganhas' | 'nome'
type SortDirection = 'asc' | 'desc'

interface SortOption {
  field: SortField
  label: string
  defaultDirection: SortDirection
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'valor_ganho', label: 'Valor Ganho', defaultDirection: 'desc' },
  { field: 'percentual_meta', label: '% Meta Atingido', defaultDirection: 'desc' },
  { field: 'oportunidades_ganhas', label: 'Qtd. Ganhas', defaultDirection: 'desc' },
  { field: 'oportunidades_abertas', label: 'Qtd. Abertas', defaultDirection: 'desc' },
  { field: 'nome', label: 'Nome', defaultDirection: 'asc' },
]

const SORT_STORAGE_KEY = 'acumulado-mes-table-sort'

interface AcumuladoMesTableProps {
  filtros: PainelFiltros
  mesAtual: number
  anoAtual: number
}

export const AcumuladoMesTable = memo(function AcumuladoMesTable({
  filtros,
  mesAtual,
  anoAtual
}: AcumuladoMesTableProps) {
  const { unidades, loading, error } = usePainelUnidades(filtros, mesAtual, anoAtual)
  const [selectedUnidade, setSelectedUnidade] = useState<{ id: number; nome: string; status: 'abertas' | 'ganhas' | 'perdidas' } | null>(null)
  const [sortField, setSortField] = useState<SortField>('valor_ganho')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Carregar preferências salvas
  useEffect(() => {
    try {
      const savedSort = window.localStorage.getItem(SORT_STORAGE_KEY)
      if (savedSort) {
        const { field, direction } = JSON.parse(savedSort)
        if (SORT_OPTIONS.find(o => o.field === field)) {
          setSortField(field)
          setSortDirection(direction)
        }
      }
    } catch {
      // Ignorar falhas de storage
    }
  }, [])

  const handleChangeSort = (field: SortField) => {
    let newDirection: SortDirection
    
    if (field === sortField) {
      // Alternar direção se mesmo campo
      newDirection = sortDirection === 'desc' ? 'asc' : 'desc'
    } else {
      // Usar direção padrão do campo
      const option = SORT_OPTIONS.find(o => o.field === field)
      newDirection = option?.defaultDirection || 'desc'
    }

    setSortField(field)
    setSortDirection(newDirection)

    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ field, direction: newDirection }))
    } catch {
      // Ignorar
    }
  }

  // Calcular percentual da meta para cada unidade
  const getPercentualMeta = (unidade: PainelUnidade) => {
    if (!unidade.meta_valor || unidade.meta_valor <= 0) return 0
    return (unidade.valor_ganho / unidade.meta_valor) * 100
  }

  const unidadesFiltradas = useMemo(() => {
    const unidadesUnicas = Array.from(
      new Map(unidades.map(unidade => [unidade.id, unidade])).values()
    )

    return unidadesUnicas.sort((a, b) => {
      let valueA: number | string
      let valueB: number | string

      switch (sortField) {
        case 'valor_ganho':
          valueA = a.valor_ganho
          valueB = b.valor_ganho
          break
        case 'percentual_meta':
          valueA = getPercentualMeta(a)
          valueB = getPercentualMeta(b)
          break
        case 'oportunidades_abertas':
          valueA = a.oportunidades_abertas
          valueB = b.oportunidades_abertas
          break
        case 'oportunidades_ganhas':
          valueA = a.oportunidades_ganhas
          valueB = b.oportunidades_ganhas
          break
        case 'nome':
          valueA = (a.nome_exibicao || a.nome || a.name || '').toLowerCase()
          valueB = (b.nome_exibicao || b.nome || b.name || '').toLowerCase()
          break
        default:
          valueA = a.valor_ganho
          valueB = b.valor_ganho
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA)
      }

      return sortDirection === 'asc' 
        ? (valueA as number) - (valueB as number)
        : (valueB as number) - (valueA as number)
    })
  }, [unidades, sortField, sortDirection])

  const currentSortLabel = SORT_OPTIONS.find(o => o.field === sortField)?.label || 'Ordenar'

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-600">Erro: {error}</div>
      </div>
    )
  }

  if (unidadesFiltradas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Nenhuma unidade encontrada com os filtros aplicados</div>
      </div>
    )
  }

  return (
    <>
      {/* Controles de ordenação */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {currentSortLabel}
              {sortDirection === 'desc' ? (
                <ArrowDown className="h-3 w-3 ml-1.5 text-gray-400" />
              ) : (
                <ArrowUp className="h-3 w-3 ml-1.5 text-gray-400" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-white border-gray-200 shadow-lg">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.field}
                onClick={() => handleChangeSort(option.field)}
                className={`cursor-pointer ${sortField === option.field ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
              >
                <span className="flex-1">{option.label}</span>
                {sortField === option.field && (
                  sortDirection === 'desc' ? (
                    <ArrowDown className="h-3 w-3 ml-2" />
                  ) : (
                    <ArrowUp className="h-3 w-3 ml-2" />
                  )
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabela */}
      <PainelUnidadesTable
        unidades={unidadesFiltradas}
        filtros={{ periodoInicio: filtros.periodoInicio, periodoFim: filtros.periodoFim }}
        onClickStatus={(unidade, status) => {
          const nomeExibicao = (unidade as any).nome_exibicao || unidade.nome || (unidade as any).name || 'Sem nome'
          setSelectedUnidade({ id: unidade.id, nome: nomeExibicao, status })
        }}
      />

      <PainelUnidadeDialog
        unidadeId={selectedUnidade?.id || null}
        unidadeNome={selectedUnidade?.nome || ''}
        status={selectedUnidade?.status || 'ganhas'}
        filtros={filtros}
        mesAtual={mesAtual}
        anoAtual={anoAtual}
        open={!!selectedUnidade}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUnidade(null)
          }
        }}
      />
    </>
  )
})

