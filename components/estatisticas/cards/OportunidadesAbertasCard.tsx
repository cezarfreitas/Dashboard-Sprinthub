"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { DashboardMetricCard } from '@/components/dashboard-metric-card'
import { RefreshCw, Clock } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface AbertosData {
  abertasMesAtual?: number
  abertasMesesAnteriores?: number
  totalOportunidades?: number
}

interface Periodo {
  mes: number
  ano: number
}

interface OportunidadesAbertasCardProps {
  refreshInterval?: number
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function OportunidadesAbertasCard({ 
  refreshInterval = 30000,
  mes,
  ano,
  vendedorId,
  unidadeId
}: OportunidadesAbertasCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [data, setData] = useState<AbertosData | null>(null)
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
      
      // Usar nova API /api/oportunidades/stats
      const params = new URLSearchParams()
      params.append('status', 'open')
      
      if (vendedorId) {
        params.append('user_id', vendedorId.toString())
      }
      if (unidadeId) {
        params.append('unidade_id', unidadeId.toString())
      }
      
      // Buscar total de abertas (sem filtro de data)
      const response = await fetch(`/api/oportunidades/stats?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const totalAbertas = Number(result.data.total_abertas || 0)
        const valorAbertas = Number(result.data.valor_abertas || 0)
        
        // Se houver filtro de mês/ano, buscar também abertas criadas no período
        let abertasMesAtual = 0
        if (mes && ano) {
          const primeiroDiaMes = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
          const ultimoDiaMes = new Date(ano, mes, 0).toISOString().split('T')[0]
          
          const paramsMes = new URLSearchParams(params)
          paramsMes.append('created_date_start', primeiroDiaMes)
          paramsMes.append('created_date_end', ultimoDiaMes)
          
          const responseMes = await fetch(`/api/oportunidades/stats?${paramsMes.toString()}`)
          if (responseMes.ok) {
            const resultMes = await responseMes.json()
            if (resultMes.success && resultMes.data) {
              abertasMesAtual = Number(resultMes.data.total_abertas || 0)
            }
          }
        }
        
        const safeData: AbertosData = {
          abertasMesAtual,
          abertasMesesAnteriores: totalAbertas - abertasMesAtual,
          totalOportunidades: totalAbertas
        }
        setData(safeData)
        if (mes && ano) {
          setPeriodo({ mes, ano })
        }
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
          <div className="h-4 w-20 rounded bg-slate-200" />
              </div>
        <div className="h-8 w-20 rounded bg-slate-200" />
        <div className="h-3 w-48 rounded bg-slate-200" />
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
          <div className="flex justify-between">
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="h-3 w-8 rounded bg-slate-200" />
              </div>
          <div className="flex justify-between">
            <div className="h-3 w-32 rounded bg-slate-200" />
            <div className="h-3 w-12 rounded bg-slate-200" />
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
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Abertos</span>
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
  const abertasMesAtual = Number(data?.abertasMesAtual ?? 0)
  const abertasMesesAnteriores = Number(data?.abertasMesesAnteriores ?? 0)

  return (
    <DashboardMetricCard
      title="Abertos"
      icon={Clock}
      iconColorClass="text-amber-600"
      value={totalOportunidades.toLocaleString("pt-BR")}
      subtitle="Total de oportunidades abertas"
      highlights={[
        {
          label: "Criadas este mês:",
          value: abertasMesAtual.toLocaleString("pt-BR"),
          emphasize: true
        },
        {
          label: "Criadas anteriormente:",
          value: abertasMesesAnteriores.toLocaleString("pt-BR"),
          emphasize: true
        }
      ]}
      variant="colored"
    />
  )
}

