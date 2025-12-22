'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  FaMedal,
  FaTrophy,
  FaCrown,
  FaChartLine,
  FaCalendarAlt,
  FaBuilding
} from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'
import PainelFiltersInline from '@/components/painel/PainelFiltersInline'

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

const formatCurrency = (value: number): string => {
  const numValue = Math.round(Number(value) || 0)
  return `R$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

export default function RankingUnidadesPage() {
  const [rankingMensal, setRankingMensal] = useState<RankingUnidade[]>([])
  const [rankingAnual, setRankingAnual] = useState<RankingUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())

  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false)
  
  // Estados para PainelFiltersInline
  const periodoInicial = useMemo(() => {
    const inicio = new Date()
    const fim = new Date()
    inicio.setDate(1)
    inicio.setHours(0, 0, 0, 0)
    fim.setHours(23, 59, 59, 999)
    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0]
    }
  }, [])
  
  const [filtrosPainel, setFiltrosPainel] = useState(() => ({
    unidadesSelecionadas: [] as number[],
    periodoTipo: 'este-mes' as string,
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos',
    gainDateInicio: undefined as string | undefined,
    gainDateFim: undefined as string | undefined
  }))
  
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])
  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string; unidadeIds?: number[] }>>([])
  
  const filtrosAtivos = useMemo(() => {
    return filtrosPainel.unidadesSelecionadas.length > 0 ||
           filtrosPainel.periodoTipo !== 'este-mes' ||
           filtrosPainel.funilSelecionado !== 'todos' ||
           filtrosPainel.grupoSelecionado !== 'todos' ||
           filtrosPainel.gainDateInicio !== undefined ||
           filtrosPainel.gainDateFim !== undefined
  }, [filtrosPainel])
  
  // Formatar título do período
  const tituloPeriodo = useMemo(() => {
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-')
      return `${day}/${month}/${year}`
    }
    
    if (filtrosPainel.periodoInicio && filtrosPainel.periodoFim) {
      return `${formatDate(filtrosPainel.periodoInicio)} a ${formatDate(filtrosPainel.periodoFim)}`
    }
    
    return `${new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long' })}/${anoAtual}`
  }, [filtrosPainel.periodoInicio, filtrosPainel.periodoFim, mesAtual, anoAtual])

  const funilNomeSelecionado = useMemo(() => {
    if (!filtrosPainel.funilSelecionado || filtrosPainel.funilSelecionado === 'todos') return null
    const id = Number(filtrosPainel.funilSelecionado)
    const found = funis.find((f) => Number(f.id) === id)
    return found?.funil_nome || `Funil ${filtrosPainel.funilSelecionado}`
  }, [filtrosPainel.funilSelecionado, funis])

  const grupoNomeSelecionado = useMemo(() => {
    if (!filtrosPainel.grupoSelecionado || filtrosPainel.grupoSelecionado === 'todos') return null
    const id = Number(filtrosPainel.grupoSelecionado)
    const found = grupos.find((g) => Number(g.id) === id)
    return found?.nome || `Grupo ${filtrosPainel.grupoSelecionado}`
  }, [filtrosPainel.grupoSelecionado, grupos])

  const dataGanhoLabel = useMemo(() => {
    if (!filtrosPainel.gainDateInicio && !filtrosPainel.gainDateFim) return null
    const inicio = filtrosPainel.gainDateInicio ? filtrosPainel.gainDateInicio.split('-').reverse().join('/') : '...'
    const fim = filtrosPainel.gainDateFim ? filtrosPainel.gainDateFim.split('-').reverse().join('/') : '...'
    return `Ganho: ${inicio} a ${fim}`
  }, [filtrosPainel.gainDateInicio, filtrosPainel.gainDateFim])
  
  // Buscar unidades, funis e grupos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [unidadesRes, funisRes, gruposRes] = await Promise.all([
          fetch('/api/unidades'),
          fetch('/api/funis'),
          fetch('/api/unidades/grupos')
        ])
        
        if (unidadesRes.ok) {
          const unidadesData = await unidadesRes.json()
          setUnidadesList(unidadesData.unidades?.map((u: any) => ({
            id: u.id,
            nome: u.nome || u.name || 'Sem nome'
          })) || [])
        }
        
        if (funisRes.ok) {
          const funisData = await funisRes.json()
          setFunis(funisData.funis || [])
        }
        
        if (gruposRes.ok) {
          const gruposData = await gruposRes.json()
          setGrupos(gruposData.grupos || [])
        }
      } catch (err) {
        // Silently fail
      }
    }
    
    fetchData()
  }, [])
  
  // Função para calcular período baseado no tipo
  const calcularPeriodo = useCallback((tipo: string) => {
    const hoje = new Date()
    const inicio = new Date()
    const fim = new Date()

    switch (tipo) {
      case 'este-mes':
        inicio.setDate(1)
        inicio.setHours(0, 0, 0, 0)
        fim.setHours(23, 59, 59, 999)
        break
      case 'mes-passado':
        inicio.setMonth(hoje.getMonth() - 1, 1)
        inicio.setHours(0, 0, 0, 0)
        fim.setDate(0)
        fim.setHours(23, 59, 59, 999)
        break
      case 'esta-semana':
        const diaSemana = hoje.getDay()
        inicio.setDate(hoje.getDate() - diaSemana)
        inicio.setHours(0, 0, 0, 0)
        fim.setHours(23, 59, 59, 999)
        break
      case 'semana-passada':
        const diaSemanaAtual = hoje.getDay()
        inicio.setDate(hoje.getDate() - diaSemanaAtual - 7)
        inicio.setHours(0, 0, 0, 0)
        fim.setDate(hoje.getDate() - diaSemanaAtual - 1)
        fim.setHours(23, 59, 59, 999)
        break
      case 'este-ano':
        inicio.setMonth(0, 1)
        inicio.setHours(0, 0, 0, 0)
        fim.setHours(23, 59, 59, 999)
        break
      case 'ano-anterior':
        inicio.setFullYear(hoje.getFullYear() - 1, 0, 1)
        inicio.setHours(0, 0, 0, 0)
        fim.setFullYear(hoje.getFullYear() - 1, 11, 31)
        fim.setHours(23, 59, 59, 999)
        break
      default:
        return { inicio: '', fim: '' }
    }

    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0]
    }
  }, [])

  // Atualizar datas quando o tipo de período mudar
  useEffect(() => {
    if (filtrosPainel.periodoTipo !== 'personalizado') {
      const { inicio, fim } = calcularPeriodo(filtrosPainel.periodoTipo)
      if (inicio && fim) {
        setFiltrosPainel(prev => ({
          ...prev,
          periodoInicio: inicio,
          periodoFim: fim
        }))
      }
    }
  }, [filtrosPainel.periodoTipo, calcularPeriodo])

  // Converter período para mes/ano para a API
  useEffect(() => {
    if (filtrosPainel.periodoInicio) {
      const dataInicio = new Date(filtrosPainel.periodoInicio)
      setMesAtual(dataInicio.getMonth() + 1)
      setAnoAtual(dataInicio.getFullYear())
    }
  }, [filtrosPainel.periodoInicio])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const anoAtualParaAnual = new Date().getFullYear()
      
      // Buscar rankings (API de unidades só aceita tipo, mes, ano)
      const [rankingMensalResponse, rankingAnualResponse] = await Promise.all([
        fetch(`/api/ranking/unidades?tipo=mensal&mes=${mesAtual}&ano=${anoAtual}`),
        fetch(`/api/ranking/unidades?tipo=anual&ano=${anoAtualParaAnual}`)
      ])

      const [rankingMensalData, rankingAnualData] = await Promise.all([
        rankingMensalResponse.json(),
        rankingAnualResponse.json()
      ])

      if (!rankingMensalResponse.ok) {
        throw new Error(rankingMensalData.message || 'Erro ao carregar ranking do período')
      }

      if (!rankingAnualResponse.ok) {
        throw new Error(rankingAnualData.message || 'Erro ao carregar ranking anual')
      }
      
      setRankingMensal(rankingMensalData.ranking || [])
      setRankingAnual(rankingAnualData.ranking || [])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setRankingMensal([])
      setRankingAnual([])
    } finally {
      setLoading(false)
    }
  }

  const getMedalIcon = (medalha: 'ouro' | 'prata' | 'bronze' | null) => {
    switch (medalha) {
      case 'ouro':
        return <FaCrown className="h-6 w-6 text-yellow-500 drop-shadow-lg" />
      case 'prata':
        return <FaTrophy className="h-6 w-6 text-gray-400 drop-shadow-lg" />
      case 'bronze':
        return <FaMedal className="h-6 w-6 text-orange-600 drop-shadow-lg" />
      default:
        return null
    }
  }

  const renderPodio = (ranking: RankingUnidade[]) => {
    const top3 = ranking.slice(0, 3)
    
    if (top3.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {top3.map((unidade, index) => (
            <div 
              key={`podio-${unidade.unidade_id}`}
              className={`
                text-center p-3 sm:p-4 rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md
                ${index === 0 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 
                  index === 1 ? 'border-gray-400 bg-gray-50 dark:bg-gray-950/20' : 
                  'border-orange-600 bg-orange-50 dark:bg-orange-950/20'}
              `}
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex justify-center mb-2">
                  {getMedalIcon(unidade.medalha)}
                </div>
                <div className="space-y-2 flex-1 flex flex-col justify-center">
                  <h4 className="font-bold text-sm">
                    {unidade.unidade_nome}
                  </h4>
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(unidade.total_realizado)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {unidade.total_oportunidades} oportunidade{unidade.total_oportunidades !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderTabelaRanking = (ranking: RankingUnidade[], titulo: string, icon?: React.ReactNode) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {ranking.length} unidade{ranking.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-center w-16">Pos</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Total Vendas</TableHead>
                <TableHead className="text-center">Ops</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((unidade, idx) => (
                <TableRow 
                  key={`${titulo}-table-${unidade.unidade_id}`}
                  className={[
                    'hover:bg-gray-50',
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40',
                    unidade.posicao <= 3 ? 'bg-amber-50/40' : ''
                  ].join(' ')}
                >
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      {unidade.posicao <= 3 ? (
                        getMedalIcon(unidade.medalha)
                      ) : (
                        <span className="font-semibold text-gray-600">
                          #{unidade.posicao}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm text-gray-900">
                      {unidade.unidade_nome}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-green-600">
                    {formatCurrency(unidade.total_realizado)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-semibold">{unidade.total_oportunidades}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mesAtual,
    anoAtual
  ])

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="rounded-xl border bg-white">
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="h-7 w-64 bg-gray-100 rounded" />
                <div className="h-4 w-80 bg-gray-100 rounded" />
              </div>
              <div className="h-10 w-28 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="border-t px-6 pt-4">
            <div className="h-20 bg-gray-100 rounded-xl mb-6" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-[420px] bg-gray-100 rounded-xl" />
          <div className="h-[420px] bg-gray-100 rounded-xl" />
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
              setFiltros={setFiltrosPainel}
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
              <Button onClick={fetchData} variant="outline">
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
        {/* Toggle mobile */}
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
            setFiltros={setFiltrosPainel}
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
                {renderPodio(rankingMensal)}
                {renderTabelaRanking(rankingMensal, 'Ranking completo', <FaChartLine className="h-5 w-5 text-blue-500" />)}
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
              Ranking anual • {anoAtual}
              <span className="text-gray-300">•</span>
              <FaTrophy className="h-4 w-4 text-yellow-500" />
              <span>Pódio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {rankingAnual.length > 0 ? (
              <>
                {renderPodio(rankingAnual)}
                {renderTabelaRanking(rankingAnual, 'Ranking completo', <FaCalendarAlt className="h-5 w-5 text-emerald-600" />)}
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">Nenhum dado encontrado para o ano {anoAtual}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
