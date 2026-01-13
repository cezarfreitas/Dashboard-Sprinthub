'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FaChartLine, FaCalendarAlt, FaTrophy } from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'
import PainelFiltersInline from '@/components/painel/PainelFiltersInline'
import { RankingPodio, PodioItem } from '@/components/ranking/RankingPodio'
import { RankingTable, RankingTableItem } from '@/components/ranking/RankingTable'
import { useRankingFilters } from '@/hooks/ranking/useRankingFilters'

interface RankingUnidade {
  unidade_id: number
  unidade_nome: string
  unidade_responsavel: string
  total_oportunidades: number
  total_realizado: number
  total_vendedores: number
  posicao: number
  medalha: 'ouro' | 'prata' | 'bronze' | null
}

// Transformar dados de unidade para componentes genéricos
function transformUnidadeToPodio(unidade: RankingUnidade): PodioItem {
  return {
    id: unidade.unidade_id,
    nome: unidade.unidade_nome,
    total_realizado: unidade.total_realizado,
    total_oportunidades: unidade.total_oportunidades,
    medalha: unidade.medalha
  }
}

function transformUnidadeToTable(unidade: RankingUnidade): RankingTableItem {
  return {
    id: unidade.unidade_id,
    nome: unidade.unidade_nome,
    total_realizado: unidade.total_realizado,
    total_oportunidades: unidade.total_oportunidades,
    posicao: unidade.posicao,
    medalha: unidade.medalha
  }
}

