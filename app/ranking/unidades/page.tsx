'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar } from 'lucide-react'
import { FaCrown, FaTrophy, FaMedal, FaChartLine, FaCalendarAlt, FaBuilding } from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'

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

export default function RankingUnidadesPage() {
  const [rankingMensal, setRankingMensal] = useState<RankingUnidade[]>([])
  const [rankingAnual, setRankingAnual] = useState<RankingUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())

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

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Buscar rankings mensal e anual em paralelo
      const [rankingMensalResponse, rankingAnualResponse] = await Promise.all([
        fetch(`/api/ranking/unidades?tipo=mensal&mes=${mesAtual}&ano=${anoAtual}`),
        fetch(`/api/ranking/unidades?tipo=anual&ano=${anoAtual}`)
      ])

      const [rankingMensalData, rankingAnualData] = await Promise.all([
        rankingMensalResponse.json(),
        rankingAnualResponse.json()
      ])

      if (!rankingMensalResponse.ok) {
        throw new Error(rankingMensalData.message || 'Erro ao carregar ranking mensal')
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

  const renderPodio = (ranking: RankingUnidade[], titulo: string, icon?: React.ReactNode) => {
    const top3 = ranking.slice(0, 3)
    
    if (top3.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold">{titulo}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {top3.map((unidade, index) => (
            <div 
              key={`${titulo}-podio-${unidade.unidade_id}`}
              className={`
                text-center p-4 rounded-lg border-2 shadow-lg transition-all duration-300 hover:scale-105
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
                  <p className="text-xs text-muted-foreground">
                    {unidade.unidade_responsavel}
                  </p>
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
          <h3 className="text-lg font-semibold">{titulo}</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center w-16">Pos</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Total Vendas</TableHead>
              <TableHead className="text-center">Oportunidades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((unidade) => (
              <TableRow 
                key={`${titulo}-table-${unidade.unidade_id}`}
                className={unidade.posicao <= 3 ? 'bg-muted/50' : ''}
              >
                <TableCell className="text-center">
                  <div className="flex items-center justify-center">
                    {unidade.posicao <= 3 ? (
                      getMedalIcon(unidade.medalha)
                    ) : (
                      <span className="font-bold text-muted-foreground">
                        #{unidade.posicao}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {unidade.unidade_nome}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {unidade.unidade_responsavel}
                    </div>
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
    )
  }

  useEffect(() => {
    fetchData()
  }, [mesAtual, anoAtual])

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <HiRefresh className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold">Carregando ranking...</p>
                <p className="text-sm text-muted-foreground">Aguarde enquanto buscamos os dados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
                <span className="text-3xl">⚠️</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Erro ao carregar dados</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchData} size="lg" className="gap-2">
                <HiRefresh className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Ranking de Unidades</h1>
              <p className="text-sm text-muted-foreground">
                Rankings mensal e anual baseados em vendas concluídas
              </p>
            </div>
            <Button onClick={fetchData} variant="outline" size="lg" className="gap-2">
              <HiRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Ranking Mensal */}
        <div className="space-y-6">
          {/* Filtro Mensal */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <FaCalendarAlt className="h-4 w-4" />
                  <span className="text-sm font-semibold">Período Mensal</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {/* Filtro de Mês */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mês:</span>
                    <Select value={mesAtual.toString()} onValueChange={(value) => setMesAtual(parseInt(value))}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                          <SelectItem key={mes} value={mes.toString()}>
                            {new Date(2024, mes - 1).toLocaleString('pt-BR', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro de Ano */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ano:</span>
                    <Select value={anoAtual.toString()} onValueChange={(value) => setAnoAtual(parseInt(value))}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((ano) => (
                          <SelectItem key={ano} value={ano.toString()}>
                            {ano}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {rankingMensal.length > 0 ? (
            <>
              {renderPodio(rankingMensal, `Top 3 - ${new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long' }).charAt(0).toUpperCase() + new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long' }).slice(1)}/${anoAtual}`, <FaTrophy className="h-5 w-5 text-yellow-500" />)}
              {renderTabelaRanking(rankingMensal, `Ranking Completo`, <FaChartLine className="h-5 w-5 text-blue-500" />)}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum dado encontrado para {new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long' })}/{anoAtual}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ranking Anual */}
        <div className="space-y-6">
          {/* Filtro Anual */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FaCalendarAlt className="h-4 w-4" />
                  <span className="text-sm font-semibold">Período Anual</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ano:</span>
                  <Select value={anoAtual.toString()} onValueChange={(value) => setAnoAtual(parseInt(value))}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((ano) => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {rankingAnual.length > 0 ? (
            <>
              {renderPodio(rankingAnual, `Top 3 - ${anoAtual}`, <FaTrophy className="h-5 w-5 text-yellow-500" />)}
              {renderTabelaRanking(rankingAnual, `Ranking Completo`, <FaCalendarAlt className="h-5 w-5 text-green-500" />)}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum dado encontrado para o ano {anoAtual}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
