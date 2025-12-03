"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { RefreshCw } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface OportunidadeRaw {
  id: number
  title: string
  value: number
  status: string
  status_pt: string
  crm_column: string
  sale_channel: string
  campaign: string
  vendedor: string
  vendedor_id: number | null
  vendedor_nome: string | null
  vendedor_sobrenome: string | null
  vendedor_username: string | null
  loss_reason: string | null
  gain_reason: string | null
  data_criacao: string | null
  data_ganho: string | null
  data_perda: string | null
  data_fechamento_esperada: string | null
  mes_criacao: string | null
  ano_criacao: string | null
  mes_numero: string | null
  dia_criacao: number | null
  dia_semana: string | null
}

type TipoGrafico = 'bar' | 'line' | 'pie' | 'area'

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#f43f5e', // rose-500
]

// Opções de campos disponíveis
const camposDisponiveis = [
  { value: 'vendedor', label: 'Vendedor (Nome Completo)', tipo: 'categoria' },
  { value: 'vendedor_nome', label: 'Vendedor (Nome)', tipo: 'categoria' },
  { value: 'vendedor_username', label: 'Vendedor (Username)', tipo: 'categoria' },
  { value: 'status_pt', label: 'Status (PT)', tipo: 'categoria' },
  { value: 'status', label: 'Status (EN)', tipo: 'categoria' },
  { value: 'sale_channel', label: 'Canal de Vendas', tipo: 'categoria' },
  { value: 'campaign', label: 'Campanha', tipo: 'categoria' },
  { value: 'crm_column', label: 'Coluna do Funil', tipo: 'categoria' },
  { value: 'mes_criacao', label: 'Mês de Criação', tipo: 'categoria' },
  { value: 'ano_criacao', label: 'Ano de Criação', tipo: 'categoria' },
  { value: 'dia_semana', label: 'Dia da Semana', tipo: 'categoria' },
  { value: 'loss_reason', label: 'Motivo de Perda', tipo: 'categoria' },
  { value: 'gain_reason', label: 'Motivo de Ganho', tipo: 'categoria' },
  { value: 'value', label: 'Valor', tipo: 'numerico' },
  { value: 'count', label: 'Quantidade', tipo: 'numerico' }
]

