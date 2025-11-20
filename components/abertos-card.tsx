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

interface AbertosCardProps {
  refreshInterval?: number
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function AbertosCard({ 
  refreshInterval = 30000,
  mes,
  ano,
  vendedorId,
  unidadeId
}: AbertosCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [data, setData] = useState<AbertosData | null>(null)
  const [periodo, setPeriodo] = useState<Periodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    // Não fazer requisição se não estiver autenticado
    if (authLoading || !user) {
      return
    }
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (mes) params.append('mes', mes.toString())
      if (ano) params.append('ano', ano.toString())
      if (vendedorId) params.append('vendedor_id', vendedorId.toString())
      if (unidadeId) params.append('unidade_id', unidadeId.toString())
      
      const url = `/api/oportunidades/abertos${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      
      // Verificar se a resposta é JSON válida
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Resposta não é JSON:', text.substring(0, 200))
        throw new Error(`Resposta inválida da API (status: ${response.status})`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // Garantir que os dados tenham valores padrão seguros
        const safeData: AbertosData = {
          abertasMesAtual: result.data?.abertasMesAtual ?? 0,
          abertasMesesAnteriores: result.data?.abertasMesesAnteriores ?? 0,
          totalOportunidades: result.data?.totalOportunidades ?? 0
        }
        setData(safeData)
        setPeriodo(result.periodo)
      } else {
        setError(result.message || 'Erro ao carregar dados')
      }
    } catch (err) {
      setError('Erro de conexão')
      console.error('Erro ao buscar oportunidades abertas:', err)
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
