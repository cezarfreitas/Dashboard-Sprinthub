"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { DashboardMetricCard } from '@/components/dashboard-metric-card'
import { RefreshCw, TrendingUp } from 'lucide-react'

interface NovasOportunidadesData {
  totalOportunidades: number
  oportunidadesMesAnterior: number
  diferencaPercentual: number
}

interface Periodo {
  mes: number
  ano: number
  mesAnterior: number
  anoAnterior: number
  diaAtual: number
  dateField: string
}

interface NovasOportunidadesCardProps {
  refreshInterval?: number
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function NovasOportunidadesCard({ 
  refreshInterval = 30000,
  mes,
  ano,
  vendedorId,
  unidadeId
}: NovasOportunidadesCardProps) {
  const [data, setData] = useState<NovasOportunidadesData | null>(null)
  const [periodo, setPeriodo] = useState<Periodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (mes) params.append('mes', mes.toString())
      if (ano) params.append('ano', ano.toString())
      if (vendedorId) params.append('vendedor_id', vendedorId.toString())
      if (unidadeId) params.append('unidade_id', unidadeId.toString())
      
      const url = `/api/oportunidades/novas${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setPeriodo(result.periodo)
      } else {
        setError(result.message || 'Erro ao carregar dados')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, mes, ano, vendedorId, unidadeId])


  const LoadingState = () => (
    <Card className="border border-slate-200 bg-white p-4">
      <div className="flex animate-pulse flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
              </div>
        <div className="h-8 w-20 rounded bg-slate-200" />
        <div className="h-3 w-40 rounded bg-slate-200" />
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
          <div className="flex justify-between">
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="h-3 w-10 rounded bg-slate-200" />
              </div>
          <div className="h-3 w-16 rounded bg-slate-200" />
            </div>
          </div>
      </Card>
    )

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <Card className="border border-slate-200 bg-white p-4 text-slate-500">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Novas Oportunidades</span>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const diferencaFormatada = `${data.diferencaPercentual > 0 ? "+" : ""}${data.diferencaPercentual.toFixed(1)}%`
  const trendDirection = data.diferencaPercentual >= 0 ? "up" : "down"

  return (
    <DashboardMetricCard
      title="Novas Oportunidades"
      icon={TrendingUp}
      iconColorClass="text-blue-600"
      value={data.totalOportunidades.toLocaleString("pt-BR")}
      subtitle={
        periodo
          ? `Criadas até hoje (${periodo.diaAtual}/${periodo.mes}/${periodo.ano})`
          : "Criadas recentemente"
      }
      highlights={[
        {
          label: "Mesmo período mês anterior:",
          value: data.oportunidadesMesAnterior.toLocaleString("pt-BR"),
          emphasize: true
        }
      ]}
      trend={{
        value: diferencaFormatada,
        direction: trendDirection === "up" ? "up" : "down"
      }}
      variant="colored"
    />
  )
}
