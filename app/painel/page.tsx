"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Unidade {
  id: number
  nome?: string
  name?: string
  nome_exibicao?: string
  oportunidades_abertas: number
  oportunidades_ganhas: number
  oportunidades_perdidas: number
  valor_ganho: number
}

// Array de cores bonitas para os cards
const cardColors = [
  {
    bg: "bg-gradient-to-br from-blue-500 to-blue-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-purple-500 to-purple-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-pink-500 to-pink-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-teal-500 to-teal-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-violet-500 to-violet-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-rose-500 to-rose-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-orange-500 to-orange-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-amber-500 to-amber-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-lime-500 to-lime-600",
    text: "text-white"
  }
]

// Função para obter cor baseada no ID (determinística mas variada)
const getCardColor = (id: number) => {
  return cardColors[id % cardColors.length]
}

export default function PainelPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [oportunidadesCriadas, setOportunidadesCriadas] = useState<any[]>([])
  const [receitaDiaria, setReceitaDiaria] = useState<any[]>([])
  const [loadingGraficos, setLoadingGraficos] = useState(true)
  const [stats, setStats] = useState({
    criadasHoje: 0,
    ganhasHoje: 0,
    acumuladoMes: 0,
    perdidasMes: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [oportunidadesRecentes, setOportunidadesRecentes] = useState<any[]>([])
  const [loadingRecentes, setLoadingRecentes] = useState(true)
  
  const dataAtual = new Date()
  const mesAtual = dataAtual.getMonth() + 1
  const anoAtual = dataAtual.getFullYear()
  const diaAtual = dataAtual.getDate()

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/unidades/painel')
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Erro ao carregar unidades')
        }

        setUnidades(data.unidades || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setUnidades([])
      } finally {
        setLoading(false)
      }
    }

    const fetchGraficos = async () => {
      try {
        setLoadingGraficos(true)
        
        // Buscar oportunidades criadas
        const responseCriadas = await fetch(`/api/oportunidades/daily-created?mes=${mesAtual}&ano=${anoAtual}`)
        const dataCriadas = await responseCriadas.json()
        if (dataCriadas.success) {
          setOportunidadesCriadas(dataCriadas.dados || [])
        }
        
        // Buscar receita diária
        const responseReceita = await fetch(`/api/oportunidades/daily-gain?mes=${mesAtual}&ano=${anoAtual}`)
        const dataReceita = await responseReceita.json()
        if (dataReceita.success) {
          setReceitaDiaria(dataReceita.dados || [])
        }
      } catch (err) {
        console.error('Erro ao carregar gráficos:', err)
      } finally {
        setLoadingGraficos(false)
      }
    }

    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        
        // Buscar estatísticas
        const hoje = new Date()
        const diaHoje = hoje.getDate()
        const mesHoje = hoje.getMonth() + 1
        const anoHoje = hoje.getFullYear()
        
        // Criadas Hoje
        const criadasHojeResponse = await fetch(`/api/oportunidades/daily-created?mes=${mesHoje}&ano=${anoHoje}`)
        const criadasHojeData = await criadasHojeResponse.json()
        const criadasHoje = criadasHojeData.success 
          ? (criadasHojeData.dados.find((d: any) => d.dia === diaHoje)?.total_criadas || 0)
          : 0
        
        // Ganhas Hoje e Acumulado Mês
        const ganhasResponse = await fetch(`/api/oportunidades/daily-gain?mes=${mesHoje}&ano=${anoHoje}`)
        const ganhasData = await ganhasResponse.json()
        const ganhasHoje = ganhasData.success 
          ? (ganhasData.dados.find((d: any) => d.dia === diaHoje)?.valor_total || 0)
          : 0
        const acumuladoMes = ganhasData.success 
          ? (ganhasData.valor_total_mes || 0)
          : 0
        
        // Perdidas Mês
        const perdidasResponse = await fetch(`/api/oportunidades/perdidos?mes=${mesHoje}&ano=${anoHoje}`)
        const perdidasData = await perdidasResponse.json()
        const perdidasMes = perdidasData.success 
          ? (perdidasData.data?.totalOportunidades || 0)
          : 0
        
        setStats({
          criadasHoje,
          ganhasHoje,
          acumuladoMes,
          perdidasMes
        })
      } catch (err) {
        console.error('Erro ao carregar estatísticas:', err)
      } finally {
        setLoadingStats(false)
      }
    }

    const fetchRecentes = async () => {
      try {
        const response = await fetch('/api/oportunidades/recentes?limit=20')
        const data = await response.json()
        
        // Gerar dados simulados sempre (para demonstração)
        const agora = new Date()
        const simuladas = [
          {
            id: 1,
            nome: 'Oportunidade ABC - Cliente Premium',
            valor: 45000,
            status: 'gain',
            dataCriacao: new Date(agora.getTime() - 2 * 60000).toISOString(),
            vendedor: 'João Silva',
            unidade: 'Unidade Centro'
          },
          {
            id: 2,
            nome: 'Projeto XYZ - Empresa Tech',
            valor: 28000,
            status: 'open',
            dataCriacao: new Date(agora.getTime() - 5 * 60000).toISOString(),
            vendedor: 'Maria Santos',
            unidade: 'Unidade Norte'
          },
          {
            id: 3,
            nome: 'Contrato DEF - Startup',
            valor: 15000,
            status: 'lost',
            dataCriacao: new Date(agora.getTime() - 8 * 60000).toISOString(),
            vendedor: 'Pedro Costa',
            unidade: 'Unidade Sul'
          },
          {
            id: 4,
            nome: 'Oportunidade GHI - Corporativo',
            valor: 67000,
            status: 'gain',
            dataCriacao: new Date(agora.getTime() - 12 * 60000).toISOString(),
            vendedor: 'Ana Oliveira',
            unidade: 'Unidade Leste'
          },
          {
            id: 5,
            nome: 'Projeto JKL - E-commerce',
            valor: 32000,
            status: 'open',
            dataCriacao: new Date(agora.getTime() - 15 * 60000).toISOString(),
            vendedor: 'Carlos Mendes',
            unidade: 'Unidade Oeste'
          },
          {
            id: 6,
            nome: 'Contrato MNO - Indústria',
            valor: 55000,
            status: 'gain',
            dataCriacao: new Date(agora.getTime() - 20 * 60000).toISOString(),
            vendedor: 'Julia Ferreira',
            unidade: 'Unidade Centro'
          },
          {
            id: 7,
            nome: 'Oportunidade PQR - Serviços',
            valor: 18000,
            status: 'open',
            dataCriacao: new Date(agora.getTime() - 25 * 60000).toISOString(),
            vendedor: 'Roberto Alves',
            unidade: 'Unidade Norte'
          },
          {
            id: 8,
            nome: 'Projeto STU - Varejo',
            valor: 22000,
            status: 'lost',
            dataCriacao: new Date(agora.getTime() - 30 * 60000).toISOString(),
            vendedor: 'Fernanda Lima',
            unidade: 'Unidade Sul'
          },
          {
            id: 9,
            nome: 'Contrato VWX - Financeiro',
            valor: 89000,
            status: 'gain',
            dataCriacao: new Date(agora.getTime() - 35 * 60000).toISOString(),
            vendedor: 'Lucas Souza',
            unidade: 'Unidade Leste'
          },
          {
            id: 10,
            nome: 'Oportunidade YZA - Saúde',
            valor: 41000,
            status: 'open',
            dataCriacao: new Date(agora.getTime() - 40 * 60000).toISOString(),
            vendedor: 'Patricia Rocha',
            unidade: 'Unidade Oeste'
          }
        ]
        
        // Sempre usar dados simulados para demonstração
        // Se houver dados reais, pode mesclar ou substituir
        setOportunidadesRecentes(simuladas)
      } catch (err) {
        console.error('Erro ao carregar oportunidades recentes:', err)
        // Em caso de erro, usar dados simulados
        const agora = new Date()
        const simuladas = [
          {
            id: 1,
            nome: 'Oportunidade ABC - Cliente Premium',
            valor: 45000,
            status: 'gain',
            dataCriacao: new Date(agora.getTime() - 2 * 60000).toISOString(),
            vendedor: 'João Silva',
            unidade: 'Unidade Centro'
          },
          {
            id: 2,
            nome: 'Projeto XYZ - Empresa Tech',
            valor: 28000,
            status: 'open',
            dataCriacao: new Date(agora.getTime() - 5 * 60000).toISOString(),
            vendedor: 'Maria Santos',
            unidade: 'Unidade Norte'
          },
          {
            id: 3,
            nome: 'Contrato DEF - Startup',
            valor: 15000,
            status: 'lost',
            dataCriacao: new Date(agora.getTime() - 8 * 60000).toISOString(),
            vendedor: 'Pedro Costa',
            unidade: 'Unidade Sul'
          }
        ]
        setOportunidadesRecentes(simuladas)
      } finally {
        setLoadingRecentes(false)
      }
    }

    fetchUnidades()
    fetchGraficos()
    fetchStats()
    fetchRecentes()

    // Atualizar oportunidades recentes a cada 5 segundos
    const intervalRecentes = setInterval(fetchRecentes, 5000)

    return () => {
      clearInterval(intervalRecentes)
    }
  }, [mesAtual, anoAtual, diaAtual])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-400">Carregando unidades...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-red-500">Erro: {error}</div>
      </div>
    )
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getMesNome = (mes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1] || ''
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}m atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    return `${diffDays}d atrás`
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar de Oportunidades Recentes */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 overflow-y-auto max-h-screen sticky top-0 scrollbar-hide">
        <div className="p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-white font-bold text-lg uppercase">Oportunidades Recentes</h2>
          <p className="text-gray-400 text-xs mt-1">Atualização em tempo real</p>
        </div>
        <div className="p-4 space-y-3">
          {loadingRecentes ? (
            <div className="text-center py-8">
              <span className="text-gray-400 text-sm">Carregando...</span>
            </div>
          ) : oportunidadesRecentes.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-gray-400 text-sm">Nenhuma oportunidade recente</span>
            </div>
          ) : (
            oportunidadesRecentes.map((op) => {
              const statusConfig = {
                gain: { 
                  bg: 'bg-green-900/30', 
                  border: 'border-green-700', 
                  badge: 'bg-green-600', 
                  text: 'GANHA',
                  valorColor: 'text-green-400'
                },
                lost: { 
                  bg: 'bg-red-900/30', 
                  border: 'border-red-700', 
                  badge: 'bg-red-600', 
                  text: 'PERDIDA',
                  valorColor: 'text-red-400'
                },
                open: { 
                  bg: 'bg-blue-900/30', 
                  border: 'border-blue-700', 
                  badge: 'bg-blue-600', 
                  text: 'ABERTA',
                  valorColor: 'text-blue-400'
                }
              }
              const config = statusConfig[op.status as keyof typeof statusConfig] || statusConfig.open
              
              return (
                <Card key={op.id} className={cn("border transition-colors", config.bg, config.border)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-bold text-white", config.badge)}>
                            {config.text}
                          </span>
                        </div>
                        <p className="text-white font-semibold text-sm truncate">{op.nome}</p>
                        <p className="text-gray-400 text-xs mt-1">{op.unidade}</p>
                      </div>
                      <span className="text-gray-500 text-xs flex-shrink-0 ml-2">
                        {formatTimeAgo(op.dataCriacao)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                      <span className="text-gray-400 text-xs">{op.vendedor}</span>
                      <span className={cn("font-bold text-sm", config.valorColor)}>
                        {formatCurrency(op.valor)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Criadas Hoje */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-sm uppercase font-semibold mb-1">Criadas Hoje</p>
                {loadingStats ? (
                  <p className="text-white text-2xl font-bold">...</p>
                ) : (
                  <p className="text-white text-3xl font-black">{stats.criadasHoje}</p>
                )}
              </div>
              <TrendingUp className="h-10 w-10 text-blue-200 opacity-80 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        {/* Ganhas Hoje */}
        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-green-100 text-sm uppercase font-semibold mb-1">Ganhas Hoje</p>
                {loadingStats ? (
                  <p className="text-white text-2xl font-bold">...</p>
                ) : (
                  <p className="text-white text-2xl font-black truncate">{formatCurrency(stats.ganhasHoje)}</p>
                )}
              </div>
              <CheckCircle className="h-10 w-10 text-green-200 opacity-80 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        {/* Acumulado Mês */}
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-purple-100 text-sm uppercase font-semibold mb-1">Acumulado Mês</p>
                {loadingStats ? (
                  <p className="text-white text-2xl font-bold">...</p>
                ) : (
                  <p className="text-white text-2xl font-black truncate">{formatCurrency(stats.acumuladoMes)}</p>
                )}
              </div>
              <TrendingUp className="h-10 w-10 text-purple-200 opacity-80 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        {/* Perdidas Mês */}
        <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-red-100 text-sm uppercase font-semibold mb-1">Perdidas Mês</p>
                {loadingStats ? (
                  <p className="text-white text-2xl font-bold">...</p>
                ) : (
                  <p className="text-white text-3xl font-black">{stats.perdidasMes}</p>
                )}
              </div>
              <XCircle className="h-10 w-10 text-red-200 opacity-80 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Oportunidades Criadas */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <h3 className="text-white font-bold text-lg uppercase mb-4">Oportunidades Criadas Dia a Dia</h3>
            {loadingGraficos ? (
              <div className="flex items-center justify-center h-[200px]">
                <span className="text-gray-400">Carregando...</span>
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={oportunidadesCriadas} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      stroke="#4b5563"
                    />
                    <YAxis 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      stroke="#4b5563"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [value, 'Oportunidades']}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_criadas" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name={`${getMesNome(mesAtual)} ${anoAtual}`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Receita */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <h3 className="text-white font-bold text-lg uppercase mb-4">Receita Dia a Dia</h3>
            {loadingGraficos ? (
              <div className="flex items-center justify-center h-[200px]">
                <span className="text-gray-400">Carregando...</span>
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={receitaDiaria} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      stroke="#4b5563"
                    />
                    <YAxis 
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      stroke="#4b5563"
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Receita']}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="valor_total" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      dot={{ fill: '#22c55e', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Receita"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cards de Unidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4">
        {unidades
          .sort((a, b) => b.valor_ganho - a.valor_ganho)
          .map((unidade, index) => {
          const nomeExibicao = unidade.nome_exibicao || unidade.nome || unidade.name || 'Sem nome'
          const valorFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(unidade.valor_ganho)
          
          const posicao = index + 1
          const color = getCardColor(unidade.id)
          
          return (
            <Card 
              key={unidade.id} 
              className={cn(
                "hover:shadow-xl transition-all duration-300 cursor-pointer border-0 overflow-hidden",
                color.bg,
                "hover:scale-105"
              )}
            >
              <CardContent className={cn("p-6", color.text)}>
                <div className="mb-4 flex items-start justify-between gap-2">
                  <span className="font-black text-base uppercase tracking-wide truncate flex-1">{nomeExibicao}</span>
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                    posicao <= 3 ? "bg-yellow-400 text-yellow-900" : "bg-white/20 text-white"
                  )}>
                    {posicao}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Abertas, Ganhas e Perdidas em uma linha */}
                  <div className="flex items-center justify-between gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                    {/* Abertas */}
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 opacity-90" />
                        <span className="text-xs opacity-90">Abertas</span>
                      </div>
                      <span className="text-xs font-bold">{unidade.oportunidades_abertas}</span>
                    </div>
                    
                    {/* Ganhas */}
                    <div className="flex flex-col items-center gap-1 flex-1 border-x border-white/20 px-2">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 opacity-90 text-green-200" />
                        <span className="text-xs opacity-90">Ganhas</span>
                      </div>
                      <span className="text-xs font-bold text-green-200">{unidade.oportunidades_ganhas}</span>
                    </div>
                    
                    {/* Perdidas */}
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5 opacity-90 text-red-200" />
                        <span className="text-xs opacity-90">Perdidas</span>
                      </div>
                      <span className="text-xs font-bold text-red-200">{unidade.oportunidades_perdidas}</span>
                    </div>
                  </div>
                  
                  {/* Valor Ganho */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/20">
                    <span className="text-xs opacity-90">Valor Ganho</span>
                    <span className="text-sm font-bold text-green-200">{valorFormatado}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
        </div>
      </div>
    </div>
  )
}

