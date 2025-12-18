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
  funilId?: string
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
  periodoFim,
  funilId
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

  const funilKey = useMemo(() => funilId || '', [funilId])

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
        
        if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
          paramsGanhos.append('funil_id', String(funilId))
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
  }, [authLoading, user, unidadesIdsKey, periodoKey, funilKey])

  const percentualMeta = useMemo(() => {
    if (meta === 0) return 0
    return Math.min(100, (valorAtual / meta) * 100)
  }, [valorAtual, meta])

  const smartMeta = useMemo(() => {
    if (!periodoInicio || !periodoFim || meta <= 0) {
      return {
        expectedPercent: null as number | null,
        deviationPp: null as number | null,
        fillClass: "bg-gradient-to-r from-green-500 to-green-600",
        statusLabel: null as string | null,
        expectedMarkerPercent: null as number | null,
        projectedPercent: null as number | null,
        projectedValor: null as number | null,
      }
    }

    const start = new Date(`${periodoInicio}T00:00:00`)
    const end = new Date(`${periodoFim}T23:59:59`)
    const now = new Date()

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      return {
        expectedPercent: null,
        deviationPp: null,
        fillClass: "bg-gradient-to-r from-green-500 to-green-600",
        statusLabel: null,
        expectedMarkerPercent: null,
        projectedPercent: null,
        projectedValor: null,
      }
    }

    const rangeMs = end.getTime() - start.getTime()
    const clampedNowMs = Math.min(end.getTime(), Math.max(start.getTime(), now.getTime()))
    const elapsed = (clampedNowMs - start.getTime()) / rangeMs

    const expectedPercent = Math.min(100, Math.max(0, elapsed * 100))
    const deviationPpRaw = percentualMeta - expectedPercent
    const deviationPp = Math.round(deviationPpRaw * 10) / 10

    // Projeção (mantendo ritmo atual): percentual atual / fração de tempo transcorrida
    const projectedPercent =
      elapsed > 0 ? Math.max(0, Math.min(200, (percentualMeta / elapsed))) : null
    const projectedValor =
      elapsed > 0 ? Math.max(0, Math.min(meta * 2, (valorAtual / elapsed))) : null

    // Cores por ritmo (mesma escala do card)
    // Dentro de -5pp = ok; -5pp a -15pp = atenção; abaixo disso = fora do ritmo
    let fillClass = "bg-gradient-to-r from-green-500 to-green-600"
    let statusLabel: string | null = null

    if (percentualMeta >= 100) {
      fillClass = "bg-gradient-to-r from-yellow-500 to-yellow-600"
      statusLabel = "Meta batida"
    } else if (deviationPp >= -5) {
      fillClass = "bg-gradient-to-r from-green-500 to-green-600"
      statusLabel = deviationPp >= 0 ? "Acima do ritmo" : "No ritmo"
    } else if (deviationPp >= -15) {
      fillClass = "bg-gradient-to-r from-yellow-300 to-amber-400"
      statusLabel = "Um pouco abaixo"
    } else {
      fillClass = "bg-gradient-to-r from-red-400 to-rose-500"
      statusLabel = "Fora do ritmo"
    }

    return {
      expectedPercent,
      deviationPp,
      fillClass,
      statusLabel,
      expectedMarkerPercent: expectedPercent,
      projectedPercent,
      projectedValor,
    }
  }, [periodoInicio, periodoFim, meta, percentualMeta, valorAtual])

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

  if (meta === 0 && valorAtual === 0) {
    return null
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Target className="w-5 h-5 text-white/90" />
          <span className="text-sm font-semibold text-white/90 whitespace-nowrap">
            {meta === 0 ? 'Vendas do Período:' : 'Meta do Período:'}
          </span>
        </div>
        
        {meta > 0 ? (
          <>
            {/* Barra de Progresso */}
            <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden flex-1">
          <div 
            className={cn(
              "absolute inset-y-0 left-0 transition-all duration-700 rounded-full flex items-center justify-end pr-3",
              smartMeta.fillClass
            )}
            style={{ width: `${Math.max(3, Math.min(100, percentualMeta))}%` }}
          >
            {percentualMeta > 15 && (
              <span className="text-white text-xs font-bold">
                {percentualMeta.toFixed(1)}%
              </span>
            )}
          </div>

          {/* Marcador do esperado (ritmo) */}
          {smartMeta.expectedMarkerPercent !== null && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white/70"
              style={{ left: `calc(${smartMeta.expectedMarkerPercent}% - 1px)` }}
              title={`Esperado hoje: ${smartMeta.expectedMarkerPercent.toFixed(1)}%`}
            />
          )}

          {percentualMeta <= 15 && percentualMeta > 0 && (
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

          {(smartMeta.statusLabel || smartMeta.deviationPp !== null || smartMeta.projectedPercent !== null) && (
            <div className="hidden lg:flex flex-col items-end gap-0.5 min-w-[140px]">
              {smartMeta.statusLabel && (
                <span className={cn(
                  "text-[11px] font-semibold",
                  smartMeta.deviationPp !== null && smartMeta.deviationPp < -15
                    ? "text-rose-300"
                    : smartMeta.deviationPp !== null && smartMeta.deviationPp < -5
                      ? "text-amber-200"
                      : percentualMeta >= 100
                        ? "text-yellow-300"
                        : "text-emerald-200"
                )}>
                  {smartMeta.statusLabel}
                  {smartMeta.deviationPp !== null && percentualMeta < 100 && (
                    <span className="text-white/60 font-bold">
                      {' '}({smartMeta.deviationPp >= 0 ? '+' : ''}{smartMeta.deviationPp.toFixed(1)}pp)
                    </span>
                  )}
                </span>
              )}

              {smartMeta.projectedPercent !== null && smartMeta.projectedValor !== null && percentualMeta < 100 && (
                <span className="text-[11px] text-white/75">
                  Proj.: <span className="font-bold text-white">{Math.min(200, smartMeta.projectedPercent).toFixed(0)}%</span>
                  {' '}({formatCurrency(smartMeta.projectedValor)})
                </span>
              )}
            </div>
          )}
        </div>
          </>
        ) : (
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <span className="text-xs text-white/70">Total vendido: </span>
              <span className="text-sm font-bold text-white">{formatCurrency(valorAtual)}</span>
            </div>
            <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-md">
              <span className="text-xs text-orange-400">Sem meta cadastrada</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(PainelBarraProgressoMeta)

