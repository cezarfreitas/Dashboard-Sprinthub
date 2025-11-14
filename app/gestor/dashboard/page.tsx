"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  UserCircle, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  XCircle, 
  Clock, 
  LogOut,
  RefreshCw,
  Users
} from "lucide-react"
import NovasOportunidadesCard from "@/components/novas-oportunidades-card"
import GanhosCard from "@/components/ganhos-card"
import PerdidosCard from "@/components/perdidos-card"
import AbertosCard from "@/components/abertos-card"

interface GestorData {
  id: number
  name: string
  lastName: string
  email: string
  unidades: Array<{
    id: number
    nome: string
    dpto_gestao: number | null
  }>
  unidade_principal: {
    id: number
    nome: string
    dpto_gestao: number | null
  }
}

interface VendedorStats {
  id: number
  name: string
  lastName: string
  oportunidades_criadas: number
  oportunidades_ganhas: number
  valor_ganho: number
  oportunidades_perdidas: number
  oportunidades_abertas: number
  meta: number
}

interface GestorStats {
  total_vendedores: number
  oportunidades_criadas: number
  oportunidades_ganhas: number
  valor_ganho: number
  oportunidades_perdidas: number
  oportunidades_abertas: number
  vendedores: VendedorStats[]
  meta_total: number
  etapas_funil: Array<{
    id: number
    nome_coluna: string
    sequencia: number
    total_oportunidades: number
    valor_total: number
  }>
}

