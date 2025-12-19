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
import { PainelUnidadeCard, getCardColor } from './PainelUnidadeCard'
import { PainelUnidadeDialog } from './PainelUnidadeDialog'
import { usePainelUnidades } from '@/hooks/painel/usePainelUnidades'
import type { PainelFiltros, PainelUnidade } from '@/types/painel.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PainelUnidadesTable } from "./PainelUnidadesTable"

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

const SORT_STORAGE_KEY = 'painel-unidades-sort'

interface PainelUnidadesGridProps {
  filtros: PainelFiltros
  mesAtual: number
  anoAtual: number
}

export const PainelUnidadesGrid = memo(function PainelUnidadesGrid({
  filtros,
  mesAtual,
  anoAtual
}: PainelUnidadesGridProps) {
  const { unidades, loading, error } = usePainelUnidades(filtros, mesAtual, anoAtual)
  const [selectedUnidade, setSelectedUnidade] = useState<{ id: number; nome: string; status: 'abertas' | 'ganhas' | 'perdidas' } | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "tabela">("cards")
  const [sortField, setSortField] = useState<SortField>('valor_ganho')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Carregar preferências salvas
  useEffect(() => {
    try {
      const savedView = window.localStorage.getItem("painel-unidades-view-mode")
      if (savedView === "cards" || savedView === "tabela") {
        setViewMode(savedView)
      }

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

  const handleChangeViewMode = (mode: string) => {
    if (mode !== "cards" && mode !== "tabela") return
    setViewMode(mode)
    try {
      window.localStorage.setItem("painel-unidades-view-mode", mode)
    } catch {
      // Ignorar
    }
  }

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

  // Componente de controles (ordenação + visualização)
  const renderControls = () => (
    <div className="flex items-center justify-between mb-3 gap-3">
      {/* Ordenação */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {currentSortLabel}
            {sortDirection === 'desc' ? (
              <ArrowDown className="h-3 w-3 ml-1.5 text-gray-500" />
            ) : (
              <ArrowUp className="h-3 w-3 ml-1.5 text-gray-500" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-gray-900 border-gray-700">
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.field}
              onClick={() => handleChangeSort(option.field)}
              className={`cursor-pointer ${sortField === option.field ? 'bg-gray-800 text-white' : 'text-gray-300'}`}
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

      {/* Modo de visualização */}
      <TabsList className="bg-gray-900 border border-gray-700">
        <TabsTrigger value="cards" className="data-[state=active]:bg-gray-700">Cards</TabsTrigger>
        <TabsTrigger value="tabela" className="data-[state=active]:bg-gray-700">Tabela</TabsTrigger>
      </TabsList>
    </div>
  )

  if (loading) {
    return (
      <Tabs value={viewMode} onValueChange={handleChangeViewMode}>
        {renderControls()}

        <TabsContent value="cards" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 4k:grid-cols-8 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px] w-full bg-gray-800 rounded-lg" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tabela" className="mt-0">
          <div className="rounded-lg border border-gray-800 bg-gray-900">
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-gray-800/80" />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-500">Erro: {error}</div>
      </div>
    )
  }

  if (unidadesFiltradas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-400">Nenhuma unidade encontrada com os filtros aplicados</div>
      </div>
    )
  }

  return (
    <>
      <Tabs value={viewMode} onValueChange={handleChangeViewMode}>
        {renderControls()}

        <TabsContent value="cards" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 4k:grid-cols-8 gap-4">
            {unidadesFiltradas.map((unidade, index) => {
              const posicao = index + 1
              const color = getCardColor(unidade.id)
              const nomeExibicao = unidade.nome_exibicao || unidade.nome || unidade.name || 'Sem nome'

              // Garantir key única mesmo se houver duplicatas (não deveria acontecer após deduplicação)
              const uniqueKey = `unidade-${unidade.id}-${index}`

              return (
                <div key={uniqueKey}>
                  <PainelUnidadeCard
                    unidade={unidade}
                    posicao={posicao}
                    color={color}
                    filtros={{
                      periodoInicio: filtros.periodoInicio,
                      periodoFim: filtros.periodoFim
                    }}
                    onClickAbertas={() => setSelectedUnidade({ id: unidade.id, nome: nomeExibicao, status: 'abertas' })}
                    onClickGanhas={() => setSelectedUnidade({ id: unidade.id, nome: nomeExibicao, status: 'ganhas' })}
                    onClickPerdidas={() => setSelectedUnidade({ id: unidade.id, nome: nomeExibicao, status: 'perdidas' })}
                  />
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="tabela" className="mt-0">
          <PainelUnidadesTable
            unidades={unidadesFiltradas}
            filtros={{ periodoInicio: filtros.periodoInicio, periodoFim: filtros.periodoFim }}
            onClickStatus={(unidade, status) => setSelectedUnidade({ id: unidade.id, nome: unidade.nome, status })}
          />
        </TabsContent>
      </Tabs>

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

