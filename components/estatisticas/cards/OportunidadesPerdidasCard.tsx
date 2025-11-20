"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { DashboardMetricCard } from '@/components/dashboard-metric-card'
import { RefreshCw, TrendingDown } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PerdidosData {
  totalOportunidades?: number
  valorTotalPerdido?: number
  perdidasCriadasMes?: number
  perdidasCriadasAnterior?: number
}

interface Periodo {
  mes: number
  ano: number
}

interface OportunidadesPerdidasCardProps {
  refreshInterval?: number
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function OportunidadesPerdidasCard({ 
  refreshInterval = 30000,
  mes,
  ano,
  vendedorId,
  unidadeId
}: OportunidadesPerdidasCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [data, setData] = useState<PerdidosData | null>(null)
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
      params.append('status', 'lost')
      
      if (vendedorId) {
        params.append('user_id', vendedorId.toString())
      }
      if (unidadeId) {
        params.append('unidade_id', unidadeId.toString())
      }
      
      // Filtrar por data de perda
      const primeiroDiaMes = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
      const ultimoDiaMes = new Date(ano, mes, 0).toISOString().split('T')[0]
      params.append('lost_date_start', primeiroDiaMes)
      params.append('lost_date_end', ultimoDiaMes)
      
      const response = await fetch(`/api/oportunidades/stats?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const totalPerdidas = Number(result.data.total_perdidas || 0)
        const valorPerdidas = Number(result.data.valor_perdidas || 0)
        
        // Buscar perdidas criadas no mês (criadas e perdidas no mesmo mês)
        let perdidasCriadasMes = 0
        const paramsCriadasMes = new URLSearchParams(params)
        paramsCriadasMes.append('created_date_start', primeiroDiaMes)
        paramsCriadasMes.append('created_date_end', ultimoDiaMes)
        
        const responseCriadasMes = await fetch(`/api/oportunidades/stats?${paramsCriadasMes.toString()}`)
        if (responseCriadasMes.ok) {
          const resultCriadasMes = await responseCriadasMes.json()
          if (resultCriadasMes.success && resultCriadasMes.data) {
            perdidasCriadasMes = Number(resultCriadasMes.data.total_perdidas || 0)
          }
        }
        
        const safeData: PerdidosData = {
          totalOportunidades: totalPerdidas,
          valorTotalPerdido: valorPerdidas,
          perdidasCriadasMes,
          perdidasCriadasAnterior: totalPerdidas - perdidasCriadasMes
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


  const LoadingState = () => (
    <Card className="border border-slate-200 bg-white p-4">
      <div className="flex animate-pulse flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-200" />
          <div className="h-4 w-24 rounded bg-slate-200" />
              </div>
        <div className="h-8 w-16 rounded bg-slate-200" />
        <div className="h-3 w-36 rounded bg-slate-200" />
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
          <div className="flex justify-between">
            <div className="h-3 w-36 rounded bg-slate-200" />
            <div className="h-3 w-8 rounded bg-slate-200" />
              </div>
          <div className="flex justify-between">
            <div className="h-3 w-40 rounded bg-slate-200" />
            <div className="h-3 w-8 rounded bg-slate-200" />
          </div>
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
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm font-medium">Perdidos</span>
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
  const valorTotalPerdido = Number(data?.valorTotalPerdido ?? 0)
  const perdidasCriadasMes = Number(data?.perdidasCriadasMes ?? 0)
  const perdidasCriadasAnterior = Number(data?.perdidasCriadasAnterior ?? 0)

  // Formatar valor monetário
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <DashboardMetricCard
      title="Perdidos"
      icon={TrendingDown}
      iconColorClass="text-red-600"
      value={totalOportunidades.toLocaleString("pt-BR")}
      subtitle={
        periodo ? `Perdidas em ${periodo.mes}/${periodo.ano}` : "Perdidos recentes"
      }
      highlights={[
        ...(perdidasCriadasMes > 0 || perdidasCriadasAnterior > 0 ? [
          {
            label: "Perdidos ou criados no mês:",
            value: perdidasCriadasMes.toLocaleString("pt-BR"),
            emphasize: true
          },
          {
            label: "Perdidos no mês, criados antes:",
            value: perdidasCriadasAnterior.toLocaleString("pt-BR"),
            emphasize: true
          }
        ] : []),
        ...(valorTotalPerdido > 0 ? [
          {
            label: "Valor total perdido:",
            value: formatCurrency(valorTotalPerdido),
            emphasize: false
          }
        ] : [])
      ]}
      variant="colored"
    />
  )
}

