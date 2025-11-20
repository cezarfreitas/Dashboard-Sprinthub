"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { DashboardMetricCard } from '@/components/dashboard-metric-card'
import { Percent } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface TaxaConversaoData {
  taxaConversao?: number
  totalCriadas?: number
  totalGanhas?: number
}

interface TaxaConversaoCardProps {
  refreshInterval?: number
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function TaxaConversaoCard({ 
  refreshInterval = 30000,
  mes,
  ano,
  vendedorId,
  unidadeId
}: TaxaConversaoCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [data, setData] = useState<TaxaConversaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      if (vendedorId) {
        params.append('user_id', vendedorId.toString())
      }
      if (unidadeId) {
        params.append('unidade_id', unidadeId.toString())
      }
      
      const primeiroDiaMes = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
      const ultimoDiaMes = new Date(ano, mes, 0).toISOString().split('T')[0]
      
      // Buscar oportunidades criadas no período
      const paramsCriadas = new URLSearchParams(params)
      paramsCriadas.append('created_date_start', primeiroDiaMes)
      paramsCriadas.append('created_date_end', ultimoDiaMes)
      
      // Buscar oportunidades ganhas no período
      const paramsGanhas = new URLSearchParams(params)
      paramsGanhas.append('status', 'won')
      paramsGanhas.append('gain_date_start', primeiroDiaMes)
      paramsGanhas.append('gain_date_end', ultimoDiaMes)
      
      const [criadasRes, ganhasRes] = await Promise.all([
        fetch(`/api/oportunidades/stats?${paramsCriadas.toString()}`),
        fetch(`/api/oportunidades/stats?${paramsGanhas.toString()}`)
      ])
      
      if (!criadasRes.ok || !ganhasRes.ok) {
        throw new Error('Erro ao buscar dados')
      }
      
      const [criadasData, ganhasData] = await Promise.all([
        criadasRes.json(),
        ganhasRes.json()
      ])
      
      if (criadasData.success && ganhasData.success) {
        const totalCriadas = Number(criadasData.data?.total || 0)
        const totalGanhas = Number(ganhasData.data?.total_ganhas || 0)
        const taxaConversao = totalCriadas > 0 ? (totalGanhas / totalCriadas) * 100 : 0
        
        setData({
          taxaConversao,
          totalCriadas,
          totalGanhas
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
          <div className="h-4 w-32 rounded bg-slate-200" />
        </div>
        <div className="h-8 w-20 rounded bg-slate-200" />
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
            <Percent className="h-4 w-4" />
            <span className="text-sm font-medium">Taxa de Conversão</span>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const taxaConversao = Number(data.taxaConversao || 0)
  const totalCriadas = Number(data.totalCriadas || 0)
  const totalGanhas = Number(data.totalGanhas || 0)

  return (
    <DashboardMetricCard
      title="Taxa de Conversão"
      icon={Percent}
      iconColorClass="text-purple-600"
      value={`${taxaConversao.toFixed(1)}%`}
      subtitle={mes && ano ? `Conversão em ${mes}/${ano}` : "Taxa de conversão"}
      highlights={[
        {
          label: "Oportunidades criadas:",
          value: totalCriadas.toLocaleString("pt-BR"),
          emphasize: false
        },
        {
          label: "Oportunidades ganhas:",
          value: totalGanhas.toLocaleString("pt-BR"),
          emphasize: true
        }
      ]}
      variant="colored"
    />
  )
}

