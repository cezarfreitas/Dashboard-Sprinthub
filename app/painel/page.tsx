"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, CheckCircle, XCircle, Target, DollarSign, Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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

// Função para obter cor baseada no ID (determinística mas variada) - Memoizada
const getCardColor = (id: number) => {
  return cardColors[id % cardColors.length]
}

// Memoizar cores para evitar recálculos
const cardColorsMemo = cardColors

export default function PainelPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [oportunidadesCriadas, setOportunidadesCriadas] = useState<any[]>([])
  const [receitaDiaria, setReceitaDiaria] = useState<any[]>([])
  const [loadingGraficos, setLoadingGraficos] = useState(true)
  const [stats, setStats] = useState({
    criadasHoje: 0,
    criadasOntem: 0,
    totalCriadasMes: 0,
    crescimentoPercentual: 0,
    ganhasHoje: 0,
    ganhasOntem: 0,
    totalGanhasMes: 0,
    valorTotalGanhasMes: 0,
    crescimentoGanhasPercentual: 0,
    acumuladoMes: 0,
    acumuladoMesAnterior: 0,
    metaMes: 0,
    metaVsMesAnterior: 0,
    perdidasMes: 0,
    taxaConversao: 0,
    ticketMedio: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [oportunidadesRecentes, setOportunidadesRecentes] = useState<any[]>([])
  const [loadingRecentes, setLoadingRecentes] = useState(true)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [filtros, setFiltros] = useState({
    unidadeSelecionada: 'todas',
    periodoInicio: '',
    periodoFim: '',
    statusOportunidade: 'todas'
  })
  
  // Memoizar datas para evitar re-renders constantes
  const { mesAtual, anoAtual, diaAtual } = useMemo(() => {
    const dataAtual = new Date()
    return {
      mesAtual: dataAtual.getMonth() + 1,
      anoAtual: dataAtual.getFullYear(),
      diaAtual: dataAtual.getDate()
    }
  }, [])

  // Memoizar funções para evitar re-renders - ANTES de qualquer return condicional
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  const getMesNome = useCallback((mes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1] || ''
  }, [])

  const formatTimeAgo = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return 'Agora'
    
    let date: Date
    
    // Se for formato MySQL (YYYY-MM-DD HH:MM:SS), converter para Date (local time)
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
      // Formato MySQL: YYYY-MM-DD HH:MM:SS
      // Parsear manualmente para garantir que é tratado como local time
      const [datePart, timePart] = dateString.split(' ')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hours, minutes, seconds] = timePart.split(':').map(Number)
      // Criar Date usando valores locais (month é 0-indexed)
      date = new Date(year, month - 1, day, hours, minutes, seconds)
    } else if (typeof dateString === 'string' && dateString.includes('T')) {
      // Já está em formato ISO
      date = new Date(dateString)
    } else {
      // Tentar parsear normalmente
      date = new Date(dateString)
    }
    
    const now = new Date()
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return 'Agora'
    }
    
    // Calcular diferença em milissegundos
    const diffMs = now.getTime() - date.getTime()
    
    // Se a diferença for negativa (data no futuro) ou muito pequena, retornar "Agora"
    if (diffMs < 0 || diffMs < 1000) return 'Agora'
    
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `há ${diffMins}min`
    if (diffHours < 24) return `há ${diffHours}h`
    if (diffDays < 7) return `há ${diffDays}d`
    
    // Para mais de 7 dias, mostrar data formatada
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks < 4) return `há ${diffWeeks}sem`
    
    const diffMonths = Math.floor(diffDays / 30)
    if (diffMonths < 12) return `há ${diffMonths}mes`
    
    const diffYears = Math.floor(diffDays / 365)
    return `há ${diffYears}ano${diffYears > 1 ? 's' : ''}`
  }, [])

  // Verificar se há filtros ativos
  const filtrosAtivos = useMemo(() => {
    return filtros.unidadeSelecionada !== 'todas' ||
           filtros.periodoInicio !== '' ||
           filtros.periodoFim !== '' ||
           filtros.statusOportunidade !== 'todas'
  }, [filtros])

  // Memoizar fetch functions para evitar re-renders
  const fetchUnidades = useCallback(async () => {
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
  }, [])

  const fetchGraficos = useCallback(async () => {
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
      // Error handling silencioso
    } finally {
      setLoadingGraficos(false)
    }
  }, [mesAtual, anoAtual])

  const fetchStats = useCallback(async () => {
      try {
        setLoadingStats(true)
        
        // Buscar estatísticas
        const hoje = new Date()
        const diaHoje = hoje.getDate()
        const mesHoje = hoje.getMonth() + 1
        const anoHoje = hoje.getFullYear()
        
        // Calcular mês anterior
        const mesAnterior = mesHoje === 1 ? 12 : mesHoje - 1
        const anoAnterior = mesHoje === 1 ? anoHoje - 1 : anoHoje
        
        // Criadas Hoje e Ontem
        const criadasHojeResponse = await fetch(`/api/oportunidades/daily-created?mes=${mesHoje}&ano=${anoHoje}`)
        const criadasHojeData = await criadasHojeResponse.json()
        const criadasHoje = criadasHojeData.success 
          ? (criadasHojeData.dados.find((d: any) => d.dia === diaHoje)?.total_criadas || 0)
          : 0
        const criadasOntem = criadasHojeData.success 
          ? (criadasHojeData.dados.find((d: any) => d.dia === diaHoje - 1)?.total_criadas || 0)
          : 0
        
        // Total criadas no mês atual
        const totalCriadasMes = criadasHojeData.success 
          ? (criadasHojeData.dados.reduce((acc: number, d: any) => acc + (d.total_criadas || 0), 0))
          : 0
        
        // Total criadas no mês anterior
        const criadasMesAnteriorResponse = await fetch(`/api/oportunidades/daily-created?mes=${mesAnterior}&ano=${anoAnterior}`)
        const criadasMesAnteriorData = await criadasMesAnteriorResponse.json()
        const totalCriadasMesAnterior = criadasMesAnteriorData.success 
          ? (criadasMesAnteriorData.dados.reduce((acc: number, d: any) => acc + (d.total_criadas || 0), 0))
          : 0
        
        // Calcular percentual de crescimento
        const crescimentoPercentual = totalCriadasMesAnterior > 0
          ? ((totalCriadasMes - totalCriadasMesAnterior) / totalCriadasMesAnterior) * 100
          : 0
        
        // Ganhas Hoje, Ontem e Acumulado Mês
        const ganhasResponse = await fetch(`/api/oportunidades/daily-gain?mes=${mesHoje}&ano=${anoHoje}`)
        const ganhasData = await ganhasResponse.json()
        const ganhasHoje = ganhasData.success 
          ? (ganhasData.dados.find((d: any) => d.dia === diaHoje)?.valor_total || 0)
          : 0
        const ganhasOntem = ganhasData.success 
          ? (ganhasData.dados.find((d: any) => d.dia === diaHoje - 1)?.valor_total || 0)
          : 0
        const acumuladoMes = ganhasData.success 
          ? (ganhasData.valor_total_mes || 0)
          : 0
        
        // Acumulado do mês anterior
        const acumuladoMesAnteriorResponse = await fetch(`/api/oportunidades/daily-gain?mes=${mesAnterior}&ano=${anoAnterior}`)
        const acumuladoMesAnteriorData = await acumuladoMesAnteriorResponse.json()
        const acumuladoMesAnterior = acumuladoMesAnteriorData.success 
          ? (acumuladoMesAnteriorData.valor_total_mes || 0)
          : 0
        
        // Meta do mês atual (já está no ganhasData)
        const metaMes = ganhasData.success 
          ? (ganhasData.meta_total_mes || 0)
          : 0
        
        // Calcular relação da meta com o mês anterior
        const metaVsMesAnterior = acumuladoMesAnterior > 0
          ? ((metaMes - acumuladoMesAnterior) / acumuladoMesAnterior) * 100
          : 0
        
        // Perdidas Mês
        const perdidasResponse = await fetch(`/api/oportunidades/perdidos?mes=${mesHoje}&ano=${anoHoje}`)
        const perdidasData = await perdidasResponse.json()
        const perdidasMes = perdidasData.success 
          ? (perdidasData.data?.totalOportunidades || 0)
          : 0
        
        // Oportunidades Ganhas no Mês (para taxa de conversão e ticket médio)
        const ganhasMesResponse = await fetch(`/api/oportunidades/ganhos?mes=${mesHoje}&ano=${anoHoje}`)
        const ganhasMesData = await ganhasMesResponse.json()
        const totalGanhasMes = ganhasMesData.success 
          ? (ganhasMesData.data?.totalOportunidades || 0)
          : 0
        const valorTotalGanhasMes = ganhasMesData.success 
          ? (ganhasMesData.data?.totalValor || 0)
          : 0
        
        // Total ganhas no mês anterior (para crescimento)
        const ganhasMesAnteriorResponse = await fetch(`/api/oportunidades/ganhos?mes=${mesAnterior}&ano=${anoAnterior}`)
        const ganhasMesAnteriorData = await ganhasMesAnteriorResponse.json()
        const totalGanhasMesAnterior = ganhasMesAnteriorData.success 
          ? (ganhasMesAnteriorData.data?.totalOportunidades || 0)
          : 0
        const valorTotalGanhasMesAnterior = ganhasMesAnteriorData.success 
          ? (ganhasMesAnteriorData.data?.totalValor || 0)
          : 0
        
        // Calcular percentual de crescimento de ganhas (por quantidade)
        const crescimentoGanhasPercentual = totalGanhasMesAnterior > 0
          ? ((totalGanhasMes - totalGanhasMesAnterior) / totalGanhasMesAnterior) * 100
          : 0
        
        // Calcular Taxa de Conversão
        const taxaConversao = totalCriadasMes > 0
          ? (totalGanhasMes / totalCriadasMes) * 100
          : 0
        
        // Calcular Ticket Médio
        const ticketMedio = totalGanhasMes > 0
          ? valorTotalGanhasMes / totalGanhasMes
          : 0
        
        setStats({
          criadasHoje,
          criadasOntem,
          totalCriadasMes,
          crescimentoPercentual,
          ganhasHoje,
          ganhasOntem,
          totalGanhasMes,
          valorTotalGanhasMes,
          crescimentoGanhasPercentual,
          acumuladoMes,
          acumuladoMesAnterior,
          metaMes,
          metaVsMesAnterior,
          perdidasMes,
          taxaConversao,
          ticketMedio
        })
      } catch (err) {
        // Error handling silencioso
    } finally {
      setLoadingStats(false)
    }
  }, [mesAtual, anoAtual, diaAtual])

  // Função para buscar notificações de oportunidades
  const fetchNotificacoes = useCallback(async () => {
    try {
      const response = await fetch('/api/oportunidades/notificacoes?limit=20')
      const data = await response.json()
      
      if (data.success && data.historico && data.historico.length > 0) {
        setOportunidadesRecentes(data.historico)
      } else {
        setOportunidadesRecentes([])
      }
    } catch (err) {
      // Error handling silencioso
      setOportunidadesRecentes([])
    } finally {
      setLoadingRecentes(false)
    }
  }, [])

  useEffect(() => {
    fetchUnidades()
    fetchGraficos()
    fetchStats()
    fetchNotificacoes()
  }, [fetchUnidades, fetchGraficos, fetchStats, fetchNotificacoes])

  // Atualizar notificações a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotificacoes()
    }, 10000) // 10 segundos

    return () => {
      clearInterval(interval)
    }
  }, [fetchNotificacoes])

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

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar de Oportunidades Recentes */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto max-h-screen sticky top-0 scrollbar-hide">
        <div className="p-3 space-y-2">
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
              // Função para converter hex para rgba com opacidade
              const hexToRgba = (hex: string, alpha: number) => {
                const r = parseInt(hex.slice(1, 3), 16)
                const g = parseInt(hex.slice(3, 5), 16)
                const b = parseInt(hex.slice(5, 7), 16)
                return `rgba(${r}, ${g}, ${b}, ${alpha})`
              }

              // Verificar se há cor customizada (aceita com ou sem #)
              let corHex = op.cor
              if (corHex) {
                // Remover espaços e garantir formato correto
                corHex = String(corHex).trim()
                if (!corHex.startsWith('#')) {
                  corHex = `#${corHex}`
                }
                // Validar formato hex (3 ou 6 dígitos após #)
                // Expandir formato curto (#fff -> #ffffff)
                if (/^#[0-9A-F]{3}$/i.test(corHex)) {
                  corHex = `#${corHex[1]}${corHex[1]}${corHex[2]}${corHex[2]}${corHex[3]}${corHex[3]}`
                } else if (!/^#[0-9A-F]{6}$/i.test(corHex)) {
                  // Se não for válido, descartar
                  corHex = null
                } else {
                  // Garantir maiúsculas para consistência
                  corHex = corHex.toUpperCase()
                }
              }
              const temCorCustomizada = !!corHex
              
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
              
              // Determinar texto do badge
              let badgeText = 'ABERTA'
              if (op.status) {
                const statusLower = String(op.status).toLowerCase()
                if (statusConfig[op.status as keyof typeof statusConfig]) {
                  badgeText = statusConfig[op.status as keyof typeof statusConfig].text
                } else {
                  badgeText = String(op.status).toUpperCase()
                }
              }
              
              // Aplicar cor customizada se disponível (sempre tem prioridade)
              const cardStyle: React.CSSProperties = temCorCustomizada ? {
                backgroundColor: hexToRgba(corHex!, 0.15),
                borderColor: corHex!,
                borderWidth: '1px',
                borderStyle: 'solid'
              } : {}
              
              const badgeStyle: React.CSSProperties = temCorCustomizada ? {
                backgroundColor: corHex!,
                color: '#ffffff'
              } : {}
              
              const valorStyle: React.CSSProperties = temCorCustomizada ? {
                color: corHex!
              } : {}
              
              // Classes CSS (só aplicar se não houver cor customizada)
              // Quando há cor customizada, usar apenas classes básicas sem background/border
              const cardClasses = temCorCustomizada 
                ? "rounded-lg border shadow-sm transition-colors bg-transparent" 
                : cn("rounded-lg border shadow-sm transition-colors", statusConfig[op.status as keyof typeof statusConfig]?.bg || 'bg-blue-900/30', statusConfig[op.status as keyof typeof statusConfig]?.border || 'border-blue-700')
              
              const badgeClasses = temCorCustomizada
                ? "px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                : cn("px-1.5 py-0.5 rounded text-[10px] font-bold text-white", statusConfig[op.status as keyof typeof statusConfig]?.badge || 'bg-blue-600')
              
              const valorClasses = temCorCustomizada
                ? "font-bold text-xs"
                : cn("font-bold text-xs", statusConfig[op.status as keyof typeof statusConfig]?.valorColor || 'text-blue-400')
              
              // Usar div quando há cor customizada para evitar conflitos com classes do Card
              if (temCorCustomizada) {
                return (
                  <div
                    key={op.id}
                    className={cardClasses}
                    style={cardStyle}
                  >
                    <div className="p-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span 
                            className={badgeClasses}
                            style={badgeStyle}
                          >
                            {badgeText}
                          </span>
                        </div>
                        <p className="text-white font-semibold text-xs truncate">{op.nome}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5 truncate" title={op.unidade}>
                          {op.unidade}
                        </p>
                      </div>
                      <span className="text-gray-500 text-[10px] flex-shrink-0 ml-1.5">
                        {formatTimeAgo(op.consultadoEm || op.dataCriacao)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-700">
                      <span className="text-gray-400 text-[10px] truncate" title={op.vendedor}>
                        {op.vendedor}
                      </span>
                      <span 
                        className={valorClasses}
                        style={valorStyle}
                      >
                        {formatCurrency(op.valor)}
                      </span>
                    </div>
                  </div>
                </div>
                )
              }
              
              // Usar Card quando não há cor customizada
              return (
                <Card
                  key={op.id}
                  className={cardClasses}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={badgeClasses}>
                            {badgeText}
                          </span>
                        </div>
                        <p className="text-white font-semibold text-xs truncate">{op.nome}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5 truncate" title={op.unidade}>
                          {op.unidade}
                        </p>
                      </div>
                      <span className="text-gray-500 text-[10px] flex-shrink-0 ml-1.5">
                        {formatTimeAgo(op.consultadoEm || op.dataCriacao)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-700">
                      <span className="text-gray-400 text-[10px] truncate" title={op.vendedor}>
                        {op.vendedor}
                      </span>
                      <span className={valorClasses}>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {/* Criadas Hoje */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
          <CardContent className="p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-blue-100 text-xs uppercase font-semibold mb-0.5">Criadas Hoje</p>
                  {loadingStats ? (
                    <p className="text-white text-xl font-bold">...</p>
                  ) : (
                    <p className="text-white text-2xl font-black">{stats.criadasHoje}</p>
                  )}
                </div>
                <TrendingUp className="h-7 w-7 text-blue-200 opacity-80 flex-shrink-0 ml-2" />
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] pt-1 border-t border-blue-500/30">
                <div className="flex items-center gap-1">
                  <span className="text-blue-100/80">Ontem:</span>
                  <span className="text-white font-semibold">{loadingStats ? '...' : stats.criadasOntem}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-100/80">Total:</span>
                  <span className="text-white font-semibold">{loadingStats ? '...' : stats.totalCriadasMes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-100/80">Cresc:</span>
                  <span className={`font-semibold ${stats.crescimentoPercentual >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {loadingStats ? '...' : `${stats.crescimentoPercentual >= 0 ? '+' : ''}${Math.round(stats.crescimentoPercentual)}%`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ganhas Hoje */}
        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
          <CardContent className="p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-green-100 text-xs uppercase font-semibold mb-0.5">Ganhas Hoje</p>
                  {loadingStats ? (
                    <p className="text-white text-xl font-bold">...</p>
                  ) : (
                    <p className="text-white text-lg font-black truncate">{formatCurrency(stats.ganhasHoje)}</p>
                  )}
                </div>
                <CheckCircle className="h-7 w-7 text-green-200 opacity-80 flex-shrink-0 ml-2" />
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-green-500/30">
                <div className="flex items-center gap-1">
                  <span className="text-green-100/80">Ontem:</span>
                  <span className="text-white font-semibold truncate">{loadingStats ? '...' : formatCurrency(stats.ganhasOntem)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-100/80">Qtd Mês:</span>
                  <span className="text-white font-semibold">{loadingStats ? '...' : stats.totalGanhasMes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-100/80">Mês:</span>
                  <span className="text-white font-semibold truncate">{loadingStats ? '...' : formatCurrency(stats.valorTotalGanhasMes)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-100/80">Cresc:</span>
                  <span className={`font-semibold ${stats.crescimentoGanhasPercentual >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {loadingStats ? '...' : `${stats.crescimentoGanhasPercentual >= 0 ? '+' : ''}${Math.round(stats.crescimentoGanhasPercentual)}%`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acumulado Mês */}
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
          <CardContent className="p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-purple-100 text-xs uppercase font-semibold mb-0.5">Acumulado Mês</p>
                  {loadingStats ? (
                    <p className="text-white text-xl font-bold">...</p>
                  ) : (
                    <p className="text-white text-lg font-black truncate">{formatCurrency(stats.acumuladoMes)}</p>
                  )}
                </div>
                <TrendingUp className="h-7 w-7 text-purple-200 opacity-80 flex-shrink-0 ml-2" />
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-purple-500/30">
                <div className="flex items-center gap-1">
                  <span className="text-purple-100/80">Mês Ant:</span>
                  <span className="text-white font-semibold truncate">{loadingStats ? '...' : formatCurrency(stats.acumuladoMesAnterior)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-100/80">Meta:</span>
                  <span className="text-white font-semibold truncate">{loadingStats ? '...' : formatCurrency(stats.metaMes)}</span>
                </div>
                <div className="flex items-center gap-1 col-span-2">
                  <span className="text-purple-100/80">Meta vs Ant:</span>
                  <span className={`font-semibold ${stats.metaVsMesAnterior >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {loadingStats ? '...' : `${stats.metaVsMesAnterior >= 0 ? '+' : ''}${Math.round(stats.metaVsMesAnterior)}%`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Perdidas Mês */}
        <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-red-100 text-xs uppercase font-semibold mb-0.5">Perdidas Mês</p>
                {loadingStats ? (
                  <p className="text-white text-xl font-bold">...</p>
                ) : (
                  <p className="text-white text-2xl font-black">{stats.perdidasMes}</p>
                )}
              </div>
              <XCircle className="h-7 w-7 text-red-200 opacity-80 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conversão */}
        <Card className="bg-gradient-to-br from-amber-600 to-amber-700 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-amber-100 text-xs uppercase font-semibold mb-0.5">Taxa Conversão</p>
                {loadingStats ? (
                  <p className="text-white text-xl font-bold">...</p>
                ) : (
                  <p className="text-white text-2xl font-black">{Math.round(stats.taxaConversao)}%</p>
                )}
              </div>
              <Target className="h-7 w-7 text-amber-200 opacity-80 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="bg-gradient-to-br from-teal-600 to-teal-700 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-teal-100 text-xs uppercase font-semibold mb-0.5">Ticket Médio</p>
                {loadingStats ? (
                  <p className="text-white text-xl font-bold">...</p>
                ) : (
                  <p className="text-white text-lg font-black truncate">{formatCurrency(stats.ticketMedio)}</p>
                )}
              </div>
              <DollarSign className="h-7 w-7 text-teal-200 opacity-80 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Gráfico de Oportunidades Criadas */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3">
            <h3 className="text-white font-bold text-sm uppercase mb-2">Oportunidades Criadas Dia a Dia</h3>
            {loadingGraficos ? (
              <div className="flex items-center justify-center h-[150px]">
                <span className="text-gray-400 text-sm">Carregando...</span>
              </div>
            ) : (
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={oportunidadesCriadas} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      stroke="#4b5563"
                    />
                    <YAxis 
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      stroke="#4b5563"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [value, 'Oportunidades']}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_criadas" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      activeDot={{ r: 5 }}
                      name={`${getMesNome(mesAtual)} ${anoAtual}`}
                      isAnimationActive={false}
                    >
                      <LabelList 
                        dataKey="total_criadas" 
                        position="top" 
                        style={{ fill: '#9ca3af', fontSize: '10px' }}
                        formatter={(value: any) => value === 0 ? '' : String(value)}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Receita */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3">
            <h3 className="text-white font-bold text-sm uppercase mb-2">Receita Dia a Dia</h3>
            {loadingGraficos ? (
              <div className="flex items-center justify-center h-[150px]">
                <span className="text-gray-400 text-sm">Carregando...</span>
              </div>
            ) : (
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={receitaDiaria} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      stroke="#4b5563"
                    />
                    <YAxis 
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      stroke="#4b5563"
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Receita']}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="valor_total" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Receita"
                      isAnimationActive={false}
                    >
                      <LabelList 
                        dataKey="valor_total" 
                        position="top" 
                        style={{ fill: '#9ca3af', fontSize: '10px' }}
                        formatter={(value: any) => value === 0 ? '' : `R$ ${(Number(value) / 1000).toFixed(0)}k`}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cards de Unidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 4k:grid-cols-8 gap-4">
        {unidades
          .filter(unidade => {
            // Aplicar filtro de unidade
            if (filtros.unidadeSelecionada !== 'todas' && unidade.id !== parseInt(filtros.unidadeSelecionada)) {
              return false
            }
            return true
          })
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

      {/* Botão Flutuante de Filtros */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogTrigger asChild>
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center justify-center group hover:scale-110 relative"
              size="icon"
            >
              <Filter className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
              {filtrosAtivos && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                  !
                </span>
              )}
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-500" />
              Filtros do Painel
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure os filtros para personalizar a visualização dos dados
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Filtro de Unidade */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Unidade</label>
              <select
                value={filtros.unidadeSelecionada}
                onChange={(e) => setFiltros({ ...filtros, unidadeSelecionada: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas as Unidades</option>
                {unidades.map(unidade => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome_exibicao || unidade.nome || unidade.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Período */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Período</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Data Início</label>
                  <input
                    type="date"
                    value={filtros.periodoInicio}
                    onChange={(e) => setFiltros({ ...filtros, periodoInicio: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Data Fim</label>
                  <input
                    type="date"
                    value={filtros.periodoFim}
                    onChange={(e) => setFiltros({ ...filtros, periodoFim: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Filtro de Status */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Status das Oportunidades</label>
              <select
                value={filtros.statusOportunidade}
                onChange={(e) => setFiltros({ ...filtros, statusOportunidade: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas</option>
                <option value="abertas">Somente Abertas</option>
                <option value="ganhas">Somente Ganhas</option>
                <option value="perdidas">Somente Perdidas</option>
              </select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <Button
              variant="outline"
              onClick={() => {
                setFiltros({
                  unidadeSelecionada: 'todas',
                  periodoInicio: '',
                  periodoFim: '',
                  statusOportunidade: 'todas'
                })
              }}
              className="flex-1 bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
            <Button
              onClick={() => setFilterDialogOpen(false)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