export default function GestorDashboard() {
  const [gestor, setGestor] = useState<GestorData | null>(null)
  const [stats, setStats] = useState<GestorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getMesNome = (): string => {
    const dataAtual = new Date()
    const mes = dataAtual.getMonth() + 1
    const ano = dataAtual.getFullYear()
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return `${meses[mes - 1]} ${ano}`
  }

  const fetchStats = async () => {
    if (!gestor) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/gestor/stats?gestorId=${gestor.id}&unidadeId=${gestor.unidade_principal.id}`
      )
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
        setError("")
      } else {
        setError(data.message || 'Erro ao carregar estatísticas')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('gestor')
    router.push('/gestor')
  }

  useEffect(() => {
    // Verificar se gestor está logado
    const gestorData = localStorage.getItem('gestor')
    if (!gestorData) {
      router.push('/gestor')
      return
    }

    try {
      const parsedGestor = JSON.parse(gestorData)
      setGestor(parsedGestor)
    } catch (err) {
      router.push('/gestor')
    }
  }, [router])

  useEffect(() => {
    if (gestor) {
      fetchStats()
    }
  }, [gestor])

  if (!gestor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">
                  {gestor.name} {gestor.lastName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestor - {gestor.unidade_principal.nome}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200">
                <Building2 className="h-3 w-3" />
                {gestor.unidade_principal.nome}
              </Badge>
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Dashboard da Equipe</h2>
          <p className="text-muted-foreground">
            {getMesNome()}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center text-red-700">
                <p className="font-medium">Erro ao carregar dados</p>
                <p className="text-sm">{error}</p>
                <Button onClick={fetchStats} className="mt-4">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : stats ? (
          <div className="space-y-6">
            {/* Cards Principais do Dashboard */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <NovasOportunidadesCard 
                unidadeId={gestor.unidade_principal.id}
                refreshInterval={60000}
              />
              <GanhosCard 
                unidadeId={gestor.unidade_principal.id}
                refreshInterval={60000}
              />
              <PerdidosCard 
                unidadeId={gestor.unidade_principal.id}
                refreshInterval={60000}
              />
              <AbertosCard 
                unidadeId={gestor.unidade_principal.id}
                refreshInterval={60000}
              />
            </div>

            {/* Cards de Estatísticas da Equipe */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
                  <Users className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.total_vendedores}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Oportunidades Criadas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.oportunidades_criadas}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Oportunidades Ganhas</CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {stats.oportunidades_ganhas}
                  </div>
                  <p className="text-xs text-emerald-500">
                    {formatCurrency(stats.valor_ganho)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Oportunidades Perdidas</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.oportunidades_perdidas}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Oportunidades Abertas</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.oportunidades_abertas}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Meta Total */}
            {stats.meta_total > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Meta da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(stats.meta_total)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Meta estabelecida
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-purple-600">
                        {stats.meta_total > 0 
                          ? ((stats.valor_ganho / stats.meta_total) * 100).toFixed(1)
                          : '0.0'}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Atingida
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance por Vendedor */}
            {stats.vendedores && stats.vendedores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Vendedor</th>
                          <th className="text-center py-3 px-2">Criadas</th>
                          <th className="text-center py-3 px-2">Ganhas</th>
                          <th className="text-right py-3 px-2">Valor Ganho</th>
                          <th className="text-center py-3 px-2">Perdidas</th>
                          <th className="text-center py-3 px-2">Abertas</th>
                          <th className="text-right py-3 px-2">Meta</th>
                          <th className="text-center py-3 px-2">% Meta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.vendedores.map((vendedor) => {
                          const percentMeta = vendedor.meta > 0 
                            ? (vendedor.valor_ganho / vendedor.meta) * 100 
                            : 0
                          
                          return (
                            <tr key={vendedor.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2 font-medium">
                                {vendedor.name} {vendedor.lastName}
                              </td>
                              <td className="text-center py-3 px-2">
                                {vendedor.oportunidades_criadas}
                              </td>
                              <td className="text-center py-3 px-2 text-emerald-600 font-semibold">
                                {vendedor.oportunidades_ganhas}
                              </td>
                              <td className="text-right py-3 px-2 text-emerald-600">
                                {formatCurrency(vendedor.valor_ganho)}
                              </td>
                              <td className="text-center py-3 px-2 text-red-600">
                                {vendedor.oportunidades_perdidas}
                              </td>
                              <td className="text-center py-3 px-2 text-yellow-600">
                                {vendedor.oportunidades_abertas}
                              </td>
                              <td className="text-right py-3 px-2">
                                {vendedor.meta > 0 ? formatCurrency(vendedor.meta) : '-'}
                              </td>
                              <td className="text-center py-3 px-2">
                                {vendedor.meta > 0 ? (
                                  <Badge 
                                    variant={percentMeta >= 100 ? "default" : "outline"}
                                    className={
                                      percentMeta >= 100 
                                        ? "bg-emerald-600" 
                                        : percentMeta >= 75 
                                        ? "bg-yellow-500 text-white border-yellow-500" 
                                        : "text-gray-600"
                                    }
                                  >
                                    {percentMeta.toFixed(0)}%
                                  </Badge>
                                ) : '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Funil de Vendas */}
            {stats.etapas_funil && stats.etapas_funil.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Funil de Vendas da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          {stats.etapas_funil.map((etapa) => {
                            const maxValue = Math.max(...stats.etapas_funil.map(e => e.total_oportunidades))
                            const intensity = maxValue > 0 ? etapa.total_oportunidades / maxValue : 0
                            
                            let bgColor = 'bg-gray-50'
                            let textColor = 'text-gray-500'
                            
                            if (intensity > 0.9) {
                              bgColor = 'bg-red-600'
                              textColor = 'text-white'
                            } else if (intensity > 0.8) {
                              bgColor = 'bg-red-500'
                              textColor = 'text-white'
                            } else if (intensity > 0.7) {
                              bgColor = 'bg-orange-500'
                              textColor = 'text-white'
                            } else if (intensity > 0.6) {
                              bgColor = 'bg-orange-400'
                              textColor = 'text-white'
                            } else if (intensity > 0.5) {
                              bgColor = 'bg-yellow-500'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.4) {
                              bgColor = 'bg-yellow-400'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.3) {
                              bgColor = 'bg-green-400'
                              textColor = 'text-white'
                            } else if (intensity > 0.2) {
                              bgColor = 'bg-green-300'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.1) {
                              bgColor = 'bg-blue-300'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0) {
                              bgColor = 'bg-blue-200'
                              textColor = 'text-gray-800'
                            }
                            
                            return (
                              <td 
                                key={etapa.id} 
                                className={`text-center px-1 py-2 border border-gray-200 ${bgColor}`}
                                title={`${etapa.nome_coluna}\nNegócios: ${etapa.total_oportunidades}\nValor: ${formatCurrency(etapa.valor_total)}`}
                              >
                                <div className={`font-bold ${textColor} text-xs`}>
                                  {etapa.total_oportunidades}
                                </div>
                                <div className={`text-[8px] ${textColor} opacity-80 truncate`} title={etapa.nome_coluna}>
                                  {etapa.nome_coluna.replace(/^\d+\.\s*/, '').substring(0, 4)}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