export default function TestePage() {
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState<OportunidadeRaw[]>([])
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  
  // Configurações do gráfico
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>('bar')
  const [campoX, setCampoX] = useState<string>('mes_criacao')
  const [campoY, setCampoY] = useState<string>('count')
  const [agrupamento, setAgrupamento] = useState<string>('sum') // sum, avg, count
  
  // Nova feature: agrupamento por legenda (múltiplas séries)
  const [usarLegenda, setUsarLegenda] = useState<boolean>(true)
  const [campoLegenda, setCampoLegenda] = useState<string>('vendedor')
  const [limiteItensLegenda, setLimiteItensLegenda] = useState<number>(10)
  const [empilhado, setEmpilhado] = useState<boolean>(false)
  const [mostrarRotulos, setMostrarRotulos] = useState<boolean>(false)
  const [mostrarGrid, setMostrarGrid] = useState<boolean>(true)
  const [alturaGrafico, setAlturaGrafico] = useState<number>(500)

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dataInicio) params.append('data_inicio', dataInicio)
      if (dataFim) params.append('data_fim', dataFim)
      params.append('limit', '10000')

      const response = await fetch(`/api/oportunidades/teste/raw?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setRawData(result.data)
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Processar dados para o gráfico COM agrupamento por legenda
  const dadosProcessadosComLegenda = useMemo(() => {
    if (!rawData || rawData.length === 0) return []

    // Estrutura: Map<eixoX, Map<legenda, {y, count, total}>>
    const agrupado = new Map<string, Map<string, { y: number; count: number; total: number }>>()

    rawData.forEach(op => {
      const xValue = op[campoX as keyof OportunidadeRaw]?.toString() || 'Não informado'
      const legendaValue = op[campoLegenda as keyof OportunidadeRaw]?.toString() || 'Não informado'

      if (!agrupado.has(xValue)) {
        agrupado.set(xValue, new Map())
      }

      const legendaMap = agrupado.get(xValue)!
      
      if (!legendaMap.has(legendaValue)) {
        legendaMap.set(legendaValue, { y: 0, count: 0, total: 0 })
      }

      const item = legendaMap.get(legendaValue)!
      item.count += 1
      item.total += op.value || 0
    })

    // Identificar top N itens da legenda (por soma total)
    const legendaSomas = new Map<string, number>()
    agrupado.forEach(legendaMap => {
      legendaMap.forEach((item, legendaKey) => {
        legendaSomas.set(legendaKey, (legendaSomas.get(legendaKey) || 0) + item.total)
      })
    })

    const topLegendas = Array.from(legendaSomas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limiteItensLegenda)
      .map(([key]) => key)

    // Construir dados para o gráfico
    const resultado: any[] = []

    agrupado.forEach((legendaMap, xValue) => {
      const dataPoint: any = { name: xValue }

      topLegendas.forEach(legendaKey => {
        const item = legendaMap.get(legendaKey)
        
        let yValue = 0
        if (item) {
          if (campoY === 'count') {
            yValue = item.count
          } else if (campoY === 'value') {
            if (agrupamento === 'sum') {
              yValue = item.total
            } else if (agrupamento === 'avg') {
              yValue = item.count > 0 ? item.total / item.count : 0
            }
          }
        }

        dataPoint[legendaKey] = yValue
      })

      resultado.push(dataPoint)
    })

    return { data: resultado, legendas: topLegendas }
  }, [rawData, campoX, campoY, agrupamento, campoLegenda, limiteItensLegenda, usarLegenda])

  // Processar dados SEM agrupamento por legenda (modo simples)
  const dadosProcessadosSimples = useMemo(() => {
    if (!rawData || rawData.length === 0) return []

    const agrupado = new Map<string, { x: string; y: number; count: number; total: number }>()

    rawData.forEach(op => {
      const xValue = op[campoX as keyof OportunidadeRaw]?.toString() || 'Não informado'
      
      if (!agrupado.has(xValue)) {
        agrupado.set(xValue, {
          x: xValue,
          y: 0,
          count: 0,
          total: 0
        })
      }

      const item = agrupado.get(xValue)!
      item.count += 1
      item.total += op.value || 0
    })

    const resultado = Array.from(agrupado.values()).map(item => {
      let yValue = 0
      
      if (campoY === 'count') {
        yValue = item.count
      } else if (campoY === 'value') {
        if (agrupamento === 'sum') {
          yValue = item.total
        } else if (agrupamento === 'avg') {
          yValue = item.count > 0 ? item.total / item.count : 0
        }
      }

      return {
        name: item.x,
        value: yValue,
        count: item.count,
        total: item.total,
        media: item.count > 0 ? item.total / item.count : 0
      }
    })

    return resultado.sort((a, b) => b.value - a.value)
  }, [rawData, campoX, campoY, agrupamento])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatLabel = (value: number) => {
    if (campoY === 'value') {
      // Para valores monetários, formato compacto
      if (value >= 1000000) {
        return `R$ ${(value / 1000000).toFixed(1)}M`
      } else if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(0)}k`
      } else {
        return `R$ ${value.toFixed(0)}`
      }
    } else {
      // Para quantidades
      return value.toString()
    }
  }

  const formatYAxis = (value: number) => {
    if (campoY === 'value') {
      if (value >= 1000000) {
        return `R$ ${(value / 1000000).toFixed(1)}M`
      } else if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(0)}k`
      } else if (value >= 100) {
        return `R$ ${(value / 100).toFixed(0)}h`
      } else {
        return `R$ ${value}`
      }
    }
    return value.toString()
  }

  // Componente de Label customizado para barras
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props
    
    if (!value || value === 0) return null
    
    // Não mostrar label se a altura for muito pequena (menos de 20px)
    if (height < 20) return null
    
    const labelY = y + height / 2
    const labelX = x + width / 2
    
    return (
      <text
        x={labelX}
        y={labelY}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight="bold"
      >
        {formatLabel(value)}
      </text>
    )
  }

  // Tooltip customizado para empilhados
  const CustomTooltipEmpilhado = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const total = payload.reduce((sum: number, item: any) => sum + (item.value || 0), 0)

    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-semibold text-sm mb-2 border-b pb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.name}:</span>
              </div>
              <span className="font-semibold">
                {campoY === 'value' ? formatCurrency(item.value) : item.value}
              </span>
            </div>
          ))}
          {empilhado && payload.length > 1 && (
            <div className="flex items-center justify-between gap-3 text-xs pt-1 mt-1 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-primary">
                {campoY === 'value' ? formatCurrency(total) : total}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderGraficoComLegenda = () => {
    const { data, legendas } = dadosProcessadosComLegenda as { data: any[]; legendas: string[] }

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Nenhum dado disponível para exibir
        </div>
      )
    }

    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 80 }
    }

    switch (tipoGrafico) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={alturaGrafico}>
            <BarChart {...commonProps}>
              {mostrarGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb"
                  opacity={0.5}
                  vertical={false}
                />
              )}
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#d1d5db"
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#d1d5db"
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltipEmpilhado />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                iconSize={10}
              />
              {legendas.map((legenda, index) => (
                <Bar 
                  key={legenda} 
                  dataKey={legenda} 
                  fill={COLORS[index % COLORS.length]}
                  name={legenda}
                  stackId={empilhado ? "stack" : undefined}
                  label={mostrarRotulos ? renderCustomBarLabel : false}
                  radius={empilhado && index === legendas.length - 1 ? [8, 8, 0, 0] : 0}
                  maxBarSize={60}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={alturaGrafico}>
            <LineChart {...commonProps}>
              {mostrarGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb"
                  opacity={0.5}
                  vertical={false}
                />
              )}
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#d1d5db"
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#d1d5db"
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltipEmpilhado />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                iconSize={10}
              />
              {legendas.map((legenda, index) => (
                <Line 
                  key={legenda}
                  type="monotone" 
                  dataKey={legenda} 
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={3}
                  name={legenda}
                  dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
                  activeDot={{ r: 6 }}
                  label={mostrarRotulos ? { 
                    position: 'top', 
                    formatter: (value: any) => formatLabel(Number(value)),
                    fill: COLORS[index % COLORS.length],
                    fontSize: 10,
                    fontWeight: '600'
                  } : false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={alturaGrafico}>
            <AreaChart {...commonProps}>
              {mostrarGrid && (
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb"
                  opacity={0.5}
                  vertical={false}
                />
              )}
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#d1d5db"
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#d1d5db"
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltipEmpilhado />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                iconSize={10}
              />
              {legendas.map((legenda, index) => (
                <Area 
                  key={legenda}
                  type="monotone" 
                  dataKey={legenda} 
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={empilhado ? 0.8 : 0.4}
                  strokeWidth={2}
                  name={legenda}
                  stackId={empilhado ? "stack" : undefined}
                  label={mostrarRotulos && !empilhado ? { 
                    position: 'top', 
                    formatter: (value: any) => formatLabel(Number(value)),
                    fill: COLORS[index % COLORS.length],
                    fontSize: 10,
                    fontWeight: '600'
                  } : false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'pie':
        // Pizza não suporta múltiplas séries, usar modo simples
        return renderGraficoSimples()

      default:
        return null
    }
  }

  const renderGraficoSimples = () => {
    if (dadosProcessadosSimples.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Nenhum dado disponível para exibir
        </div>
      )
    }

    const commonProps = {
      data: dadosProcessadosSimples,
      margin: { top: 5, right: 30, left: 20, bottom: 80 }
    }

    switch (tipoGrafico) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                tickFormatter={campoY === 'value' ? (value) => `R$ ${(value / 1000).toFixed(0)}k` : undefined}
              />
              <Tooltip 
                formatter={(value: number) => 
                  campoY === 'value' ? formatCurrency(value) : value.toLocaleString('pt-BR')
                }
              />
              <Legend />
              <Bar 
                dataKey="value" 
                fill="#3b82f6" 
                name={campoY === 'value' ? 'Valor' : 'Quantidade'}
                label={mostrarRotulos ? renderCustomBarLabel : false}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                tickFormatter={campoY === 'value' ? (value) => `R$ ${(value / 1000).toFixed(0)}k` : undefined}
              />
              <Tooltip 
                formatter={(value: number) => 
                  campoY === 'value' ? formatCurrency(value) : value.toLocaleString('pt-BR')
                }
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name={campoY === 'value' ? 'Valor' : 'Quantidade'}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                label={mostrarRotulos ? { 
                  position: 'top', 
                  formatter: (value: any) => formatLabel(Number(value)),
                  fill: '#3b82f6',
                  fontSize: 11,
                  fontWeight: 'bold'
                } : false}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={dadosProcessadosSimples.slice(0, 15)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }: any) => `${name}: ${campoY === 'value' ? formatCurrency(Number(value)) : value}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosProcessadosSimples.slice(0, 15).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => 
                  campoY === 'value' ? formatCurrency(value) : value.toLocaleString('pt-BR')
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                tickFormatter={campoY === 'value' ? (value) => `R$ ${(value / 1000).toFixed(0)}k` : undefined}
              />
              <Tooltip 
                formatter={(value: number) => 
                  campoY === 'value' ? formatCurrency(value) : value.toLocaleString('pt-BR')
                }
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.4}
                strokeWidth={2}
                name={campoY === 'value' ? 'Valor' : 'Quantidade'}
                label={mostrarRotulos ? { 
                  position: 'top', 
                  formatter: (value: any) => formatLabel(Number(value)),
                  fill: '#3b82f6',
                  fontSize: 11,
                  fontWeight: 'bold'
                } : false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display">Criador de Gráficos</h1>
        </div>
      </div>

      {/* Configurações Compactas em Uma Linha */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Linha 1: Filtros e Eixos Principais */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <div>
                <Label className="text-xs mb-1 block">Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Tipo</Label>
                <Select value={tipoGrafico} onValueChange={(value) => setTipoGrafico(value as TipoGrafico)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">📊 Barras</SelectItem>
                    <SelectItem value="line">📈 Linhas</SelectItem>
                    <SelectItem value="area">📉 Área</SelectItem>
                    <SelectItem value="pie">🥧 Pizza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Eixo X</Label>
                <Select value={campoX} onValueChange={setCampoX}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {camposDisponiveis
                      .filter(c => c.tipo === 'categoria')
                      .map(campo => (
                        <SelectItem key={campo.value} value={campo.value}>
                          {campo.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Eixo Y</Label>
                <Select value={campoY} onValueChange={setCampoY}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {camposDisponiveis
                      .filter(c => c.tipo === 'numerico')
                      .map(campo => (
                        <SelectItem key={campo.value} value={campo.value}>
                          {campo.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {campoY === 'value' && (
                <div>
                  <Label className="text-xs mb-1 block">Agregação</Label>
                  <Select value={agrupamento} onValueChange={setAgrupamento}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Soma</SelectItem>
                      <SelectItem value="avg">Média</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Linha 2: Opções e Config Avançada */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Switches */}
              {tipoGrafico !== 'pie' && (
                <>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mostrarRotulos}
                      onCheckedChange={setMostrarRotulos}
                    />
                    <Label className="text-xs">Rótulos</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mostrarGrid}
                      onCheckedChange={setMostrarGrid}
                    />
                    <Label className="text-xs">Grid</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={usarLegenda}
                      onCheckedChange={setUsarLegenda}
                    />
                    <Label className="text-xs">Múltiplas Séries</Label>
                  </div>
                  {usarLegenda && (tipoGrafico === 'bar' || tipoGrafico === 'area') && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={empilhado}
                        onCheckedChange={setEmpilhado}
                      />
                      <Label className="text-xs">Empilhado</Label>
                    </div>
                  )}
                </>
              )}

              {/* Config Múltiplas Séries Inline */}
              {usarLegenda && tipoGrafico !== 'pie' && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Comparar:</Label>
                    <Select value={campoLegenda} onValueChange={setCampoLegenda}>
                      <SelectTrigger className="h-8 w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {camposDisponiveis
                          .filter(c => c.tipo === 'categoria' && c.value !== campoX)
                          .map(campo => (
                            <SelectItem key={campo.value} value={campo.value}>
                              {campo.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Limite:</Label>
                    <Select 
                      value={limiteItensLegenda.toString()} 
                      onValueChange={(value) => setLimiteItensLegenda(parseInt(value))}
                    >
                      <SelectTrigger className="h-8 w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Top 5</SelectItem>
                        <SelectItem value="10">Top 10</SelectItem>
                        <SelectItem value="15">Top 15</SelectItem>
                        <SelectItem value="20">Top 20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Altura */}
              {tipoGrafico !== 'pie' && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Altura:</Label>
                  <input
                    type="range"
                    min="300"
                    max="800"
                    step="50"
                    value={alturaGrafico}
                    onChange={(e) => setAlturaGrafico(parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">{alturaGrafico}px</span>
                </div>
              )}

              {/* Botão Atualizar */}
              <Button onClick={fetchData} size="sm" className="ml-auto">
                <RefreshCw className="h-3 w-3 mr-1" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Abaixo */}
      <div className="space-y-3">

        {/* Gráfico */}
        <Card>
        <CardHeader>
          <CardTitle>
            {tipoGrafico === 'bar' && 'Gráfico de Barras'}
            {tipoGrafico === 'line' && 'Gráfico de Linhas'}
            {tipoGrafico === 'pie' && 'Gráfico de Pizza'}
            {tipoGrafico === 'area' && 'Gráfico de Área'}
            {usarLegenda && tipoGrafico !== 'pie' && ' (Múltiplas Séries)'}
            {usarLegenda && empilhado && tipoGrafico === 'bar' && ' - Empilhadas'}
            {usarLegenda && empilhado && tipoGrafico === 'area' && ' - Empilhadas'}
          </CardTitle>
          <CardDescription>
            {camposDisponiveis.find(c => c.value === campoX)?.label} × {camposDisponiveis.find(c => c.value === campoY)?.label}
            {campoY === 'value' && agrupamento === 'avg' && ' (Média)'}
            {campoY === 'value' && agrupamento === 'sum' && ' (Soma)'}
            {usarLegenda && tipoGrafico !== 'pie' && ` • Legenda: ${camposDisponiveis.find(c => c.value === campoLegenda)?.label}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            usarLegenda && tipoGrafico !== 'pie' ? renderGraficoComLegenda() : renderGraficoSimples()
          )}
        </CardContent>
      </Card>

        {/* Resumo dos Dados */}
        {!loading && rawData.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total de Registros</p>
                  <p className="text-xl font-bold">{rawData.length.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(rawData.reduce((sum, op) => sum + op.value, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Médio</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(rawData.reduce((sum, op) => sum + op.value, 0) / rawData.length)}
                  </p>
                </div>
                {usarLegenda && tipoGrafico !== 'pie' && (
                  <div>
                    <p className="text-xs text-muted-foreground">Séries no Gráfico</p>
                    <p className="text-xl font-bold">
                      {(dadosProcessadosComLegenda as { data: any[]; legendas: string[] }).legendas.length}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
