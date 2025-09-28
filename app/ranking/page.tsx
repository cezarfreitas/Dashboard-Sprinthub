"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { 
  Users, 
  Building2,
  RefreshCw,
  Calendar,
  ChevronDown
} from 'lucide-react'
import { 
  FaMedal,
  FaTrophy,
  FaAward,
  FaCrown,
  FaChartLine,
  FaCalendarAlt,
  FaUsers as FaUsersIcon,
  FaBuilding,
  FaDollarSign
} from 'react-icons/fa'
import { HiRefresh } from 'react-icons/hi'

interface Vendedor {
  id: number
  name: string
  lastName: string
  email: string
  username: string
  telephone?: string
  unidade_id?: number
}

interface Unidade {
  id: number
  nome: string
  gerente: string
  vendedores: Vendedor[]
}

interface RankingVendedor {
  vendedor: Vendedor
  unidade?: Unidade
  totalRealizado: number
  totalOportunidades: number
  posicao: number
  medalha: 'ouro' | 'prata' | 'bronze' | null
  crescimentoPercentual?: number // Para comparação com mês anterior
}

interface OportunidadeRanking {
  user: string | number
  total_realizado: number
  total_oportunidades: number
}

// Função para formatar valores monetários
const formatCurrency = (value: number): string => {
  const numValue = Math.round(Number(value) || 0)
  return `R$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

export default function RankingPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
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
      // Calcular mês anterior
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
      const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
      
      // Buscar unidades, vendedores e rankings de oportunidades em paralelo
      const [unidadesResponse, vendedoresResponse, rankingMensalResponse, rankingAnualResponse, rankingMesAnteriorResponse] = await Promise.all([
        fetch('/api/unidades'),
        fetch('/api/vendedores/mysql'),
        fetch('/api/oportunidades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'mensal', mes: mesAtual, ano: anoAtual })
        }),
        fetch('/api/oportunidades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'anual', mes: mesAtual, ano: anoAtual })
        }),
        fetch('/api/oportunidades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'mensal', mes: mesAnterior, ano: anoMesAnterior })
        })
      ])

      const [unidadesData, vendedoresData, rankingMensalData, rankingAnualData, rankingMesAnteriorData] = await Promise.all([
        unidadesResponse.json(),
        vendedoresResponse.json(),
        rankingMensalResponse.json(),
        rankingAnualResponse.json(),
        rankingMesAnteriorResponse.json()
      ])
      
      if (!unidadesResponse.ok) {
        throw new Error(unidadesData.message || 'Erro ao carregar unidades')
      }
      
      if (!vendedoresResponse.ok) {
        throw new Error(vendedoresData.message || 'Erro ao carregar vendedores')
      }

      if (!rankingMensalResponse.ok) {
        throw new Error(rankingMensalData.message || 'Erro ao carregar ranking mensal')
      }

      if (!rankingAnualResponse.ok) {
        throw new Error(rankingAnualData.message || 'Erro ao carregar ranking anual')
      }
      
      const unidadesList = unidadesData.unidades || []
      const vendedoresList = vendedoresData.vendedores || []
      
      setUnidades(unidadesList)
      setVendedores(vendedoresList)
      
      
      // Processar rankings reais com dados da tabela oportunidades
      const rankingMensalProcessado = processarRankingReal(
        rankingMensalData.ranking || [], 
        vendedoresList, 
        unidadesList,
        rankingMesAnteriorData.ranking || [] // Dados do mês anterior para calcular crescimento
      )
      const rankingAnualProcessado = processarRankingReal(rankingAnualData.ranking || [], vendedoresList, unidadesList)
      
      
      setRankingMensal(rankingMensalProcessado)
      setRankingAnual(rankingAnualProcessado)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setVendedores([])
      setUnidades([])
      setRankingMensal([])
      setRankingAnual([])
    } finally {
      setLoading(false)
    }
  }

  const processarRankingReal = (rankingOportunidades: OportunidadeRanking[], vendedoresList: Vendedor[], unidadesList: Unidade[], rankingMesAnterior?: OportunidadeRanking[]): RankingVendedor[] => {
    const rankingArray: RankingVendedor[] = []
    
    
    if (!rankingOportunidades || rankingOportunidades.length === 0) {
      return []
    }
    
    rankingOportunidades.forEach((oportunidade) => {
      // Garantir que user seja string para comparação
      const userId = oportunidade.user.toString()
      
      // Encontrar vendedor pelo ID (user field)
      const vendedor = vendedoresList.find(v => v.id.toString() === userId)
      
      
      if (vendedor) {
        // Encontrar unidade do vendedor
        const unidade = unidadesList.find(u => u.vendedores.some(v => v.id === vendedor.id))
        
        // Calcular crescimento se dados do mês anterior estiverem disponíveis
        let crescimentoPercentual: number | undefined = undefined
        if (rankingMesAnterior) {
          const dadosMesAnterior = rankingMesAnterior.find(r => r.user.toString() === userId)
          if (dadosMesAnterior && dadosMesAnterior.total_realizado > 0) {
            const valorAtual = Number(oportunidade.total_realizado) || 0
            const valorAnterior = Number(dadosMesAnterior.total_realizado) || 0
            crescimentoPercentual = ((valorAtual - valorAnterior) / valorAnterior) * 100
          }
        }
        
        rankingArray.push({
          vendedor,
          unidade,
          totalRealizado: Number(oportunidade.total_realizado) || 0,
          totalOportunidades: Number(oportunidade.total_oportunidades) || 0,
          posicao: 0, // Será definido depois
          medalha: null, // Será definido depois
          crescimentoPercentual
        })
      }
    })
    
    
    // Reordenar por total realizado e definir posições e medalhas
    rankingArray.sort((a, b) => b.totalRealizado - a.totalRealizado)
    
    rankingArray.forEach((item, index) => {
      item.posicao = index + 1
      item.medalha = index === 0 ? 'ouro' : index === 1 ? 'prata' : index === 2 ? 'bronze' : null
    })
    
    return rankingArray
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

  const renderPodio = (ranking: RankingVendedor[], titulo: string, icon?: React.ReactNode, showGrowth: boolean = false) => {
    const top3 = ranking.slice(0, 3)
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold">{titulo}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {top3.map((vendedorRank, index) => (
            <div 
              key={`${titulo}-podio-${vendedorRank.vendedor.id}`}
              className={`
                text-center p-4 rounded-lg border-2 shadow-lg transition-all duration-300 hover:scale-105
                ${index === 0 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 
                  index === 1 ? 'border-gray-400 bg-gray-50 dark:bg-gray-950/20' : 
                  'border-orange-600 bg-orange-50 dark:bg-orange-950/20'}
              `}
            >
              <div className="h-full flex flex-col justify-between">
                <div className="flex justify-center mb-2">
                  {getMedalIcon(vendedorRank.medalha)}
                </div>
                <div className="space-y-2 flex-1 flex flex-col justify-center">
                  <h4 className="font-bold text-sm">
                    {vendedorRank.vendedor.name} {vendedorRank.vendedor.lastName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {vendedorRank.unidade?.nome || 'Sem Unidade'}
                  </p>
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(vendedorRank.totalRealizado)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {vendedorRank.totalOportunidades} oportunidade{vendedorRank.totalOportunidades !== 1 ? 's' : ''}
                    </div>
                    {showGrowth && vendedorRank.crescimentoPercentual !== undefined && (
                      <div className={`text-xs font-semibold ${
                        vendedorRank.crescimentoPercentual > 0 
                          ? 'text-green-600' 
                          : vendedorRank.crescimentoPercentual < 0 
                            ? 'text-red-600' 
                            : 'text-gray-500'
                      }`}>
                        {vendedorRank.crescimentoPercentual > 0 ? '+' : ''}{vendedorRank.crescimentoPercentual.toFixed(1)}%
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
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Total Vendas</TableHead>
              <TableHead className="text-center">Oportunidades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((vendedorRank) => (
              <TableRow 
                key={`${titulo}-table-${vendedorRank.vendedor.id}`}
                className={vendedorRank.posicao <= 3 ? 'bg-muted/50' : ''}
              >
                <TableCell className="text-center">
                  <div className="flex items-center justify-center">
                    {vendedorRank.posicao <= 3 ? (
                      getMedalIcon(vendedorRank.medalha)
                    ) : (
                      <span className="font-bold text-muted-foreground">
                        #{vendedorRank.posicao}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {vendedorRank.vendedor.name} {vendedorRank.vendedor.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {vendedorRank.vendedor.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-sm">
                    {vendedorRank.unidade?.nome || 'Sem Unidade'}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold text-green-600">
                  {formatCurrency(vendedorRank.totalRealizado)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-semibold">{vendedorRank.totalOportunidades}</span>
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
            Rankings mensal e anual dos vendedores
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
                  <SelectValue />
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
              {renderPodio(rankingMensal, `Pódio - ${new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long' })}/${anoAtual}`, <FaTrophy className="h-5 w-5 text-yellow-500" />, true)}
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