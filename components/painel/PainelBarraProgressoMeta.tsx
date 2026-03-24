'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import { Target } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthSistema } from '@/hooks/use-auth-sistema'
import { cn } from '@/lib/utils'

// Lazy load do componente de celebração (só carrega quando necessário)
const MetaCelebration = dynamic(() => import('./MetaCelebration'), { ssr: false })

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

        // Buscar meta do período (suporta range multi-mês)
        const paramsMeta = new URLSearchParams()
        paramsMeta.append('periodo_inicio', periodoInicio)
        paramsMeta.append('periodo_fim', periodoFim)

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
          // Usar valor_ganhas (somente ganhas) e não valor_total (todas as oportunidades)
          setValorAtual(Number(dataGanhos.data.valor_ganhas ?? dataGanhos.data.valor_total ?? 0))
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

  // Percentual limitado a 100% para a barra visual
  const percentualMeta = useMemo(() => {
    if (meta === 0) return 0
    return Math.min(100, (valorAtual / meta) * 100)
  }, [valorAtual, meta])

  // Percentual real (pode ser > 100%)
  const percentualReal = useMemo(() => {
    if (meta === 0) return 0
    return (valorAtual / meta) * 100
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
    // Usar percentualReal para calcular desvio correto quando meta é ultrapassada
    const deviationPpRaw = percentualReal - expectedPercent
    const deviationPp = Math.round(deviationPpRaw * 10) / 10

    // Projeção (mantendo ritmo atual): percentual atual / fração de tempo transcorrida
    const projectedPercent =
      elapsed > 0 ? Math.max(0, Math.min(200, (percentualReal / elapsed))) : null
    const projectedValor =
      elapsed > 0 ? Math.max(0, Math.min(meta * 2, (valorAtual / elapsed))) : null

    // Cores por ritmo (mesma escala do card)
    // Dentro de -5pp = ok; -5pp a -15pp = atenção; abaixo disso = fora do ritmo
    let fillClass = "bg-gradient-to-r from-green-500 to-green-600"
    let statusLabel: string | null = null

    if (percentualReal >= 100) {
      // Meta batida - usar verde vibrante para celebrar
      fillClass = "bg-gradient-to-r from-green-400 to-emerald-500"
      statusLabel = "Meta batida! 🎉"
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
  }, [periodoInicio, periodoFim, meta, percentualMeta, percentualReal, valorAtual])

  if (authLoading || !user) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <Skeleton className="h-8 w-full bg-gray-200" />
      </div>
    )
  }

  if (meta === 0 && valorAtual === 0) {
    return null
  }

  // Calcular se meta foi batida (para celebração)
  // Suporta ?testCelebration=true na URL para testar
  const isTestMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('testCelebration') === 'true'
  const isMetaBatida = isTestMode || (meta > 0 && valorAtual >= meta)

  return (
    <>
      {/* Componente de celebração */}
      <MetaCelebration
        isMetaBatida={isMetaBatida}
        percentualAtingido={percentualMeta}
        valorAtingido={valorAtual}
        meta={meta}
        periodoLabel="do período"
      />

      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">
        {meta > 0 ? (
          <div className="flex items-center gap-4">
            {/* Label */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Target className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Meta do Período
              </span>
              {funilId && (
                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                  sem filtro de funil
                </span>
              )}
            </div>

            {/* Barra de progresso */}
            <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden flex-1">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-700 rounded-full flex items-center justify-end pr-2.5",
                  smartMeta.fillClass
                )}
                style={{ width: `${Math.max(2, Math.min(100, percentualMeta))}%` }}
              >
                {percentualMeta > 15 && (
                  <span className="text-white text-[11px] font-bold drop-shadow-sm">
                    {percentualReal.toFixed(1)}%
                  </span>
                )}
              </div>
              {percentualMeta <= 15 && percentualMeta > 0 && (
                <div className="absolute inset-0 flex items-center pl-2.5">
                  <span className="text-gray-500 text-[11px] font-bold">{percentualReal.toFixed(1)}%</span>
                </div>
              )}
              {/* Marcador esperado */}
              {smartMeta.expectedMarkerPercent !== null && percentualMeta < 100 && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-gray-400/60 z-10"
                  style={{ left: `${smartMeta.expectedMarkerPercent}%` }}
                  title={`Esperado: ${smartMeta.expectedMarkerPercent.toFixed(1)}%`}
                />
              )}
              {/* Marcador de projeção */}
              {smartMeta.projectedPercent !== null && smartMeta.projectedValor !== null && percentualMeta < 100 && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-blue-400 z-10"
                  style={{ left: `${Math.min(100, smartMeta.projectedPercent)}%` }}
                  title={`Projeção: ${formatCurrency(smartMeta.projectedValor)}`}
                />
              )}
            </div>

            {/* Valores + badge + status */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Atingido</div>
                <div className="text-sm font-black text-gray-900 leading-tight">{formatCurrency(valorAtual)}</div>
              </div>
              <div className="text-gray-200 text-lg font-thin">/</div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Meta</div>
                <div className="text-sm font-bold text-gray-500 leading-tight">{formatCurrency(meta)}</div>
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-lg text-sm font-black border",
                percentualReal >= 100
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : smartMeta.deviationPp !== null && smartMeta.deviationPp < -15
                    ? "bg-red-50 border-red-200 text-red-600"
                    : smartMeta.deviationPp !== null && smartMeta.deviationPp < -5
                      ? "bg-amber-50 border-amber-200 text-amber-600"
                      : "bg-green-50 border-green-200 text-green-700"
              )}>
                {percentualReal.toFixed(1)}%
              </div>
              {smartMeta.statusLabel && (
                <div className="hidden lg:flex flex-col items-end shrink-0 min-w-[110px]">
                  <span className={cn(
                    "text-xs font-semibold whitespace-nowrap",
                    smartMeta.deviationPp !== null && smartMeta.deviationPp < -15 ? "text-red-500"
                    : smartMeta.deviationPp !== null && smartMeta.deviationPp < -5 ? "text-amber-500"
                    : percentualReal >= 100 ? "text-emerald-600"
                    : "text-green-600"
                  )}>
                    {smartMeta.statusLabel}
                  </span>
                  {smartMeta.deviationPp !== null && percentualReal < 100 && (
                    <span className="text-[10px] text-gray-400">
                      desvio <span className={cn(
                        "font-bold",
                        smartMeta.deviationPp >= -5 ? "text-green-600"
                        : smartMeta.deviationPp >= -15 ? "text-amber-500"
                        : "text-red-500"
                      )}>
                        {smartMeta.deviationPp >= 0 ? '+' : ''}{smartMeta.deviationPp.toFixed(1)}pp
                      </span>
                    </span>
                  )}
                </div>
              )}
              {smartMeta.projectedPercent !== null && smartMeta.projectedValor !== null && percentualMeta < 100 && (
                <div className="hidden lg:flex items-center gap-1.5 shrink-0 border-l border-gray-100 pl-3">
                  <div className="w-2.5 h-[2px] bg-blue-400 rounded" />
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">Projeção</div>
                    <div className="text-xs font-bold text-blue-600">{formatCurrency(smartMeta.projectedValor)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Target className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Vendas do Período</span>
            <span className="text-base font-black text-gray-900">{formatCurrency(valorAtual)}</span>
            <span className="text-[11px] text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">Sem meta cadastrada</span>
          </div>
        )}
      </div>
    </>
  )
}

export default memo(PainelBarraProgressoMeta)