export default function RankingUnidadesPage() {
  const [rankingMensal, setRankingMensal] = useState<RankingUnidade[]>([])
  const [rankingAnual, setRankingAnual] = useState<RankingUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false)
  
  // Ref para AbortController
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Hook de filtros compartilhado
  const {
    filtrosPainel,
    handleFiltrosChange,
    periodoInicial,
    anoDoPeríodo,
    tituloPeriodo,
    filtrosAtivos,
    funilNomeSelecionado,
    grupoNomeSelecionado,
    dataGanhoLabel,
    unidadesList,
    funis,
    grupos
  } = useRankingFilters()
  
  // Função para buscar rankings
  const fetchRankings = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    setLoading(true)
    setError('')
    
    try {
      // Construir parâmetros para a API
      const buildParams = (tipo: 'personalizado' | 'anual') => {
        const params = new URLSearchParams()
        params.set('tipo', tipo)
        
        if (tipo === 'personalizado') {
          params.set('dataInicio', filtrosPainel.periodoInicio)
          params.set('dataFim', filtrosPainel.periodoFim)
        }
        
        if (tipo === 'anual') {
          params.set('ano', String(anoDoPeríodo))
        }
        
        // Filtros avançados
        if (filtrosPainel.unidadesSelecionadas.length > 0) {
          params.set('unidades', filtrosPainel.unidadesSelecionadas.join(','))
        }
        
        if (filtrosPainel.funilSelecionado && filtrosPainel.funilSelecionado !== 'todos') {
          params.set('funil', filtrosPainel.funilSelecionado)
        }
        
        if (filtrosPainel.grupoSelecionado && filtrosPainel.grupoSelecionado !== 'todos') {
          params.set('grupo', filtrosPainel.grupoSelecionado)
        }
        
        if (filtrosPainel.gainDateInicio) {
          params.set('gainDateInicio', filtrosPainel.gainDateInicio)
        }
        
        if (filtrosPainel.gainDateFim) {
          params.set('gainDateFim', filtrosPainel.gainDateFim)
        }
        
        return params.toString()
      }
      
      const paramsPeriodo = buildParams('personalizado')
      const paramsAnual = buildParams('anual')
      
      const [rankingPeriodoRes, rankingAnualRes] = await Promise.all([
        fetch(`/api/ranking/unidades?${paramsPeriodo}`, { signal }),
        fetch(`/api/ranking/unidades?${paramsAnual}`, { signal })
      ])

      if (signal.aborted) return

      const [rankingPeriodoData, rankingAnualData] = await Promise.all([
        rankingPeriodoRes.json(),
        rankingAnualRes.json()
      ])

      if (!rankingPeriodoRes.ok) {
        throw new Error(rankingPeriodoData.message || 'Erro ao carregar ranking do período')
      }

      if (!rankingAnualRes.ok) {
        throw new Error(rankingAnualData.message || 'Erro ao carregar ranking anual')
      }
      
      setRankingMensal(rankingPeriodoData.ranking || [])
      setRankingAnual(rankingAnualData.ranking || [])
      
    } catch (err) {
      // Ignorar erros de abort
      if (err instanceof Error && err.name === 'AbortError') return
      
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setRankingMensal([])
      setRankingAnual([])
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false)
      }
    }
  }, [filtrosPainel, anoDoPeríodo])

  // Efeito para buscar rankings quando filtros mudam
  useEffect(() => {
    if (filtrosPainel.periodoInicio && filtrosPainel.periodoFim) {
      fetchRankings()
    }
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchRankings])

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="rounded-xl border bg-white">
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="h-7 w-64 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-80 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-10 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="border-t px-6 pt-4">
            <div className="h-20 bg-gray-100 rounded-xl mb-6 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-[420px] bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-[420px] bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <div className="rounded-xl border bg-white">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Ranking de Unidades</h1>
            <p className="text-sm text-muted-foreground">Selecione os filtros e tente novamente.</p>
          </div>
          <div className="border-t px-6 pt-4">
            <PainelFiltersInline
              filtros={filtrosPainel}
              setFiltros={handleFiltrosChange}
              unidadesList={unidadesList}
              funis={funis}
              grupos={grupos}
              periodoInicial={periodoInicial}
              filtrosAtivos={filtrosAtivos}
            />
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchRankings} variant="outline">
                <HiRefresh className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Topo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ranking de Unidades</h1>
          <span className="hidden sm:inline text-gray-300">•</span>
          <p className="text-sm text-muted-foreground">
            Rankings baseados em oportunidades com <span className="font-semibold">status gain</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Período: {tituloPeriodo}</Badge>
          {filtrosPainel.unidadesSelecionadas.length > 0 && (
            <Badge variant="secondary">Unidades: {filtrosPainel.unidadesSelecionadas.length}</Badge>
          )}
          {grupoNomeSelecionado && <Badge variant="secondary">{grupoNomeSelecionado}</Badge>}
          {funilNomeSelecionado && <Badge variant="secondary">{funilNomeSelecionado}</Badge>}
          {dataGanhoLabel && <Badge variant="secondary">{dataGanhoLabel}</Badge>}
        </div>
      </div>

      {/* Filtros */}
      <div>
        <div className="sm:hidden flex items-center justify-between pb-2">
          <span className="text-sm font-semibold text-gray-900">Filtros</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3"
            onClick={() => setFiltersOpenMobile((v) => !v)}
          >
            {filtersOpenMobile ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>

        <div className={`${filtersOpenMobile ? 'block' : 'hidden'} sm:block`}>
          <PainelFiltersInline
            filtros={filtrosPainel}
            setFiltros={handleFiltrosChange}
            unidadesList={unidadesList}
            funis={funis}
            grupos={grupos}
            periodoInicial={periodoInicial}
            filtrosAtivos={filtrosAtivos}
          />
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50/60">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <FaChartLine className="h-4 w-4 text-blue-600" />
              Ranking do período • {tituloPeriodo}
              <span className="text-gray-300">•</span>
              <FaTrophy className="h-4 w-4 text-yellow-500" />
              <span>Pódio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {rankingMensal.length > 0 ? (
              <>
                <RankingPodio 
                  items={rankingMensal.map(transformUnidadeToPodio)} 
                  keyPrefix="unidade-periodo"
                />
                <RankingTable 
                  items={rankingMensal.map(transformUnidadeToTable)} 
                  titulo="Ranking completo"
                  icon={<FaChartLine className="h-5 w-5 text-blue-500" />}
                  keyPrefix="unidade-periodo"
                  itemLabel="unidade"
                />
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">Nenhum dado encontrado para {tituloPeriodo}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50/60">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <FaCalendarAlt className="h-4 w-4 text-emerald-600" />
              Ranking anual • {anoDoPeríodo}
              <span className="text-gray-300">•</span>
              <FaTrophy className="h-4 w-4 text-yellow-500" />
              <span>Pódio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {rankingAnual.length > 0 ? (
              <>
                <RankingPodio 
                  items={rankingAnual.map(transformUnidadeToPodio)} 
                  keyPrefix="unidade-anual"
                />
                <RankingTable 
                  items={rankingAnual.map(transformUnidadeToTable)} 
                  titulo="Ranking completo"
                  icon={<FaCalendarAlt className="h-5 w-5 text-emerald-600" />}
                  keyPrefix="unidade-anual"
                  itemLabel="unidade"
                />
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">Nenhum dado encontrado para o ano {anoDoPeríodo}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
