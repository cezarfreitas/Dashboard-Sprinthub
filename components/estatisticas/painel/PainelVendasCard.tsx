'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TrendingUp } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PainelVendasCardProps {
  unidadesIds?: number[]
  periodoInicio?: string
  periodoFim?: string
}

function PainelVendasCard({ 
  unidadesIds = [],
  periodoInicio,
  periodoFim
}: PainelVendasCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [vendasTotal, setVendasTotal] = useState(0)
  const [vendasValorTotal, setVendasValorTotal] = useState(0)

  // Memoizar a formatação de moeda
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  // Memoizar a string de IDs para evitar recriação desnecessária
  const unidadesIdsKey = useMemo(() => {
    return unidadesIds.length > 0 ? unidadesIds.sort().join(',') : ''
  }, [unidadesIds])

  // Memoizar período para evitar recriação desnecessária
  const periodoKey = useMemo(() => {
    return `${periodoInicio || ''}-${periodoFim || ''}`
  }, [periodoInicio, periodoFim])

  // Função para buscar dados usando a nova API unificada
  const fetchVendasData = useCallback(async () => {
    if (authLoading || !user) {
      setVendasTotal(0)
      setVendasValorTotal(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Vendas = Oportunidades Ganhas (mesmo conceito)
      const params = new URLSearchParams()
      params.append('status', 'won')
      
      // Adicionar filtro de unidades se houver
      if (unidadesIds.length > 0) {
        params.append('unidade_id', unidadesIds.join(','))
      }
      
      // Adicionar filtro de data de ganho (gain_date) baseado no período
      if (periodoInicio && periodoFim) {
        params.append('gain_date_start', periodoInicio)
        params.append('gain_date_end', periodoFim)
      }
      
      const url = `/api/oportunidades/stats?${params.toString()}`
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        const totalVendas = Number(
          result.data.total_ganhas || 
          result.data.total || 
          result.data.stats?.[0]?.total_ganhas || 
          result.data.stats?.[0]?.total || 
          0
        )
        const valorVendas = Number(
          result.data.valor_ganhas || 
          result.data.valor_total || 
          result.data.stats?.[0]?.valor_ganhas || 
          result.data.stats?.[0]?.valor_total || 
          0
        )
        
        setVendasTotal(totalVendas)
        setVendasValorTotal(valorVendas)
      } else {
        setVendasTotal(0)
        setVendasValorTotal(0)
      }
    } catch (error) {
      setVendasTotal(0)
      setVendasValorTotal(0)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, unidadesIdsKey, periodoKey])

  useEffect(() => {
    fetchVendasData()
  }, [fetchVendasData])

  // Memoizar valores formatados
  const totalFormatado = useMemo(() => {
    return vendasTotal.toLocaleString('pt-BR')
  }, [vendasTotal])

  const valorTotalFormatado = useMemo(() => {
    return formatCurrency(vendasValorTotal)
  }, [vendasValorTotal, formatCurrency])

  // Não renderizar nada se não estiver autenticado
  if (authLoading || !user) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 rounded-2xl">
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              VENDAS
            </span>
          </div>
          
          {/* Valor principal */}
          <p className="text-white text-3xl font-black leading-none">
            {loading ? '...' : valorTotalFormatado}
          </p>

          <Separator className="bg-emerald-500/30" />

          {/* Informações secundárias */}
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total de Vendas:</span>
              <span className="text-white font-semibold">
                {loading ? '...' : totalFormatado}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Memoizar componente para evitar re-renders desnecessários
export default memo(PainelVendasCard)

