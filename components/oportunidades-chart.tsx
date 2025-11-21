"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DadosDiarios {
  dia: number
  data: string
  total_oportunidades: number
  valor_total: number
}

interface ApiResponse {
  success: boolean
  mes: number
  ano: number
  dados: DadosDiarios[]
  total_mes: number
  valor_total_mes: number
  meta_total: number
}

interface OportunidadesChartProps {
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function OportunidadesChart({ mes, ano, vendedorId, unidadeId }: OportunidadesChartProps) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'R$ 0'
    }
    return `R$ ${value.toLocaleString('pt-BR')}`
  }

  const getMesNome = (mes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1] || ''
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Construir URL com parâmetros se fornecidos
      const params = new URLSearchParams()
      if (mes) params.append('mes', mes.toString())
      if (ano) params.append('ano', ano.toString())
      if (vendedorId) params.append('vendedor_id', vendedorId.toString())
      if (unidadeId) params.append('unidade_id', unidadeId.toString())
      
      const url = `/api/oportunidades/daily-gain${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar dados')
      }
      
      setData(result)

    } catch (err) {
      console.error('Erro ao buscar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [mes, ano, vendedorId, unidadeId])

  // Calcular valores acumulados e meta acumulada diária
  const getDadosAcumulados = () => {
    if (!data || !data.dados || data.dados.length === 0) return []
    
    const diasNoMes = data.dados.length
    const metaDiaria = (data.meta_total || 0) > 0 ? (data.meta_total || 0) / diasNoMes : 0
    
    let acumulado = 0
    return data.dados.map((item, index) => {
      acumulado += item.valor_total || 0
      const metaAcumulada = metaDiaria * (index + 1) // Meta acumulada até este dia
      
      return {
        ...item,
        valor_acumulado: acumulado,
        meta_acumulada: Math.round(metaAcumulada)
      }
    })
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dadoItem = payload[0].payload
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold mb-2">Dia {dadoItem.dia}</p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Valor do dia: <span className="font-bold">{formatCurrency(dadoItem?.valor_total)}</span>
            </p>
            <p className="text-xs text-green-600 font-semibold">
              Receita Acumulada: <span className="font-bold">{formatCurrency(dadoItem?.valor_acumulado)}</span>
            </p>
            {data && data.meta_total > 0 && (
              <>
                <p className="text-xs text-blue-600">
                  Meta até o dia: <span className="font-bold">{formatCurrency(dadoItem?.meta_acumulada)}</span>
                </p>
                <p className={`text-xs font-semibold ${
                  (dadoItem?.valor_acumulado || 0) >= (dadoItem?.meta_acumulada || 0)
                    ? 'text-green-600' 
                    : 'text-orange-600'
                }`}>
                  {(dadoItem?.valor_acumulado || 0) >= (dadoItem?.meta_acumulada || 0)
                    ? `✓ Acima da meta em ${formatCurrency((dadoItem?.valor_acumulado || 0) - (dadoItem?.meta_acumulada || 0))}`
                    : `Faltam ${formatCurrency((dadoItem?.meta_acumulada || 0) - (dadoItem?.valor_acumulado || 0))}`
                  }
                </p>
              </>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Receita Acumulada</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Receita Acumulada</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">Erro: {error}</p>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.dados.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Receita Acumulada</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Nenhum dado encontrado para este período</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <CardTitle className="text-sm font-semibold">Receita Acumulada</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {data?.mes ? getMesNome(data.mes) : ''} {data?.ano || ''}
              </p>
            </div>
          </div>
          <Button onClick={fetchData} variant="ghost" size="sm" className="h-6 w-6 p-0">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Resumo compacto */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-2 rounded-md bg-green-50 border border-green-200">
            <div className="text-xs text-green-600 mb-0.5">Receita</div>
            <div className="text-sm font-bold text-green-700">{formatCurrency(data?.valor_total_mes)}</div>
          </div>
          
          <div className="p-2 rounded-md bg-blue-50 border border-blue-200">
            <div className="text-xs text-blue-600 mb-0.5">Meta</div>
            <div className="text-sm font-bold text-blue-700">
              {(data?.meta_total || 0) > 0 ? formatCurrency(data?.meta_total) : '-'}
            </div>
          </div>
          
          {(data?.meta_total || 0) > 0 && (
            <>
              <div className={`p-2 rounded-md border ${
                (data?.valor_total_mes || 0) >= (data?.meta_total || 0)
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className={`text-xs mb-0.5 ${
                  (data?.valor_total_mes || 0) >= (data?.meta_total || 0)
                    ? 'text-green-600' 
                    : 'text-orange-600'
                }`}>
                  Progresso
                </div>
                <div className={`text-sm font-bold ${
                  (data?.valor_total_mes || 0) >= (data?.meta_total || 0)
                    ? 'text-green-700' 
                    : 'text-orange-700'
                }`}>
                  {((data?.valor_total_mes || 0) / (data?.meta_total || 1) * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className={`p-2 rounded-md border ${
                (data?.valor_total_mes || 0) >= (data?.meta_total || 0)
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className={`text-xs mb-0.5 ${
                  (data?.valor_total_mes || 0) >= (data?.meta_total || 0)
                    ? 'text-green-600' 
                    : 'text-orange-600'
                }`}>
                  {(data?.valor_total_mes || 0) >= (data?.meta_total || 0) ? 'Superado' : 'Faltam'}
                </div>
                <div className={`text-sm font-bold ${
                  (data?.valor_total_mes || 0) >= (data?.meta_total || 0)
                    ? 'text-green-700' 
                    : 'text-orange-700'
                }`}>
                  {formatCurrency(Math.abs((data?.valor_total_mes || 0) - (data?.meta_total || 0)))}
                </div>
              </div>
            </>
          )}
          
          {!(data?.meta_total || 0) && data?.dados && data.dados.length > 0 && (
            <div className="col-span-2 p-2 rounded-md bg-muted/50 border border-muted flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Média diária: <span className="font-bold text-foreground">{formatCurrency((data?.valor_total_mes || 0) / data.dados.length)}</span></p>
            </div>
          )}
        </div>

        {/* Gráfico de linha */}
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={getDadosAcumulados()}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis 
                dataKey="dia" 
                tick={{ fontSize: 11 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="line"
              />
              
              {/* Linha da Meta Acumulada (se houver meta) */}
              {(data?.meta_total || 0) > 0 && (
                <Line 
                  type="monotone" 
                  dataKey="meta_acumulada" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  name="Meta Esperada"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              
              {/* Linha da Receita Acumulada */}
              <Line 
                type="monotone" 
                dataKey="valor_acumulado" 
                stroke="#22c55e" 
                strokeWidth={3}
                name="Receita Real"
                dot={{ fill: '#22c55e', r: 3 }}
                activeDot={{ r: 5, fill: '#16a34a' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

