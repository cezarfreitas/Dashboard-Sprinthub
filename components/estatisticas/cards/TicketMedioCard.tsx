"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { DashboardMetricCard } from '@/components/dashboard-metric-card'
import { DollarSign } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface TicketMedioData {
  ticketMedio?: number
  totalGanhas?: number
  valorTotal?: number
}

interface TicketMedioCardProps {
  refreshInterval?: number
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function TicketMedioCard({ 
  refreshInterval = 30000,
  mes,
  ano,
  vendedorId,
  unidadeId
}: TicketMedioCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [data, setData] = useState<TicketMedioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const fetchData = async () => {
    if (authLoading || !user) {
      return
    }
    try {
      setLoading(true)
      setError(null)
      
      if (!mes || !ano) {
        setError('Mês e ano são obrigatórios')
        return
      }
      
      const params = new URLSearchParams()
      params.append('status', 'won')
      
      if (vendedorId) {
        params.append('user_id', vendedorId.toString())
      }
      if (unidadeId) {
        params.append('unidade_id', unidadeId.toString())
      }
      
      const primeiroDiaMes = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
      const ultimoDiaMes = new Date(ano, mes, 0).toISOString().split('T')[0]
      params.append('gain_date_start', primeiroDiaMes)
      params.append('gain_date_end', ultimoDiaMes)
      
      const response = await fetch(`/api/oportunidades/stats?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const totalGanhas = Number(result.data.total_ganhas || 0)
        const valorTotal = Number(result.data.valor_ganhas || 0)
        const ticketMedio = totalGanhas > 0 ? valorTotal / totalGanhas : 0
        
        setData({
          ticketMedio,
          totalGanhas,
          valorTotal
        })
      } else {
        setError('Erro ao carregar dados')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchData()
      
      if (refreshInterval > 0) {
        const interval = setInterval(fetchData, refreshInterval)
        return () => clearInterval(interval)
      }
    } else if (!authLoading && !user) {
      setData(null)
      setLoading(false)
    }
  }, [authLoading, user, refreshInterval, mes, ano, vendedorId, unidadeId])

  const LoadingState = () => (
    <Card className="border border-slate-200 bg-white p-4">
      <div className="flex animate-pulse flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-200" />
          <div className="h-4 w-24 rounded bg-slate-200" />
        </div>
        <div className="h-8 w-24 rounded bg-slate-200" />
        <div className="h-3 w-48 rounded bg-slate-200" />
      </div>
    </Card>
  )

  if (authLoading || !user) {
    return null
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <Card className="border border-slate-200 bg-white p-4 text-slate-500">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-600">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Ticket Médio</span>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const ticketMedio = Number(data.ticketMedio || 0)
  const totalGanhas = Number(data.totalGanhas || 0)
  const valorTotal = Number(data.valorTotal || 0)

  return (
    <DashboardMetricCard
      title="Ticket Médio"
      icon={DollarSign}
      iconColorClass="text-emerald-600"
      value={formatCurrency(ticketMedio)}
      subtitle={mes && ano ? `Ticket médio em ${mes}/${ano}` : "Ticket médio"}
      highlights={[
        {
          label: "Oportunidades ganhas:",
          value: totalGanhas.toLocaleString("pt-BR"),
          emphasize: false
        },
        {
          label: "Valor total:",
          value: formatCurrency(valorTotal),
          emphasize: true
        }
      ]}
      variant="colored"
    />
  )
}

