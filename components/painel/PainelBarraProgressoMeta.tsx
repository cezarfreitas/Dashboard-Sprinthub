'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { Target } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthSistema } from '@/hooks/use-auth-sistema'
import { cn } from '@/lib/utils'

interface PainelBarraProgressoMetaProps {
  unidadesIds?: number[]
  periodoInicio?: string
  periodoFim?: string
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function PainelBarraProgressoMeta({
  unidadesIds = [],
  periodoInicio,
  periodoFim
}: PainelBarraProgressoMetaProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [valorAtual, setValorAtual] = useState(0)
  const [meta, setMeta] = useState(0)

  const unidadesIdsKey = useMemo(() => {
    return unidadesIds.length > 0 ? unidadesIds.sort().join(',') : ''
  }, [unidadesIds])

  const periodoKey = useMemo(() => {
    return `${periodoInicio || ''}-${periodoFim || ''}`
  }, [periodoInicio, periodoFim])

  useEffect(() => {
    if (authLoading || !user || !periodoInicio || !periodoFim) {
      setValorAtual(0)
      setMeta(0)
      setLoading(false)
      return
    }

    const fetchMetaData = async () => {
      try {
        setLoading(true)

        // Buscar ganhos do período
        const paramsGanhos = new URLSearchParams()
        paramsGanhos.append('status', 'won')
        paramsGanhos.append('gain_date_start', periodoInicio)
        paramsGanhos.append('gain_date_end', periodoFim)
        
        if (unidadesIds.length > 0) {
          paramsGanhos.append('unidade_id', unidadesIds.join(','))
        }

        // Buscar meta do período
        const mesMeta = new Date(periodoInicio + 'T00:00:00').getMonth() + 1
        const anoMeta = new Date(periodoInicio + 'T00:00:00').getFullYear()
        
        const paramsMeta = new URLSearchParams()
        paramsMeta.append('mes', String(mesMeta))
        paramsMeta.append('ano', String(anoMeta))
        
        if (unidadesIds.length > 0) {
          paramsMeta.append('unidade_id', unidadesIds.join(','))
        }

        const [responseGanhos, responseMeta] = await Promise.all([
          fetch(`/api/oportunidades/stats?${paramsGanhos.toString()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          }),
          fetch(`/api/meta/stats?${paramsMeta.toString()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          })
        ])

        if (!responseGanhos.ok || !responseMeta.ok) {
          throw new Error('Erro ao buscar dados')
        }

        const [dataGanhos, dataMeta] = await Promise.all([
          responseGanhos.json(),
          responseMeta.json()
        ])

        if (dataGanhos.success && dataGanhos.data) {
          setValorAtual(Number(dataGanhos.data.valor_total || 0))
        } else {
          setValorAtual(0)
        }

        if (dataMeta.success && dataMeta.data) {
          setMeta(Number(dataMeta.data.meta_valor || 0))
        } else {
          setMeta(0)
        }
      } catch (error) {
        setValorAtual(0)
        setMeta(0)
      } finally {
        setLoading(false)
      }
    }

    fetchMetaData()
  }, [authLoading, user, unidadesIdsKey, periodoKey])

  const percentualMeta = useMemo(() => {
    if (meta === 0) return 0
    return Math.min(100, (valorAtual / meta) * 100)
  }, [valorAtual, meta])

  if (authLoading || !user) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <Skeleton className="h-8 w-full bg-gray-800" />
      </div>
    )
  }

  if (meta === 0) {
    return null
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Target className="w-5 h-5 text-white/90" />
          <span className="text-sm font-semibold text-white/90 whitespace-nowrap">Meta do Período:</span>
        </div>
        
        {/* Barra de Progresso */}
        <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden flex-1">
          <div 
            className={cn(
              "absolute inset-y-0 left-0 transition-all duration-700 rounded-full flex items-center justify-end pr-3",
              percentualMeta >= 100 
                ? "bg-gradient-to-r from-yellow-500 to-yellow-600" 
                : "bg-gradient-to-r from-green-500 to-green-600"
            )}
            style={{ width: `${Math.min(100, percentualMeta)}%` }}
          >
            {percentualMeta > 15 && (
              <span className="text-white text-xs font-bold">
                {percentualMeta.toFixed(1)}%
              </span>
            )}
          </div>
          {percentualMeta <= 15 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-400 text-xs font-bold">
                {percentualMeta.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <span className="text-xs text-white/70">Atingido: </span>
            <span className="text-sm font-bold text-white">{formatCurrency(valorAtual)}</span>
          </div>
          <div className="text-white/30">/</div>
          <div className="text-right">
            <span className="text-xs text-white/70">Meta: </span>
            <span className="text-sm font-bold text-white">{formatCurrency(meta)}</span>
          </div>
          <div className="text-right min-w-[60px]">
            <span className={cn(
              "text-sm font-bold",
              percentualMeta >= 100 ? "text-yellow-400" : "text-green-400"
            )}>
              {percentualMeta.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(PainelBarraProgressoMeta)

