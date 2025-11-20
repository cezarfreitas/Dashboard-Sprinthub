'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PainelOportunidadesGanhasCardProps {
  unidadesIds?: number[]
  periodoInicio?: string
  periodoFim?: string
}

function PainelOportunidadesGanhasCard({ 
  unidadesIds = [],
  periodoInicio,
  periodoFim
}: PainelOportunidadesGanhasCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [ganhasTotal, setGanhasTotal] = useState(0)
  const [ganhasValorTotal, setGanhasValorTotal] = useState(0)
  const [ganhasPeriodo, setGanhasPeriodo] = useState<{ total: number; valor: number } | null>(null)
  const [ganhasForaPeriodo, setGanhasForaPeriodo] = useState<{ total: number; valor: number } | null>(null)

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  const unidadesIdsKey = useMemo(() => {
    return unidadesIds.length > 0 ? unidadesIds.sort().join(',') : ''
  }, [unidadesIds])

  const periodoKey = useMemo(() => {
    return `${periodoInicio || ''}-${periodoFim || ''}`
  }, [periodoInicio, periodoFim])

  const fetchGanhasData = useCallback(async () => {
    if (authLoading || !user) {
      setGanhasTotal(0)
      setGanhasValorTotal(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      params.append('status', 'won')
      
      if (unidadesIds.length > 0) {
        params.append('unidade_id', unidadesIds.join(','))
      }
      
      if (periodoInicio && periodoFim) {
        params.append('gain_date_start', periodoInicio)
        params.append('gain_date_end', periodoFim)
        params.append('all', '1')
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
        if (result.data.resumo_periodo && periodoInicio && periodoFim) {
          const resumoPeriodo = result.data.resumo_periodo
          const resumoDentro = result.data.resumo_dentro_createDate
          const resumoFora = result.data.resumo_fora_createDate
          
          setGanhasTotal(resumoPeriodo.total_oportunidades || 0)
          setGanhasValorTotal(resumoPeriodo.valor_total || 0)
          
          if (resumoDentro) {
            setGanhasPeriodo({
              total: resumoDentro.total_oportunidades || 0,
              valor: resumoDentro.valor_total || 0
            })
          } else {
            setGanhasPeriodo(null)
          }
          
          if (resumoFora) {
            setGanhasForaPeriodo({
              total: resumoFora.total_oportunidades || 0,
              valor: resumoFora.valor_total || 0
            })
          } else {
            setGanhasForaPeriodo(null)
          }
        } else {
          const totalGanhas = Number(
            result.data.total_ganhas || 
            result.data.total || 
            result.data.stats?.[0]?.total_ganhas || 
            result.data.stats?.[0]?.total || 
            0
          )
          const valorGanhas = Number(
            result.data.valor_ganhas || 
            result.data.valor_total || 
            result.data.stats?.[0]?.valor_ganhas || 
            result.data.stats?.[0]?.valor_total || 
            0
          )
          
          setGanhasTotal(totalGanhas)
          setGanhasValorTotal(valorGanhas)
          setGanhasPeriodo(null)
          setGanhasForaPeriodo(null)
        }
      } else {
        setGanhasTotal(0)
        setGanhasValorTotal(0)
        setGanhasPeriodo(null)
        setGanhasForaPeriodo(null)
      }
    } catch (error) {
      setGanhasTotal(0)
      setGanhasValorTotal(0)
      setGanhasPeriodo(null)
      setGanhasForaPeriodo(null)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, unidadesIdsKey, periodoKey, periodoInicio, periodoFim])

  useEffect(() => {
    fetchGanhasData()
  }, [fetchGanhasData])

  const totalFormatado = useMemo(() => {
    return ganhasTotal.toLocaleString('pt-BR')
  }, [ganhasTotal])

  const valorTotalFormatado = useMemo(() => {
    return formatCurrency(ganhasValorTotal)
  }, [ganhasValorTotal, formatCurrency])

  if (authLoading || !user) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 rounded-2xl">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              GANHOS
            </span>
          </div>
          
          {loading ? (
            <Skeleton className="h-9 w-32 bg-green-500/30" />
          ) : (
            <p className="text-white text-3xl font-black leading-none">
              {valorTotalFormatado}
            </p>
          )}

          <Separator className="bg-green-500/30" />

          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total de Oportunidades:</span>
              {loading ? (
                <Skeleton className="h-4 w-16 bg-green-500/30" />
              ) : (
                <span className="text-white font-semibold">
                  {totalFormatado}
                </span>
              )}
            </div>
            
            {ganhasPeriodo !== null && ganhasForaPeriodo !== null && (
              <>
                <Separator className="bg-green-500/20 my-1" />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Criadas Dentro (CreateDate):</span>
                    {loading ? (
                      <Skeleton className="h-4 w-32 bg-green-500/30" />
                    ) : (
                      <span className="text-white/90 font-medium">
                        {ganhasPeriodo.total.toLocaleString('pt-BR')} ({formatCurrency(ganhasPeriodo.valor)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Criadas Fora (CreateDate):</span>
                    {loading ? (
                      <Skeleton className="h-4 w-32 bg-green-500/30" />
                    ) : (
                      <span className="text-white/90 font-medium">
                        {ganhasForaPeriodo.total.toLocaleString('pt-BR')} ({formatCurrency(ganhasForaPeriodo.valor)})
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(PainelOportunidadesGanhasCard)
