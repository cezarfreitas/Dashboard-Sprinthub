'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FaTrophy, FaCalendarAlt, FaChartLine } from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'
import PainelFiltersInline from '@/components/painel/PainelFiltersInline'
import { RankingPodio, PodioItem } from '@/components/ranking/RankingPodio'
import { RankingTable, RankingTableItem } from '@/components/ranking/RankingTable'
import { useRankingFilters } from '@/hooks/ranking/useRankingFilters'

interface RankingVendedor {
  vendedor_id: number
  name: string
  lastName: string
  email: string
  username: string
  telephone?: string
  total_oportunidades: number
  total_realizado: number
  posicao: number
  medalha: 'ouro' | 'prata' | 'bronze' | null
}

function transformVendedorToPodio(v: RankingVendedor): PodioItem {
  return {
    id: v.vendedor_id,
    nome: `${v.name} ${v.lastName}`,
    total_realizado: v.total_realizado,
    total_oportunidades: v.total_oportunidades,
    medalha: v.medalha
  }
}

function transformVendedorToTable(v: RankingVendedor): RankingTableItem {
  return {
    id: v.vendedor_id,
    nome: `${v.name} ${v.lastName}`,
    total_realizado: v.total_realizado,
    total_oportunidades: v.total_oportunidades,
    posicao: v.posicao,
    medalha: v.medalha
  }
}

export default function RankingPage() {
  const [rankingMensal, setRankingMensal] = useState<RankingVendedor[]>([])
  const [rankingAnual, setRankingAnual] = useState<RankingVendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

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

  const fetchRankings = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setLoading(true)
    setError('')

    try {
      const buildParams = (tipo: 'personalizado' | 'anual') => {
        const params = new URLSearchParams()
        params.set('tipo', tipo)
        if (tipo === 'personalizado') {
          params.set('dataInicio', filtrosPainel.periodoInicio)
          params.set('dataFim', filtrosPainel.periodoFim)
        }
        if (tipo === 'anual') params.set('ano', String(anoDoPeríodo))
        if (filtrosPainel.unidadesSelecionadas.length > 0)
          params.set('unidades', filtrosPainel.unidadesSelecionadas.join(','))
        if (filtrosPainel.funisSelecionados.length > 0)
          params.set('funil', filtrosPainel.funisSelecionados.join(','))
        if (filtrosPainel.gruposSelecionados.length > 0)
          params.set('grupo', filtrosPainel.gruposSelecionados.join(','))
        if (filtrosPainel.gainDateInicio) params.set('gainDateInicio', filtrosPainel.gainDateInicio)
        if (filtrosPainel.gainDateFim) params.set('gainDateFim', filtrosPainel.gainDateFim)
        return params.toString()
      }

      const [r1, r2] = await Promise.all([
        fetch(`/api/ranking/vendedores?${buildParams('personalizado')}`, { signal }),
        fetch(`/api/ranking/vendedores?${buildParams('anual')}`, { signal })
      ])
      if (signal.aborted) return

      const [d1, d2] = await Promise.all([r1.json(), r2.json()])
      if (!r1.ok) throw new Error(d1.message || 'Erro ao carregar ranking do período')
      if (!r2.ok) throw new Error(d2.message || 'Erro ao carregar ranking anual')

      setRankingMensal(d1.ranking || [])
      setRankingAnual(d2.ranking || [])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setRankingMensal([])
      setRankingAnual([])
    } finally {
      if (!abortControllerRef.current?.signal.aborted) setLoading(false)
    }
  }, [filtrosPainel, anoDoPeríodo])

  useEffect(() => {
    if (filtrosPainel.periodoInicio && filtrosPainel.periodoFim) fetchRankings()
    return () => { abortControllerRef.current?.abort() }
  }, [fetchRankings])

  const activeBadges = [
    filtrosPainel.unidadesSelecionadas.length > 0
      ? `${filtrosPainel.unidadesSelecionadas.length} unidade${filtrosPainel.unidadesSelecionadas.length > 1 ? 's' : ''}`
      : null,
    grupoNomeSelecionado,
    funilNomeSelecionado,
    dataGanhoLabel,
  ].filter(Boolean)

  const RankingCardSkeleton = () => (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-gray-50/70">
        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-end gap-3 h-48">
          <div className="flex-1 rounded-xl bg-gray-100 animate-pulse h-40" />
          <div className="flex-1 rounded-xl bg-gray-100 animate-pulse h-48" />
          <div className="flex-1 rounded-xl bg-gray-100 animate-pulse h-36" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-gray-100 animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <FaTrophy className="h-4.5 w-4.5 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Ranking de Vendedores</h1>
            <p className="text-xs text-muted-foreground">Classificação por oportunidades ganhas</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {activeBadges.map((b, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{b}</Badge>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">Filtros</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setFiltersOpenMobile(v => !v)}
          >
            {filtersOpenMobile ? 'Ocultar' : 'Mostrar filtros'}
          </Button>
        </div>
        <div className={`${filtersOpenMobile ? 'block' : 'hidden'} sm:block px-4 py-3`}>
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

      {/* Erro */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm font-semibold text-red-700 mb-3">{error}</p>
          <Button onClick={fetchRankings} variant="outline" size="sm">
            <HiRefresh className="h-4 w-4 mr-1.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Rankings lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Ranking do Período */}
        {loading ? <RankingCardSkeleton /> : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FaChartLine className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900">Período</span>
                  <span className="ml-2 text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                    {tituloPeriodo}
                  </span>
                </div>
              </div>
              {rankingMensal.length > 0 && (
                <Badge variant="secondary" className="text-xs">{rankingMensal.length} vendedores</Badge>
              )}
            </div>

            <div className="p-4 sm:p-5">
              {rankingMensal.length > 0 ? (
                <div className="space-y-5">
                  <RankingPodio items={rankingMensal.map(transformVendedorToPodio)} keyPrefix="vendedor-periodo" />
                  <div className="border-t pt-4">
                    <RankingTable
                      items={rankingMensal.map(transformVendedorToTable)}
                      titulo="Classificação completa"
                      icon={<FaChartLine className="h-4 w-4 text-blue-500" />}
                      keyPrefix="vendedor-periodo"
                      itemLabel="vendedor"
                    />
                  </div>
                </div>
              ) : !error ? (
                <div className="py-12 text-center">
                  <FaTrophy className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum dado para {tituloPeriodo}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Ranking Anual */}
        {loading ? <RankingCardSkeleton /> : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b bg-gradient-to-r from-emerald-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <FaCalendarAlt className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900">Anual</span>
                  <span className="ml-2 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                    {anoDoPeríodo}
                  </span>
                </div>
              </div>
              {rankingAnual.length > 0 && (
                <Badge variant="secondary" className="text-xs">{rankingAnual.length} vendedores</Badge>
              )}
            </div>

            <div className="p-4 sm:p-5">
              {rankingAnual.length > 0 ? (
                <div className="space-y-5">
                  <RankingPodio items={rankingAnual.map(transformVendedorToPodio)} keyPrefix="vendedor-anual" />
                  <div className="border-t pt-4">
                    <RankingTable
                      items={rankingAnual.map(transformVendedorToTable)}
                      titulo="Classificação completa"
                      icon={<FaCalendarAlt className="h-4 w-4 text-emerald-600" />}
                      keyPrefix="vendedor-anual"
                      itemLabel="vendedor"
                    />
                  </div>
                </div>
              ) : !error ? (
                <div className="py-12 text-center">
                  <FaTrophy className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum dado para {anoDoPeríodo}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
