"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, CheckCircle, XCircle, Target, DollarSign, Filter, X, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PainelUnidadesGrid } from "@/components/painel/PainelUnidadesGrid"

export default function PainelPage() {
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
    abertasTotal: 0,
    abertasCriadasNoMes: 0,
    abertasCriadasAntes: 0,
    valorTotalAbertas: 0,
    perdidasMes: 0,
    perdidasCriadasNoMes: 0,
    perdidasCriadasAntes: 0,
    valorTotalPerdido: 0,
    taxaConversao: 0,
    taxaConversaoAnterior: 0,
    diferencaTaxaConversao: 0,
    ticketMedio: 0,
    ticketMedioAnterior: 0,
    diferencaTicketMedio: 0,
    menorTicket: 0,
    maiorTicket: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [oportunidadesRecentes, setOportunidadesRecentes] = useState<any[]>([])
  const [loadingRecentes, setLoadingRecentes] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreNotificacoes, setHasMoreNotificacoes] = useState(true)
  const [offsetNotificacoes, setOffsetNotificacoes] = useState(0)
  const [novasNotificacoes, setNovasNotificacoes] = useState<Set<number>>(new Set())
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const { playAudio, playBellSound } = useAudioPlayer()
  
  // Calcular datas iniciais para "Este Mês"
  const periodoInicial = useMemo(() => {
    const hoje = new Date()
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
  
  const [filtros, setFiltros] = useState({
    unidadeSelecionada: 'todas',
    periodoTipo: 'este-mes',
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos'
  })
  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string }>>([])
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])
  
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

  // Função para calcular datas baseado no tipo de período
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
    if (filtros.periodoTipo !== 'personalizado') {
      const { inicio, fim } = calcularPeriodo(filtros.periodoTipo)
      setFiltros(prev => {
        // Só atualiza se as datas forem diferentes para evitar loops
        if (prev.periodoInicio !== inicio || prev.periodoFim !== fim) {
          return {
            ...prev,
            periodoInicio: inicio,
            periodoFim: fim
          }
        }
        return prev
      })
    }
  }, [filtros.periodoTipo, calcularPeriodo])

  // Verificar se há filtros ativos
  const filtrosAtivos = useMemo(() => {
    return filtros.unidadeSelecionada !== 'todas' ||
           filtros.periodoTipo !== 'este-mes' ||
           filtros.periodoInicio !== '' ||
           filtros.periodoFim !== '' ||
           filtros.funilSelecionado !== 'todos' ||
           filtros.grupoSelecionado !== 'todos'
  }, [filtros])

  // Memoizar fetch functions para evitar re-renders
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
        
        // Abertas
        const abertasResponse = await fetch(`/api/oportunidades/abertos?mes=${mesHoje}&ano=${anoHoje}`)
        const abertasData = await abertasResponse.json()
        const abertasTotal = abertasData.success 
          ? (abertasData.data?.totalOportunidades || 0)
          : 0
        const abertasCriadasNoMes = abertasData.success 
          ? (abertasData.data?.abertasMesAtual || 0)
          : 0
        const abertasCriadasAntes = abertasData.success 
          ? (abertasData.data?.abertasMesesAnteriores || 0)
          : 0
        const valorTotalAbertas = abertasData.success 
          ? (abertasData.data?.valorTotalAbertas || 0)
          : 0
        
        // Perdidas Mês
        const perdidasResponse = await fetch(`/api/oportunidades/perdidos?mes=${mesHoje}&ano=${anoHoje}`)
        const perdidasData = await perdidasResponse.json()
        const perdidasMes = perdidasData.success 
          ? (perdidasData.data?.totalOportunidades || 0)
          : 0
        const perdidasCriadasNoMes = perdidasData.success 
          ? (perdidasData.data?.perdidasCriadasMes || 0)
          : 0
        const perdidasCriadasAntes = perdidasData.success 
          ? (perdidasData.data?.perdidasCriadasAnterior || 0)
          : 0
        const valorTotalPerdido = perdidasData.success 
          ? (perdidasData.data?.valorTotalPerdido || 0)
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
        
        // Calcular Taxa de Conversão do Mês Anterior
        const taxaConversaoAnterior = totalCriadasMesAnterior > 0
          ? (totalGanhasMesAnterior / totalCriadasMesAnterior) * 100
          : 0
        
        // Calcular Diferença da Taxa de Conversão
        const diferencaTaxaConversao = taxaConversaoAnterior > 0
          ? taxaConversao - taxaConversaoAnterior
          : 0
        
        // Calcular Ticket Médio
        const ticketMedio = totalGanhasMes > 0
          ? valorTotalGanhasMes / totalGanhasMes
          : 0
        
        // Calcular Ticket Médio do Mês Anterior
        const ticketMedioAnterior = totalGanhasMesAnterior > 0
          ? valorTotalGanhasMesAnterior / totalGanhasMesAnterior
          : 0
        
        // Calcular Diferença do Ticket Médio
        const diferencaTicketMedio = ticketMedioAnterior > 0
          ? ((ticketMedio - ticketMedioAnterior) / ticketMedioAnterior) * 100
          : 0
        
        // Buscar Menor e Maior Ticket do Mês Atual
        const ticketRangeResponse = await fetch(`/api/oportunidades/ganhos?mes=${mesHoje}&ano=${anoHoje}`)
        const ticketRangeData = await ticketRangeResponse.json()
        const menorTicket = ticketRangeData.success 
          ? (ticketRangeData.data?.menorValor || 0)
          : 0
        const maiorTicket = ticketRangeData.success 
          ? (ticketRangeData.data?.maiorValor || 0)
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
          abertasTotal,
          abertasCriadasNoMes,
          abertasCriadasAntes,
          valorTotalAbertas,
          perdidasMes,
          perdidasCriadasNoMes,
          perdidasCriadasAntes,
          valorTotalPerdido,
          taxaConversao,
          taxaConversaoAnterior,
          diferencaTaxaConversao,
          ticketMedio,
          ticketMedioAnterior,
          diferencaTicketMedio,
          menorTicket,
          maiorTicket
        })
      } catch (err) {
        // Error handling silencioso
    } finally {
      setLoadingStats(false)
    }
  }, [mesAtual, anoAtual, diaAtual])

  // Inicializar AudioContext e carregar som

  // Função para buscar notificações de oportunidades (inicial)
  const fetchNotificacoes = useCallback(async (isNewNotification = false) => {
    try {
      if (!isNewNotification) {
        setLoadingRecentes(true)
      }
      const response = await fetch('/api/oportunidades/notificacoes?limit=20&offset=0')
      const data = await response.json()
      
      if (data.success && data.historico && data.historico.length > 0) {
        // Garantir que não há duplicatas usando ID único
        const uniqueHistorico = Array.from(
          new Map(data.historico.map((item: any) => [item.id, item])).values()
        )
        
        // Se for uma nova notificação, marcar como nova para animar
        if (isNewNotification && uniqueHistorico.length > 0) {
          const primeiraNotificacao = uniqueHistorico[0] as any
          if (primeiraNotificacao?.id) {
            // Verificar se é uma notificação de ganho para tocar som
            const statusLower = String(primeiraNotificacao.status || '').toLowerCase()
            const isGanho = statusLower === 'gain' || 
                           statusLower === 'ganha' || 
                           statusLower === 'ganho' ||
                           statusLower === 'won' ||
                           String(primeiraNotificacao.status || '').toUpperCase().includes('GANH')
            
            if (isGanho) {
              // Tocar som bell.wav
              playAudio('/audio/bell.wav', 0.7)
            }
            
            setNovasNotificacoes(prev => {
              const novo = new Set(prev)
              novo.add(primeiraNotificacao.id)
              return novo
            })
            
            // Remover a flag após a animação (500ms)
            setTimeout(() => {
              setNovasNotificacoes(prev => {
                const novo = new Set(prev)
                novo.delete(primeiraNotificacao.id)
                return novo
              })
            }, 500)
          }
        }
        
        setOportunidadesRecentes(uniqueHistorico)
        setHasMoreNotificacoes(data.hasMore)
        setOffsetNotificacoes(15)
      } else {
        setOportunidadesRecentes([])
        setHasMoreNotificacoes(false)
      }
    } catch (err) {
      setOportunidadesRecentes([])
      setHasMoreNotificacoes(false)
    } finally {
      if (!isNewNotification) {
        setLoadingRecentes(false)
      }
    }
  }, [playAudio])

  // Função para carregar mais notificações
  const loadMoreNotificacoes = useCallback(async () => {
    if (loadingMore || !hasMoreNotificacoes) return

    try {
      setLoadingMore(true)
      const response = await fetch(`/api/oportunidades/notificacoes?limit=15&offset=${offsetNotificacoes}`)
      const data = await response.json()
      
      if (data.success && data.historico && data.historico.length > 0) {
        setOportunidadesRecentes(prev => {
          // Combinar e remover duplicatas
          const combined = [...prev, ...data.historico]
          const uniqueHistorico = Array.from(
            new Map(combined.map((item: any) => [item.id, item])).values()
          )
          return uniqueHistorico
        })
        setHasMoreNotificacoes(data.hasMore)
        setOffsetNotificacoes(prev => prev + 15)
      } else {
        setHasMoreNotificacoes(false)
      }
    } catch (err) {
      setHasMoreNotificacoes(false)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMoreNotificacoes, offsetNotificacoes])

  const fetchFunis = useCallback(async () => {
    try {
      const response = await fetch('/api/funis')
      const data = await response.json()
      if (data.success && data.funis) {
        setFunis(data.funis)
      }
    } catch (err) {
      // Error handling silencioso
      setFunis([])
    }
  }, [])

  const fetchGrupos = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/grupos')
      const data = await response.json()
      if (data.success && data.grupos) {
        setGrupos(data.grupos)
      }
    } catch (err) {
      // Error handling silencioso
      setGrupos([])
    }
  }, [])

  const fetchUnidadesList = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/list')
      const data = await response.json()
      if (data.success && data.unidades) {
        setUnidadesList(data.unidades)
      }
    } catch (err) {
      // Error handling silencioso
      setUnidadesList([])
    }
  }, [])

  useEffect(() => {
    fetchGraficos()
    fetchStats()
    fetchNotificacoes()
    fetchFunis()
    fetchGrupos()
    fetchUnidadesList()
  }, [fetchGraficos, fetchStats, fetchNotificacoes, fetchFunis, fetchGrupos, fetchUnidadesList])

  // Conectar ao SSE para atualizações em tempo real
  useEffect(() => {
    const eventSource = new EventSource('/api/sse')
    
    eventSource.onopen = () => {
      // Conexão estabelecida
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Se receber evento de nova notificação, atualizar a lista com flag de nova
        if (data.type === 'nova_notificacao') {
          fetchNotificacoes(true)
        }
      } catch (err) {
        // Ignorar erros de parsing
      }
    }

    eventSource.onerror = () => {
      // Erro na conexão SSE - continuar tentando reconectar
    }

    return () => {
      eventSource.close()
    }
  }, [fetchNotificacoes])

  // Fallback: Atualizar notificações a cada 60 segundos (caso SSE falhe)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotificacoes()
    }, 60000) // 60 segundos (fallback)

    return () => {
      clearInterval(interval)
    }
  }, [fetchNotificacoes])

  // IntersectionObserver para infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreNotificacoes && !loadingMore && !loadingRecentes) {
          loadMoreNotificacoes()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMoreNotificacoes, loadingMore, loadingRecentes, loadMoreNotificacoes])

  return (
    <div className="min-h-screen bg-black flex relative">
      {/* Botão de Colapsar - FORA da sidebar para sempre ficar visível */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={cn(
          "fixed bottom-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-r-full p-1.5 shadow-lg transition-all duration-300 border border-blue-500",
          sidebarCollapsed ? "left-0" : "left-64"
        )}
        title={sidebarCollapsed ? "Mostrar notificações" : "Esconder notificações"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Sidebar de Oportunidades Recentes */}
      <div 
        className={cn(
          "bg-gray-900 border-r border-gray-800 overflow-y-auto max-h-screen sticky top-0 scrollbar-hide transition-all duration-300",
          sidebarCollapsed ? "w-0 border-r-0" : "w-64"
        )}
      >
        <div className={cn("p-3 notifications-container", sidebarCollapsed && "hidden")}>
          {loadingRecentes ? (
            <div className="text-center py-8">
              <span className="text-gray-400 text-sm">Carregando...</span>
            </div>
          ) : oportunidadesRecentes.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-gray-400 text-sm">Nenhuma oportunidade recente</span>
            </div>
          ) : (
            // Limitar a 20 notificações visíveis para performance
            oportunidadesRecentes.slice(0, 20).map((op, index) => {
              const isNova = novasNotificacoes.has(op.id)
              const animationClass = isNova ? 'animate-notification-pop' : 'notification-card'
              
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
              // Sempre usar opacidade de 0.2 para todas as cores
              const cardStyle: React.CSSProperties = temCorCustomizada ? {
                backgroundColor: hexToRgba(corHex!, 0.2),
                borderColor: corHex!,
                borderWidth: '1px',
                borderStyle: 'solid'
              } : {}
              
              // Badge sempre com cor sólida e texto preto
              const badgeStyle: React.CSSProperties = temCorCustomizada ? {
                backgroundColor: corHex!,
                color: '#000000'
              } : {}
              
              // Todos os textos sempre brancos
              const valorStyle: React.CSSProperties = temCorCustomizada ? {
                color: '#FFFFFF',
                fontWeight: 'bold'
              } : {}
              
              const textColorStyle = temCorCustomizada ? {
                color: '#FFFFFF'
              } : {}
              
              const textSecondaryStyle = temCorCustomizada ? {
                color: 'rgba(255, 255, 255, 0.9)'
              } : {}
                
              const textTertiaryStyle = temCorCustomizada ? {
                color: 'rgba(255, 255, 255, 0.7)'
              } : {}
                
              const borderStyle = temCorCustomizada ? {
                borderColor: 'rgba(255, 255, 255, 0.2)'
              } : {}
              
              // Classes CSS (só aplicar se não houver cor customizada)
              const cardClasses = temCorCustomizada 
                ? "rounded-lg border shadow-sm transition-colors bg-transparent" 
                : cn("rounded-lg border shadow-sm transition-colors", statusConfig[op.status as keyof typeof statusConfig]?.bg || 'bg-blue-900/30', statusConfig[op.status as keyof typeof statusConfig]?.border || 'border-blue-700')
              
              const badgeClasses = cn("px-1.5 py-0.5 rounded text-[10px] font-bold text-white", statusConfig[op.status as keyof typeof statusConfig]?.badge || 'bg-blue-600')
              
              const valorClasses = cn("font-bold text-xs", statusConfig[op.status as keyof typeof statusConfig]?.valorColor || 'text-blue-400')
              
              // Usar div quando há cor customizada para evitar conflitos com classes do Card
              if (temCorCustomizada) {
                return (
                  <div
                    key={op.id}
                    className={cn(cardClasses, animationClass)}
                    style={cardStyle}
                  >
                    <div className="p-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span 
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold !text-black"
                            style={badgeStyle}
                          >
                            {badgeText}
                          </span>
                        </div>
                        <p className="font-semibold text-xs truncate" style={textColorStyle}>{op.nome}</p>
                        <p className="text-[10px] mt-0.5 truncate" style={textSecondaryStyle} title={op.unidade}>
                          {op.unidade}
                        </p>
                      </div>
                      <span className="text-[10px] flex-shrink-0 ml-1.5" style={textTertiaryStyle}>
                        {formatTimeAgo(op.consultadoEm || op.dataCriacao)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t" style={borderStyle}>
                      <span className="text-[10px] truncate" style={textSecondaryStyle} title={op.vendedor}>
                        {op.vendedor}
                      </span>
                      <span 
                        className="font-bold text-xs"
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
                  className={cn(cardClasses, animationClass)}
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
          
          {/* Indicador de carregamento progressivo */}
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-400 text-xs">Carregando mais...</span>
            </div>
          )}
          
          {/* Elemento observador para infinite scroll */}
          {hasMoreNotificacoes && !loadingRecentes && (
            <div ref={observerTarget} className="h-4" />
          )}
          
          {/* Indicador de fim da lista */}
          {!hasMoreNotificacoes && oportunidadesRecentes.length > 0 && !loadingRecentes && (
            <div className="text-center py-4">
              <span className="text-gray-500 text-xs">Fim das notificações</span>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 mb-4">
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

        {/* Abertos */}
        <Card className="bg-gradient-to-br from-cyan-600 to-cyan-700 border-0">
          <CardContent className="p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-cyan-100 text-xs uppercase font-semibold mb-0.5">Abertos</p>
                  {loadingStats ? (
                    <p className="text-white text-xl font-bold">...</p>
                  ) : (
                    <p className="text-white text-2xl font-black">{stats.abertasTotal}</p>
                  )}
                  {!loadingStats && (
                    <p className="text-cyan-100 text-sm font-semibold mt-0.5">
                      {formatCurrency(stats.valorTotalAbertas)}
                    </p>
                  )}
                </div>
                <FolderOpen className="h-7 w-7 text-cyan-200 opacity-80 flex-shrink-0 ml-2" />
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] pt-1 border-t border-cyan-500/30">
                <div className="flex items-center gap-1">
                  <span className="text-cyan-100/80">Criados no mês:</span>
                  <span className="text-white font-semibold">{loadingStats ? '...' : stats.abertasCriadasNoMes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-cyan-100/80">Criados antes:</span>
                  <span className="text-white font-semibold">{loadingStats ? '...' : stats.abertasCriadasAntes}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Perdidas Mês */}
        <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0">
          <CardContent className="p-4">
            <div className="space-y-1.5">
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
              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-red-500/30">
                <div className="flex items-center gap-1">
                  <span className="text-red-100/80">Criados no mês:</span>
                  <span className="text-white font-semibold">{loadingStats ? '...' : stats.perdidasCriadasNoMes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-100/80">Criados antes:</span>
                  <span className="text-white font-semibold">{loadingStats ? '...' : stats.perdidasCriadasAntes}</span>
                </div>
                <div className="flex items-center gap-1 col-span-2">
                  <span className="text-red-100/80">Valor Total:</span>
                  <span className="text-white font-semibold truncate">{loadingStats ? '...' : formatCurrency(stats.valorTotalPerdido)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conversão */}
        <Card className="bg-gradient-to-br from-amber-600 to-amber-700 border-0">
          <CardContent className="p-4">
            <div className="space-y-1.5">
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
              <div className="flex items-center justify-between gap-2 text-[10px] pt-1 border-t border-amber-500/30">
                <div className="flex items-center gap-1">
                  <span className="text-amber-100/80">Período ant:</span>
                  <span className="text-white font-semibold">{loadingStats ? '...' : `${Math.round(stats.taxaConversaoAnterior)}%`}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-amber-100/80">Diferença:</span>
                  <span className={`font-semibold ${stats.diferencaTaxaConversao >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {loadingStats ? '...' : `${stats.diferencaTaxaConversao >= 0 ? '+' : ''}${stats.diferencaTaxaConversao.toFixed(1)}pp`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="bg-gradient-to-br from-teal-600 to-teal-700 border-0">
          <CardContent className="p-4">
            <div className="space-y-1.5">
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
              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-teal-500/30">
                <div className="flex items-center gap-1">
                  <span className="text-teal-100/80">Período ant:</span>
                  <span className="text-white font-semibold truncate">{loadingStats ? '...' : formatCurrency(stats.ticketMedioAnterior)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-teal-100/80">Dif:</span>
                  <span className={`font-semibold ${stats.diferencaTicketMedio >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {loadingStats ? '...' : `${stats.diferencaTicketMedio >= 0 ? '+' : ''}${Math.round(stats.diferencaTicketMedio)}%`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-teal-100/80">Menor:</span>
                  <span className="text-white font-semibold truncate">{loadingStats ? '...' : formatCurrency(stats.menorTicket)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-teal-100/80">Maior:</span>
                  <span className="text-white font-semibold truncate">{loadingStats ? '...' : formatCurrency(stats.maiorTicket)}</span>
                </div>
              </div>
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
      <PainelUnidadesGrid 
        filtros={filtros}
        mesAtual={mesAtual}
        anoAtual={anoAtual}
      />
        </div>
      </div>

      {/* Botão Flutuante de Filtros */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogTrigger asChild>
          <div className="fixed bottom-12 right-6 z-50">
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
                {unidadesList.map(unidade => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Período */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Período</label>
              <select
                value={filtros.periodoTipo}
                onChange={(e) => setFiltros({ ...filtros, periodoTipo: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="este-mes">Este Mês</option>
                <option value="mes-passado">Mês Passado</option>
                <option value="esta-semana">Esta Semana</option>
                <option value="semana-passada">Semana Passada</option>
                <option value="este-ano">Este Ano</option>
                <option value="ano-anterior">Ano Anterior</option>
                <option value="personalizado">Personalizado</option>
              </select>
              
              {filtros.periodoTipo === 'personalizado' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
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
              )}
            </div>

            {/* Filtro de Funil */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Funil</label>
              <select
                value={filtros.funilSelecionado}
                onChange={(e) => setFiltros({ ...filtros, funilSelecionado: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Funis</option>
                {funis.map(funil => (
                  <option key={funil.id} value={funil.id}>
                    {funil.funil_nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Grupos */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Grupos</label>
              <select
                value={filtros.grupoSelecionado}
                onChange={(e) => setFiltros({ ...filtros, grupoSelecionado: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Grupos</option>
                {grupos.map(grupo => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </option>
                ))}
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
                  periodoTipo: 'este-mes',
                  periodoInicio: '',
                  periodoFim: '',
                  funilSelecionado: 'todos',
                  grupoSelecionado: 'todos'
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

