"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { DashboardMetricCard } from '@/components/dashboard-metric-card'
import { RefreshCw, DollarSign } from 'lucide-react'

interface GanhosData {
  totalOportunidades: number
  totalValor: number
  ganhasCriadasMes: number
  ganhasCriadasAnterior: number
}

interface Periodo {
  mes: number
  ano: number
}

interface GanhosCardProps {
  refreshInterval?: number
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function GanhosCard({ 
  refreshInterval = 30000,
  mes,
  ano,
  vendedorId,
  unidadeId
}: GanhosCardProps) {
  const [data, setData] = useState<GanhosData | null>(null)
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
      
      const url = `/api/oportunidades/ganhos${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setPeriodo(result.periodo)
      } else {
        setError(result.message || 'Erro ao carregar dados')
      }
    } catch (err) {
      setError('Erro de conexão')
      console.error('Erro ao buscar ganhos:', err)
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const LoadingState = () => (
    <Card className="border border-slate-200 bg-white p-4">
      <div className="flex animate-pulse flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
              </div>
        <div className="h-8 w-24 rounded bg-slate-200" />
        <div className="h-3 w-44 rounded bg-slate-200" />
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
          <div className="flex justify-between">
            <div className="h-3 w-32 rounded bg-slate-200" />
            <div className="h-3 w-12 rounded bg-slate-200" />
              </div>
          <div className="h-3 w-40 rounded bg-slate-200" />
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
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Ganhos</span>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <DashboardMetricCard
      title="Ganhos"
      icon={DollarSign}
      iconColorClass="text-emerald-600"
      value={formatCurrency(data.totalValor)}
      subtitle={
        periodo ? `Ganhas em ${periodo.mes}/${periodo.ano}` : "Ganhos recentes"
      }
      highlights={[
        {
          label: "Ganhas e criadas no mês:",
          value: data.ganhasCriadasMes.toLocaleString("pt-BR"),
          emphasize: true
        },
        {
          label: "Ganhas no mês, criadas antes:",
          value: data.ganhasCriadasAnterior.toLocaleString("pt-BR"),
          emphasize: true
        }
      ]}
      variant="colored"
    />
  )
}
