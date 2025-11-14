"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react"

interface MotivoPerda {
  motivo: string
  quantidade: number
  valor_perdido: number
  percentual_quantidade: string
  percentual_valor: string
}

interface ApiResponse {
  success: boolean
  mes: number
  ano: number
  motivos: MotivoPerda[]
  total: {
    quantidade: number
    valor: number
  }
  tem_coluna_motivo: boolean
  coluna_motivo: string | null
}

interface RankingMotivosPerdaProps {
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function RankingMotivosPerda({ mes, ano, vendedorId, unidadeId }: RankingMotivosPerdaProps) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getMesNome = (mes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1] || ''
  }

  const getMotivoColor = (index: number): string => {
    const colors = [
      'bg-red-100 text-red-800 border-red-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-lime-100 text-lime-800 border-lime-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
      'bg-blue-100 text-blue-800 border-blue-200'
    ]
    return colors[index % colors.length]
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (mes) params.append('mes', mes.toString())
      if (ano) params.append('ano', ano.toString())
      
      const url = `/api/oportunidades/motivos-perda${params.toString() ? '?' + params.toString() : ''}`
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
  }, [mes, ano])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ranking de Motivos de Perda</h2>
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <Card className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ranking de Motivos de Perda</h2>
          <button 
            onClick={fetchData}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4 inline mr-1" />
            Tentar novamente
          </button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center text-red-700">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Erro ao carregar dados</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || data.motivos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ranking de Motivos de Perda</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum motivo de perda encontrado</p>
              <p className="text-sm">Não há oportunidades perdidas no período selecionado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ranking de Motivos de Perda</h2>
          <p className="text-sm text-muted-foreground">
            {getMesNome(data.mes)} {data.ano}
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4 inline mr-1" />
          Atualizar
        </button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg">Top 10 Motivos de Perda</CardTitle>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total: {data.total.quantidade} oportunidades</span>
            <span>Valor: {formatCurrency(data.total.valor)}</span>
            {!data.tem_coluna_motivo && (
              <Badge variant="outline" className="text-xs">
                Motivos estimados
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {data.motivos.map((motivo, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {motivo.motivo}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {motivo.quantidade} oportunidades • {formatCurrency(motivo.valor_perdido)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex gap-2">
                  <Badge variant="outline" className={`text-xs ${getMotivoColor(index)}`}>
                    {motivo.percentual_quantidade}%
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {motivo.percentual_valor}% valor
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

























