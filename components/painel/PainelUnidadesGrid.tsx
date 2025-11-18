import { memo, useMemo, useState } from 'react'
import { PainelUnidadeCard, getCardColor } from './PainelUnidadeCard'
import { PainelUnidadeDialog } from './PainelUnidadeDialog'
import { usePainelUnidades } from '@/hooks/painel/usePainelUnidades'
import type { PainelFiltros } from '@/types/painel.types'

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
  const [selectedUnidade, setSelectedUnidade] = useState<{ id: number; nome: string } | null>(null)

  const unidadesFiltradas = useMemo(() => {
    // Remover duplicatas baseado no ID antes de filtrar
    const unidadesUnicas = Array.from(
      new Map(unidades.map(unidade => [unidade.id, unidade])).values()
    )
    
    return unidadesUnicas
      .filter(unidade => {
        if (filtros.unidadeSelecionada !== 'todas' && unidade.id !== parseInt(filtros.unidadeSelecionada)) {
          return false
        }
        
        if (filtros.grupoSelecionado !== 'todos') {
          const grupoId = parseInt(filtros.grupoSelecionado)
          if (!unidade.grupo_id || unidade.grupo_id !== grupoId) {
            return false
          }
        }
        
        return true
      })
      .sort((a, b) => b.valor_ganho - a.valor_ganho)
  }, [unidades, filtros])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-400">Carregando unidades...</div>
      </div>
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

  const handleCardClick = (unidade: { id: number; nome: string }) => {
    setSelectedUnidade(unidade)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 4k:grid-cols-8 gap-4">
        {unidadesFiltradas.map((unidade, index) => {
          const posicao = index + 1
          const color = getCardColor(unidade.id)
          const nomeExibicao = unidade.nome_exibicao || unidade.nome || unidade.name || 'Sem nome'
          
          // Garantir key única mesmo se houver duplicatas (não deveria acontecer após deduplicação)
          const uniqueKey = `unidade-${unidade.id}-${index}`
          
          return (
            <div
              key={uniqueKey}
              onClick={() => handleCardClick({ id: unidade.id, nome: nomeExibicao })}
              className="cursor-pointer"
            >
              <PainelUnidadeCard
                unidade={unidade}
                posicao={posicao}
                color={color}
              />
            </div>
          )
        })}
      </div>

      <PainelUnidadeDialog
        unidadeId={selectedUnidade?.id || null}
        unidadeNome={selectedUnidade?.nome || ''}
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

