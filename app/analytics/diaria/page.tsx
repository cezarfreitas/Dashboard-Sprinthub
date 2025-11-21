"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import AnalyticsFilters from "@/components/filters/AnalyticsFilters"
import { ProtectedRoute } from "@/components/protected-route"
import { TrendingUp } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface FiltrosType {
  unidadesSelecionadas: number[]
  periodoInicio: string
  periodoFim: string
  funilSelecionado: string
  grupoSelecionado: string
}

interface DadoDiario {
  data: string
  dia: number
  total: number
  valor_total?: number
}

interface DadoPorVendedor {
  data: string
  dia: number
  vendedor_id: number
  vendedor_nome: string
  total: number
  valor_total?: number
}

export default function AnaliseDiariaPage() {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [filtros, setFiltros] = useState<FiltrosType>({
    unidadesSelecionadas: [],
    periodoInicio: '',
    periodoFim: '',
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos'
  })
  
  const [dados, setDados] = useState<DadoDiario[]>([])
  const [dadosPorVendedor, setDadosPorVendedor] = useState<DadoPorVendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState<'criadas' | 'ganhas'>('ganhas')

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  // Gerar todas as datas do período
  const todasDatas = useMemo(() => {
    if (!filtros.periodoInicio || !filtros.periodoFim) return []
    
    const todasDatas: string[] = []
    const [startYear, startMonth, startDay] = filtros.periodoInicio.split('-').map(Number)
    const [endYear, endMonth, endDay] = filtros.periodoFim.split('-').map(Number)

    if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay) ||
        isNaN(endYear) || isNaN(endMonth) || isNaN(endDay)) {
      return []
    }

    let currentYear = startYear
    let currentMonth = startMonth
    let currentDay = startDay

    const endDateObj = new Date(endYear, endMonth - 1, endDay)

    while (true) {
      const currentDateObj = new Date(currentYear, currentMonth - 1, currentDay)
      if (currentDateObj > endDateObj) break

      const year = currentDateObj.getFullYear()
      const month = String(currentDateObj.getMonth() + 1).padStart(2, '0')
      const day = String(currentDateObj.getDate()).padStart(2, '0')
      todasDatas.push(`${year}-${month}-${day}`)

      currentDay++
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
      if (currentDay > daysInMonth) {
        currentDay = 1
        currentMonth++
        if (currentMonth > 12) {
          currentMonth = 1
          currentYear++
        }
      }
    }

    return todasDatas
  }, [filtros.periodoInicio, filtros.periodoFim])

  const formatarDataHeader = useCallback((data: string) => {
    const [year, month, day] = data.split('-').map(Number)
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
  }, [])

  const fetchData = useCallback(async (signal: AbortSignal) => {
    if (!filtros.periodoInicio || !filtros.periodoFim) {
      setDados([])
      setDadosPorVendedor([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      params.append('tipo', tipo)
      params.append('data_inicio', filtros.periodoInicio)
      params.append('data_fim', filtros.periodoFim)
      params.append('all', '1')
      
      if (filtros.unidadesSelecionadas.length > 0) {
        params.append('unidade_id', filtros.unidadesSelecionadas.join(','))
      }
      
      if (filtros.funilSelecionado !== 'todos' && filtros.funilSelecionado !== 'undefined') {
        params.append('funil_id', filtros.funilSelecionado)
      }

      const response = await fetch(`/api/oportunidades/diaria?${params.toString()}`, {
        cache: 'no-store',
        signal
      })
      
      if (signal.aborted) return
      
      const result = await response.json()
      
      if (signal.aborted) return

      if (result.success) {
        setDados(result.dados || [])
        setDadosPorVendedor(result.dados_por_vendedor || [])
      } else {
        setDados([])
        setDadosPorVendedor([])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setDados([])
      setDadosPorVendedor([])
    } finally {
      setLoading(false)
    }
  }, [filtros, tipo])

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    if (filtros.periodoInicio && filtros.periodoFim) {
      fetchData(controller.signal)
    }
    
    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [filtros, tipo, fetchData])

  // Organizar dados por vendedor
  const vendedoresMap = useMemo(() => {
    const map = new Map<number, {
      vendedor_id: number
      vendedor_nome: string
      dadosPorData: Map<string, { total: number; valor_total: number }>
      total: number
      valor_total: number
    }>()

    const datasValidasSet = new Set(todasDatas)

    dadosPorVendedor
      .filter(item => item.data && datasValidasSet.has(item.data))
      .forEach(item => {
        if (!map.has(item.vendedor_id)) {
          map.set(item.vendedor_id, {
            vendedor_id: item.vendedor_id,
            vendedor_nome: item.vendedor_nome,
            dadosPorData: new Map(),
            total: 0,
            valor_total: 0
          })
        }

        const vendedor = map.get(item.vendedor_id)!
        vendedor.dadosPorData.set(item.data, {
          total: item.total,
          valor_total: item.valor_total || 0
        })
        vendedor.total += item.total
        vendedor.valor_total += item.valor_total || 0
      })

    return Array.from(map.values()).sort((a, b) => b.valor_total - a.valor_total)
  }, [dadosPorVendedor, todasDatas])

  const totalGeral = useMemo(() => {
    const datasValidasSet = new Set(todasDatas)
    return dados
      .filter(item => item.data && datasValidasSet.has(item.data))
      .reduce((sum, item) => sum + item.total, 0)
  }, [dados, todasDatas])

  const totalGeralValor = useMemo(() => {
    const datasValidasSet = new Set(todasDatas)
    return dados
      .filter(item => item.data && datasValidasSet.has(item.data))
      .reduce((sum, item) => sum + (item.valor_total || 0), 0)
  }, [dados, todasDatas])

  const dadosGrafico = useMemo(() => {
    const datasValidasSet = new Set(todasDatas)
    return dados
      .filter(item => item.data && datasValidasSet.has(item.data))
      .map(item => ({
        dia: item.dia,
        data: item.data,
        total: item.total,
        valor_total: item.valor_total || 0
      }))
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [dados, todasDatas])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <div className="w-full overflow-y-auto scrollbar-hide">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Análise Diária de Oportunidades
              </h1>
              <p className="text-gray-400 text-sm">
                Análise detalhada de oportunidades criadas e ganhas dia a dia
              </p>
            </div>

            {/* Filtros */}
            <AnalyticsFilters onFiltersChange={setFiltros} />

            {/* Seletor de Tipo */}
            <div className="mb-4 flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-400">Tipo:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTipo('criadas')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    tipo === 'criadas'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Criadas
                </button>
                <button
                  onClick={() => setTipo('ganhas')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    tipo === 'ganhas'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Ganhas
                </button>
              </div>
            </div>

            {/* Gráfico */}
            <Card className="bg-gray-900 border-gray-800 mb-6">
              <CardHeader>
                <CardTitle className="text-white">
                  {tipo === 'criadas' ? 'Oportunidades Criadas' : 'Oportunidades Ganhas'} Dia a Dia
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Distribuição diária no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full bg-gray-800" />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosGrafico} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="dia" 
                          tick={{ fill: '#9ca3af', fontSize: 10 }}
                          stroke="#4b5563"
                        />
                        <YAxis 
                          tick={{ fill: '#9ca3af', fontSize: 10 }}
                          stroke="#4b5563"
                          tickFormatter={tipo === 'ganhas' ? (value) => `R$ ${(value / 1000).toFixed(0)}k` : undefined}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => tipo === 'ganhas' 
                            ? [formatCurrency(value), 'Valor']
                            : [value, 'Oportunidades']
                          }
                          labelFormatter={(label) => `Dia ${label}`}
                        />
                        {tipo === 'ganhas' ? (
                          <Line 
                            type="monotone" 
                            dataKey="valor_total" 
                            stroke="#22c55e" 
                            strokeWidth={2}
                            dot={{ fill: '#22c55e', r: 3 }}
                            activeDot={{ r: 5 }}
                            name="Valor"
                            isAnimationActive={false}
                          >
                            <LabelList 
                              dataKey="valor_total" 
                              position="top" 
                              style={{ fill: '#9ca3af', fontSize: '10px' }}
                              formatter={(value: any) => value === 0 ? '' : formatCurrency(value)}
                            />
                          </Line>
                        ) : (
                          <Line 
                            type="monotone" 
                            dataKey="total" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 3 }}
                            activeDot={{ r: 5 }}
                            name="Oportunidades"
                            isAnimationActive={false}
                          >
                            <LabelList 
                              dataKey="total" 
                              position="top" 
                              style={{ fill: '#9ca3af', fontSize: '10px' }}
                              formatter={(value: any) => value === 0 ? '' : String(value)}
                            />
                          </Line>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Matriz por Vendedor */}
            {vendedoresMap.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="bg-muted/50 py-2.5 px-4 flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                      <TrendingUp className="h-4 w-4" />
                      {tipo === 'criadas' ? 'Oportunidades Criadas' : 'Oportunidades Ganhas'} Dia a Dia por Vendedor
                    </CardTitle>
                    <CardDescription className="text-[10px] mt-0.5 text-gray-400">
                      Distribuição diária no período
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400">Total</div>
                      <div className="font-semibold text-sm text-white">{totalGeral} ops</div>
                    </div>
                    {tipo === 'ganhas' && totalGeralValor > 0 && (
                      <div className="text-right border-l border-gray-700 pl-3">
                        <div className="text-[10px] text-gray-400">Valor Total</div>
                        <div className="font-semibold text-sm text-white">{formatCurrency(totalGeralValor)}</div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-gray-800">
                          <TableHead className="sticky left-0 z-20 bg-gray-900 min-w-[140px] border-r border-gray-800 h-10 px-3 text-xs font-medium text-gray-400">
                            Vendedor
                          </TableHead>
                          {todasDatas.map(data => (
                            <TableHead
                              key={data}
                              className="text-center min-w-[60px] h-10 px-1.5 text-[10px] font-medium text-gray-400 border-gray-800"
                            >
                              {formatarDataHeader(data)}
                            </TableHead>
                          ))}
                          <TableHead className="text-center bg-gray-800 min-w-[90px] border-l-2 border-gray-700 h-10 px-3 text-xs font-medium text-gray-400">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendedoresMap.map(vendedor => (
                          <TableRow key={vendedor.vendedor_id} className="hover:bg-gray-800/50 border-gray-800">
                            <TableCell className="sticky left-0 z-10 bg-gray-900 border-r border-gray-800 font-medium text-xs px-3 py-1.5 text-white">
                              <div className="truncate max-w-[130px]" title={vendedor.vendedor_nome}>
                                {vendedor.vendedor_nome}
                              </div>
                            </TableCell>
                            {todasDatas.map(data => {
                              const item = vendedor.dadosPorData.get(data)
                              const quantidade = item?.total || 0
                              const valor = item?.valor_total || 0
                              return (
                                <TableCell
                                  key={`${vendedor.vendedor_id}-${data}`}
                                  className="text-center text-xs py-1.5 px-1 text-white border-gray-800"
                                >
                                  {quantidade > 0 ? (
                                    tipo === 'ganhas' ? (
                                      <div className="flex flex-col items-center justify-center">
                                        <span className="font-semibold text-sm">{formatCurrency(valor)}</span>
                                        <span className="text-[10px] text-gray-400">{quantidade} ops</span>
                                      </div>
                                    ) : (
                                      <span className="font-semibold">{quantidade}</span>
                                    )
                                  ) : (
                                    <span className="text-gray-600">-</span>
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-center bg-gray-800/50 font-semibold border-l-2 border-gray-700 px-3 py-1.5 text-xs text-white">
                              {tipo === 'ganhas' ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-semibold text-sm">{formatCurrency(vendedor.valor_total)}</span>
                                  <span className="text-[10px] text-gray-400">{vendedor.total} ops</span>
                                </div>
                              ) : (
                                vendedor.total
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Linha de totais */}
                        {vendedoresMap.length > 0 && (
                          <TableRow className="bg-gray-800/50 hover:bg-gray-800/50 border-gray-800">
                            <TableCell className="sticky left-0 z-10 bg-gray-800/50 border-r border-gray-800 font-semibold text-xs px-3 py-1.5 text-white">
                              Total
                            </TableCell>
                            {todasDatas.map(data => {
                              const totalDia = dados.find(d => d.data === data)
                              const quantidadeDia = totalDia?.total || 0
                              const valorDia = totalDia?.valor_total || 0
                              return (
                                <TableCell
                                  key={`total-${data}`}
                                  className="text-center font-semibold text-xs py-1.5 px-1 text-white border-gray-800"
                                >
                                  {quantidadeDia > 0 ? (
                                    tipo === 'ganhas' ? (
                                      <div className="flex flex-col items-center justify-center">
                                        <span className="font-semibold text-sm">{formatCurrency(valorDia)}</span>
                                        <span className="text-[10px] text-gray-400">{quantidadeDia} ops</span>
                                      </div>
                                    ) : (
                                      quantidadeDia
                                    )
                                  ) : (
                                    <span className="text-gray-600">-</span>
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-center bg-gray-800 font-bold border-l-2 border-gray-700 px-3 py-1.5 text-xs text-white">
                              {tipo === 'ganhas' ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-bold text-sm">{formatCurrency(totalGeralValor)}</span>
                                  <span className="text-[10px] text-gray-400">{totalGeral} ops</span>
                                </div>
                              ) : (
                                totalGeral
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

