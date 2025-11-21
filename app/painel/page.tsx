"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAudioPlayer } from "@/hooks/use-audio-player"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { PainelUnidadesGrid } from "@/components/painel/PainelUnidadesGrid"
import PainelFiltersInline from "@/components/painel/PainelFiltersInline"
import PainelHojeCard from "@/components/estatisticas/painel/PainelHojeCard"
import PainelOportunidadesAbertasCard from "@/components/estatisticas/painel/PainelOportunidadesAbertasCard"
import PainelOportunidadesPerdidasCard from "@/components/estatisticas/painel/PainelOportunidadesPerdidasCard"
import PainelOportunidadesGanhasCard from "@/components/estatisticas/painel/PainelOportunidadesGanhasCard"
import PainelTaxaConversaoCard from "@/components/estatisticas/painel/PainelTaxaConversaoCard"
import PainelTicketMedioCard from "@/components/estatisticas/painel/PainelTicketMedioCard"
import { ProtectedRoute } from "@/components/protected-route"
import { Header } from "@/components/header"

export default function PainelPage() {
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Estados
  const [oportunidadesCriadas, setOportunidadesCriadas] = useState<any[]>([])
  const [receitaDiaria, setReceitaDiaria] = useState<any[]>([])
  const [loadingGraficos, setLoadingGraficos] = useState(true)
  const { playAudio, playBellSound, isReady: audioReady } = useAudioPlayer()
  
  // Período inicial
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
  
  const [filtros, setFiltros] = useState(() => ({
    unidadesSelecionadas: [] as number[],
    periodoTipo: 'este-mes' as string,
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos'
  }))
  
  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string }>>([])
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])
  
  const { mesAtual, anoAtual } = useMemo(() => {
    const dataAtual = new Date()
    return {
      mesAtual: dataAtual.getMonth() + 1,
      anoAtual: dataAtual.getFullYear()
    }
  }, [])

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

  // Função para calcular datas baseado no tipo de período
  const calcularPeriodo = useMemo(() => {
    return (tipo: string) => {
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
    }
  }, [])

  const filtrosAtivos = useMemo(() => {
    return filtros.unidadesSelecionadas.length > 0 ||
           filtros.periodoTipo !== 'este-mes' ||
           filtros.funilSelecionado !== 'todos' ||
           filtros.grupoSelecionado !== 'todos'
  }, [filtros])

  // Função de fetch para gráficos com AbortController
  const fetchGraficos = useCallback(async (signal: AbortSignal) => {
    try {
      setLoadingGraficos(true)
      
      const periodoInicio = filtros.periodoInicio || periodoInicial.inicio
      const periodoFim = filtros.periodoFim || periodoInicial.fim
      
      const unidadesParam = filtros.unidadesSelecionadas.length > 0
        ? `&unidade_id=${filtros.unidadesSelecionadas.join(',')}`
        : ''
      
      const [responseCriadas, responseReceita] = await Promise.all([
        fetch(
          `/api/oportunidades/diaria?tipo=criadas&data_inicio=${periodoInicio}&data_fim=${periodoFim}${unidadesParam}`, 
          { cache: 'no-store', signal }
        ),
        fetch(
          `/api/oportunidades/diaria?tipo=ganhas&data_inicio=${periodoInicio}&data_fim=${periodoFim}${unidadesParam}`, 
          { cache: 'no-store', signal }
        )
      ])
      
      if (signal.aborted) return
      
      const [dataCriadas, dataReceita] = await Promise.all([
        responseCriadas.json(),
        responseReceita.json()
      ])
      
      if (signal.aborted) return
      
      if (dataCriadas.success && dataCriadas.dados) {
        setOportunidadesCriadas(dataCriadas.dados.map((item: any) => ({
          dia: item.dia,
          data: item.data,
          total_criadas: item.total
        })))
      } else {
        setOportunidadesCriadas([])
      }
      
      if (dataReceita.success && dataReceita.dados) {
        setReceitaDiaria(dataReceita.dados.map((item: any) => ({
          dia: item.dia,
          data: item.data,
          total_oportunidades: item.total,
          valor_total: item.valor_total || 0
        })))
      } else {
        setReceitaDiaria([])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setLoadingGraficos(false)
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas, periodoInicial])

  const fetchFunis = useCallback(async () => {
    try {
      const response = await fetch('/api/funis')
      const data = await response.json()
      if (data.success && data.funis) {
        setFunis(data.funis)
      }
    } catch (err) {
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
      setUnidadesList([])
    }
  }, [])

  // Effect 1: Atualizar período quando o tipo mudar
  useEffect(() => {
    if (filtros.periodoTipo !== 'personalizado') {
      const { inicio, fim } = calcularPeriodo(filtros.periodoTipo)
      if (filtros.periodoInicio !== inicio || filtros.periodoFim !== fim) {
        setFiltros(prev => ({
          ...prev,
          periodoInicio: inicio,
          periodoFim: fim
        }))
      }
    }
  }, [filtros.periodoTipo, filtros.periodoInicio, filtros.periodoFim, calcularPeriodo])

  // Effect 2: Carregar dados estáticos uma vez
  useEffect(() => {
    fetchFunis()
    fetchGrupos()
    fetchUnidadesList()
  }, [fetchFunis, fetchGrupos, fetchUnidadesList])

  // Effect 3: Carregar gráficos quando filtros mudarem (CONSOLIDADO - evita carregamento duplo)
  useEffect(() => {
    // Cancelar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Criar novo AbortController
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    // Aguardar período estar definido
    if (!filtros.periodoInicio || !filtros.periodoFim) {
      return
    }
    
    // Carregar dados
    fetchGraficos(controller.signal)
    
    // Cleanup
    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas.join(','), fetchGraficos])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <Header />
        
        {!audioReady && (
          <div className="fixed top-20 right-4 z-50">
            <div 
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-pointer hover:bg-blue-500/30 transition-all"
              onClick={() => playBellSound()}
              title="Clique para ativar sons"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Clique para ativar sons
            </div>
          </div>
        )}

        <div className="w-full overflow-y-auto scrollbar-hide">
        <div className="p-6">
          <PainelFiltersInline
            filtros={filtros}
            setFiltros={setFiltros}
            unidadesList={unidadesList}
            funis={funis}
            grupos={grupos}
            periodoInicial={periodoInicial}
            filtrosAtivos={filtrosAtivos}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <PainelHojeCard 
              unidadesIds={filtros.unidadesSelecionadas}
              funilId={filtros.funilSelecionado}
              grupoId={filtros.grupoSelecionado}
            />
            <PainelOportunidadesAbertasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
            />
            <PainelOportunidadesPerdidasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
            />
            <PainelOportunidadesGanhasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
            />
            <PainelTaxaConversaoCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
            />
            <PainelTicketMedioCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-3">
                <h3 className="text-white font-bold text-sm uppercase mb-2">Oportunidades Criadas Dia a Dia</h3>
                {loadingGraficos ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[150px] w-full bg-gray-800" />
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
                          name={`${filtros.periodoInicio} a ${filtros.periodoFim}`}
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

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-3">
                <h3 className="text-white font-bold text-sm uppercase mb-2">Receita Dia a Dia</h3>
                {loadingGraficos ? (
                  <div className="space-y-2">
                    <Skeleton className="h-[150px] w-full bg-gray-800" />
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

          <PainelUnidadesGrid 
            filtros={filtros}
            mesAtual={mesAtual}
            anoAtual={anoAtual}
          />
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}
