'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FaCrown, FaTrophy, FaMedal, FaChartLine, FaCalendarAlt, FaBuilding, FaDollarSign } from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'

interface Unidade {
  id: number
  nome: string
  gerente: string
  created_at?: string
  updated_at?: string
  vendedores: {
    id: number
    name: string
    lastName: string
    email: string
    username: string
    telephone: string
    unidade_id: number | null
  }[]
}

interface OportunidadeRankingUnidade {
  unidade_id: string | number
  total_realizado: string | number
  total_oportunidades: string | number
}

interface RankingUnidade {
  unidade: Unidade
  totalRealizado: number
  totalOportunidades: number
  posicao: number
  medalha: 'ouro' | 'prata' | 'bronze' | null
  crescimentoPercentual?: number
}

export default function RankingUnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [rankingMensal, setRankingMensal] = useState<RankingUnidade[]>([])
  const [rankingAnual, setRankingAnual] = useState<RankingUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const formatCurrency = (value: number): string => {
    const numValue = Math.round(Number(value) || 0)
    return `R$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
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

  const processarRankingUnidades = (
    oportunidades: OportunidadeRankingUnidade[], 
    unidadesList: Unidade[],
    rankingMesAnterior?: OportunidadeRankingUnidade[]
  ): RankingUnidade[] => {
    const rankingArray: RankingUnidade[] = []

    oportunidades.forEach(oportunidade => {
      const unidadeId = oportunidade.unidade_id.toString()
      const unidade = unidadesList.find(u => u.id.toString() === unidadeId)
      
      if (unidade) {
        // Calcular crescimento se dados do mês anterior estiverem disponíveis
        let crescimentoPercentual: number | undefined = undefined
        if (rankingMesAnterior) {
          const dadosMesAnterior = rankingMesAnterior.find(r => r.unidade_id.toString() === unidadeId)
          if (dadosMesAnterior && Number(dadosMesAnterior.total_realizado) > 0) {
            const valorAtual = Number(oportunidade.total_realizado) || 0
            const valorAnterior = Number(dadosMesAnterior.total_realizado) || 0
            crescimentoPercentual = ((valorAtual - valorAnterior) / valorAnterior) * 100
          }
        }
        
        rankingArray.push({
          unidade,
          totalRealizado: Number(oportunidade.total_realizado) || 0,
          totalOportunidades: Number(oportunidade.total_oportunidades) || 0,
          posicao: 0,
          medalha: null,
          crescimentoPercentual
        })
      }
    })

    // Ordenar por total realizado (decrescente)
    rankingArray.sort((a, b) => b.totalRealizado - a.totalRealizado)

    // Definir posições e medalhas
    rankingArray.forEach((item, index) => {
      item.posicao = index + 1
      if (index === 0) item.medalha = 'ouro'
      else if (index === 1) item.medalha = 'prata'
      else if (index === 2) item.medalha = 'bronze'
    })

    return rankingArray
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar unidades
      const unidadesResponse = await fetch('/api/unidades')
      if (!unidadesResponse.ok) throw new Error('Erro ao buscar unidades')
      const unidadesData = await unidadesResponse.json()
      const unidadesList = unidadesData.unidades || []
      setUnidades(unidadesList)

      // Buscar ranking mensal
      const rankingMensalResponse = await fetch('/api/oportunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'mensal',
          mes: mesAtual,
          ano: anoAtual,
          agruparPor: 'unidade'
        })
      })

      if (!rankingMensalResponse.ok) throw new Error('Erro ao buscar ranking mensal')
      const responseMensal = await rankingMensalResponse.json()
      const dadosRankingMensal = responseMensal.ranking || []

      // Buscar ranking do mês anterior para calcular crescimento
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
      const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual

      const rankingMesAnteriorResponse = await fetch('/api/oportunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'mensal',
          mes: mesAnterior,
          ano: anoAnterior,
          agruparPor: 'unidade'
        })
      })

      const responseMesAnterior = rankingMesAnteriorResponse.ok 
        ? await rankingMesAnteriorResponse.json()
        : null
      const dadosRankingMesAnterior = responseMesAnterior?.ranking || null

      // Buscar ranking anual
      const rankingAnualResponse = await fetch('/api/oportunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'anual',
          ano: anoAtual,
          agruparPor: 'unidade'
        })
      })

      if (!rankingAnualResponse.ok) throw new Error('Erro ao buscar ranking anual')
      const responseAnual = await rankingAnualResponse.json()
      const dadosRankingAnual = responseAnual.ranking || []

      // Processar dados
      const rankingMensalProcessado = processarRankingUnidades(dadosRankingMensal, unidadesList, dadosRankingMesAnterior)
      const rankingAnualProcessado = processarRankingUnidades(dadosRankingAnual, unidadesList)

      setRankingMensal(rankingMensalProcessado)
      setRankingAnual(rankingAnualProcessado)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const renderPodio = (ranking: RankingUnidade[], titulo: string, icon?: React.ReactNode, showGrowth: boolean = false) => {
    const top3 = ranking.slice(0, 3)
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold">{titulo}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {top3.map((unidadeRank, index) => (
            <div 
              key={`${titulo}-podio-${unidadeRank.unidade.id}`}
              className={`
                text-center p-4 rounded-lg border-2 shadow-lg transition-all duration-300 hover:scale-105
                ${index === 0 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 
                  index === 1 ? 'border-gray-400 bg-gray-50 dark:bg-gray-950/20' : 
                  'border-orange-600 bg-orange-50 dark:bg-orange-950/20'}
              `}
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex justify-center mb-2">
                  {getMedalIcon(unidadeRank.medalha)}
                </div>
                <div className="space-y-2 flex-1 flex flex-col justify-center">
                  <h4 className="font-bold text-sm">
                    {unidadeRank.unidade.nome}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Gerente: {unidadeRank.unidade.gerente}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unidadeRank.unidade.vendedores.length} vendedor{unidadeRank.unidade.vendedores.length !== 1 ? 'es' : ''}
                  </p>
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(unidadeRank.totalRealizado)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {unidadeRank.totalOportunidades} oportunidade{unidadeRank.totalOportunidades !== 1 ? 's' : ''}
                    </div>
                    {showGrowth && unidadeRank.crescimentoPercentual !== undefined && (
                      <div className={`text-xs font-semibold ${
                        unidadeRank.crescimentoPercentual > 0 
                          ? 'text-green-600' 
                          : unidadeRank.crescimentoPercentual < 0 
                            ? 'text-red-600' 
                            : 'text-gray-500'
                      }`}>
                        {unidadeRank.crescimentoPercentual > 0 ? '+' : ''}{unidadeRank.crescimentoPercentual.toFixed(1)}%
                      </div>
                    )}
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
          <h3 className="text-lg font-semibold">{titulo}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Posição
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Unidade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Gerente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Vendedores
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Realizado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Oportunidades
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ranking.map((unidadeRank) => (
                <tr 
                  key={`${titulo}-tabela-${unidadeRank.unidade.id}`}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {unidadeRank.posicao}
                      </Badge>
                      {unidadeRank.medalha && (
                        <div className="flex-shrink-0">
                          {getMedalIcon(unidadeRank.medalha)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {unidadeRank.unidade.nome}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {unidadeRank.unidade.gerente}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {unidadeRank.unidade.vendedores.length}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(unidadeRank.totalRealizado)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {unidadeRank.totalOportunidades}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ranking de Unidades</h1>
            <p className="text-muted-foreground">
              Performance das unidades em {mesAtual}/{anoAtual}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <HiRefresh className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando dados...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ranking de Unidades</h1>
            <p className="text-muted-foreground">
              Performance das unidades em {mesAtual}/{anoAtual}
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Erro ao carregar dados: {error}</p>
              <Button onClick={fetchData} variant="outline">
                <HiRefresh className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ranking de Unidades</h1>
          <p className="text-muted-foreground">
            Performance das unidades em {mesAtual}/{anoAtual}
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <HiRefresh className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {(rankingMensal.length === 0 && rankingAnual.length === 0) ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Nenhum dado de ranking encontrado para este período.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8 lg:divide-x lg:divide-gray-200">
          {/* Ranking Mensal */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FaCalendarAlt className="h-5 w-5 text-primary" />
                  Pódio do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingMensal.length > 0 ? (
                  renderPodio(
                    rankingMensal, 
                    `Top 3 - ${mesAtual.toString().padStart(2, '0')}/${anoAtual}`,
                    <FaCalendarAlt className="h-4 w-4 text-primary" />,
                    true
                  )
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum dado mensal encontrado
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking Completo - Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                {rankingMensal.length > 0 ? (
                  renderTabelaRanking(
                    rankingMensal,
                    `Todas as Unidades - ${mesAtual.toString().padStart(2, '0')}/${anoAtual}`,
                    <FaCalendarAlt className="h-4 w-4 text-primary" />
                  )
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum dado mensal encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Separador em telas menores */}
          <div className="lg:hidden border-t border-gray-200 my-6"></div>

          {/* Ranking Anual */}
          <div className="space-y-8 lg:pl-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FaChartLine className="h-5 w-5 text-primary" />
                  Pódio do Ano
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingAnual.length > 0 ? (
                  renderPodio(
                    rankingAnual, 
                    `Top 3 - ${anoAtual}`,
                    <FaChartLine className="h-4 w-4 text-primary" />
                  )
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum dado anual encontrado
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking Completo - Anual</CardTitle>
              </CardHeader>
              <CardContent>
                {rankingAnual.length > 0 ? (
                  renderTabelaRanking(
                    rankingAnual,
                    `Todas as Unidades - ${anoAtual}`,
                    <FaChartLine className="h-4 w-4 text-primary" />
                  )
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum dado anual encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
