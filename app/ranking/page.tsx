"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { 
  FaMedal,
  FaTrophy,
  FaCrown,
  FaChartLine,
  FaCalendarAlt
} from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'

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

// Função para formatar valores monetários
const formatCurrency = (value: number): string => {
  const numValue = Math.round(Number(value) || 0)
  return `R$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

export default function RankingPage() {
  const [rankingMensal, setRankingMensal] = useState<RankingVendedor[]>([])
  const [rankingAnual, setRankingAnual] = useState<RankingVendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Buscar rankings mensal e anual em paralelo
      const [rankingMensalResponse, rankingAnualResponse] = await Promise.all([
        fetch(`/api/ranking/vendedores?tipo=mensal&mes=${mesAtual}&ano=${anoAtual}`),
        fetch(`/api/ranking/vendedores?tipo=anual&ano=${anoAtual}`)
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

  const renderPodio = (ranking: RankingVendedor[], titulo: string, icon?: React.ReactNode) => {
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
          {top3.map((vendedor, index) => (
            <div 
              key={`${titulo}-podio-${vendedor.vendedor_id}`}
              className={`
                text-center p-4 rounded-lg border-2 shadow-lg transition-all duration-300 hover:scale-105
                ${index === 0 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 
                  index === 1 ? 'border-gray-400 bg-gray-50 dark:bg-gray-950/20' : 
                  'border-orange-600 bg-orange-50 dark:bg-orange-950/20'}
              `}
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex justify-center mb-2">
                  {getMedalIcon(vendedor.medalha)}
                </div>
                <div className="space-y-2 flex-1 flex flex-col justify-center">
                  <h4 className="font-bold text-sm">
                    {vendedor.name} {vendedor.lastName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    @{vendedor.username}
                  </p>
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(vendedor.total_realizado)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {vendedor.total_oportunidades} oportunidade{vendedor.total_oportunidades !== 1 ? 's' : ''}
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

  const renderTabelaRanking = (ranking: RankingVendedor[], titulo: string, icon?: React.ReactNode) => {
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
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Total Vendas</TableHead>
              <TableHead className="text-center">Oportunidades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((vendedor) => (
              <TableRow 
                key={`${titulo}-table-${vendedor.vendedor_id}`}
                className={vendedor.posicao <= 3 ? 'bg-muted/50' : ''}
              >
                <TableCell className="text-center">
                  <div className="flex items-center justify-center">
                    {vendedor.posicao <= 3 ? (
                      getMedalIcon(vendedor.medalha)
                    ) : (
                      <span className="font-bold text-muted-foreground">
                        #{vendedor.posicao}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {vendedor.name} {vendedor.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {vendedor.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold text-green-600">
                  {formatCurrency(vendedor.total_realizado)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-semibold">{vendedor.total_oportunidades}</span>
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
        <div className="flex items-center justify-center h-64">
          <HiRefresh className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando ranking...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
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
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ranking de Vendedores</h1>
          <p className="text-muted-foreground">
            Rankings mensal e anual baseados em vendas concluídas (status: gain)
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <HiRefresh className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:divide-x xl:divide-gray-200">
        {/* Ranking Mensal */}
        <div className="space-y-6">
          {/* Filtro Mensal */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Filtro Mensal:</span>
            </div>
            
            {/* Filtro de Mês */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-700 dark:text-blue-300">Mês:</span>
              <Select value={mesAtual.toString()} onValueChange={(value) => setMesAtual(parseInt(value))}>
                <SelectTrigger className="w-32">
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
              <span className="text-sm text-blue-700 dark:text-blue-300">Ano:</span>
              <Select value={anoAtual.toString()} onValueChange={(value) => setAnoAtual(parseInt(value))}>
                <SelectTrigger className="w-24">
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

          {rankingMensal.length > 0 ? (
            <>
              {renderPodio(rankingMensal, `Pódio - ${new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long' })}/${anoAtual}`, <FaTrophy className="h-5 w-5 text-yellow-500" />)}
              {renderTabelaRanking(rankingMensal, `Ranking Completo - ${new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long' })}/${anoAtual}`, <FaChartLine className="h-5 w-5 text-blue-500" />)}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum dado encontrado para {new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long' })}/{anoAtual}</p>
            </div>
          )}
        </div>

        {/* Separador para telas menores */}
        <div className="xl:hidden border-t border-gray-200 my-8"></div>

        {/* Ranking Anual */}
        <div className="space-y-6 xl:pl-8">
          {/* Filtro Anual */}
          <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Filtro Anual:</span>
            </div>
            
            {/* Filtro de Ano */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-700 dark:text-green-300">Ano:</span>
              <Select value={anoAtual.toString()} onValueChange={(value) => setAnoAtual(parseInt(value))}>
                <SelectTrigger className="w-24">
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

          {rankingAnual.length > 0 ? (
            <>
              {renderPodio(rankingAnual, `Pódio - ${anoAtual}`, <FaTrophy className="h-5 w-5 text-yellow-500" />)}
              {renderTabelaRanking(rankingAnual, `Ranking Completo - ${anoAtual}`, <FaCalendarAlt className="h-5 w-5 text-green-500" />)}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum dado encontrado para o ano {anoAtual}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
