"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { DashboardMetricCard } from '@/components/dashboard-metric-card'
import { RefreshCw, DollarSign } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface GanhosData {
  totalOportunidades?: number
  totalValor?: number
  ganhasCriadasMes?: number
  ganhasCriadasAnterior?: number
}

interface Periodo {
  mes: number
  ano: number
}

interface OportunidadesGanhasCardProps {
  refreshInterval?: number
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function OportunidadesGanhasCard({ 
  refreshInterval = 30000,
  mes,
  ano,
  vendedorId,
  unidadeId
}: OportunidadesGanhasCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [data, setData] = useState<GanhosData | null>(null)
  const [periodo, setPeriodo] = useState<Periodo | null>(null)
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
      
      // Usar nova API /api/oportunidades/stats
      const params = new URLSearchParams()
      params.append('status', 'won')
      
      if (vendedorId) {
        params.append('user_id', vendedorId.toString())
      }
      if (unidadeId) {
        params.append('unidade_id', unidadeId.toString())
      }
      
      // Filtrar por data de ganho
      const primeiroDiaMes = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
      const ultimoDiaMes = new Date(ano, mes, 0).toISOString().split('T')[0]
      params.append('gain_date_start', primeiroDiaMes)
      params.append('gain_date_end', ultimoDiaMes)
      
      const response = await fetch(`/api/oportunidades/stats?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const totalGanhas = Number(result.data.total_ganhas || 0)
        const valorGanhas = Number(result.data.valor_ganhas || 0)
        
        // Buscar ganhas criadas no mês (criadas e ganhas no mesmo mês)
        let ganhasCriadasMes = 0
        const paramsCriadasMes = new URLSearchParams(params)
        paramsCriadasMes.append('created_date_start', primeiroDiaMes)
        paramsCriadasMes.append('created_date_end', ultimoDiaMes)
        
        const responseCriadasMes = await fetch(`/api/oportunidades/stats?${paramsCriadasMes.toString()}`)
        if (responseCriadasMes.ok) {
          const resultCriadasMes = await responseCriadasMes.json()
          if (resultCriadasMes.success && resultCriadasMes.data) {
            ganhasCriadasMes = Number(resultCriadasMes.data.total_ganhas || 0)
          }
        }
        
        const safeData: GanhosData = {
          totalOportunidades: totalGanhas,
          totalValor: valorGanhas,
          ganhasCriadasMes,
          ganhasCriadasAnterior: totalGanhas - ganhasCriadasMes
        }
        setData(safeData)
        setPeriodo({ mes, ano })
      } else {
        setError(result.message || 'Erro ao carregar dados')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Só fazer requisição se estiver autenticado
    if (!authLoading && user) {
      fetchData()
      
      if (refreshInterval > 0) {
        const interval = setInterval(fetchData, refreshInterval)
        return () => clearInterval(interval)
      }
    } else if (!authLoading && !user) {
      // Se não estiver autenticado, limpar dados
      setData(null)
      setLoading(false)
    }
  }, [authLoading, user, refreshInterval, mes, ano, vendedorId, unidadeId])

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

  // Não renderizar nada se não estiver autenticado
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

  // Garantir valores numéricos válidos (default 0 se undefined/null)
  const totalOportunidades = Number(data?.totalOportunidades ?? 0)
  const totalValor = Number(data?.totalValor ?? 0)
  const ganhasCriadasMes = Number(data?.ganhasCriadasMes ?? 0)
  const ganhasCriadasAnterior = Number(data?.ganhasCriadasAnterior ?? 0)

  return (
    <DashboardMetricCard
      title="Ganhos"
      icon={DollarSign}
      iconColorClass="text-emerald-600"
      value={formatCurrency(totalValor)}
      subtitle={
        periodo ? `Ganhas em ${periodo.mes}/${periodo.ano}` : "Ganhos recentes"
      }
      highlights={[
        ...(totalOportunidades > 0 ? [
          {
            label: "Total de oportunidades:",
            value: totalOportunidades.toLocaleString("pt-BR"),
            emphasize: false
          }
        ] : []),
        ...(ganhasCriadasMes > 0 || ganhasCriadasAnterior > 0 ? [
          {
            label: "Ganhas e criadas no mês:",
            value: ganhasCriadasMes.toLocaleString("pt-BR"),
            emphasize: true
          },
          {
            label: "Ganhas no mês, criadas antes:",
            value: ganhasCriadasAnterior.toLocaleString("pt-BR"),
            emphasize: true
          }
        ] : [])
      ]}
      variant="colored"
    />
  )
}

