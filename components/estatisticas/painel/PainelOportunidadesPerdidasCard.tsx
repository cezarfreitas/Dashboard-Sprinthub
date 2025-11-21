'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { XCircle } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PainelOportunidadesPerdidasCardProps {
  unidadesIds?: number[]
  periodoInicio?: string
  periodoFim?: string
  funilId?: string
}

function PainelOportunidadesPerdidasCard({ 
  unidadesIds = [],
  periodoInicio,
  periodoFim,
  funilId
}: PainelOportunidadesPerdidasCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [perdidasTotal, setPerdidasTotal] = useState(0)
  const [perdidasValorTotal, setPerdidasValorTotal] = useState(0)
  const [perdidasPeriodo, setPerdidasPeriodo] = useState<{ total: number; valor: number } | null>(null)
  const [perdidasForaPeriodo, setPerdidasForaPeriodo] = useState<{ total: number; valor: number } | null>(null)

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

  const funilKey = useMemo(() => {
    return funilId || ''
  }, [funilId])

  const fetchPerdidasData = useCallback(async () => {
    if (authLoading || !user) {
      setPerdidasTotal(0)
      setPerdidasValorTotal(0)
      setPerdidasPeriodo(null)
      setPerdidasForaPeriodo(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      params.append('status', 'lost')
      
      if (unidadesIds.length > 0) {
        params.append('unidade_id', unidadesIds.join(','))
      }
      
      if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
        params.append('funil_id', funilId)
      }
      
      if (periodoInicio && periodoFim) {
        params.append('lost_date_start', periodoInicio)
        params.append('lost_date_end', periodoFim)
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
          
          setPerdidasTotal(resumoPeriodo.total_oportunidades || 0)
          setPerdidasValorTotal(resumoPeriodo.valor_total || 0)
          
          if (resumoDentro) {
            setPerdidasPeriodo({
              total: resumoDentro.total_oportunidades || 0,
              valor: resumoDentro.valor_total || 0
            })
          } else {
            setPerdidasPeriodo(null)
          }
          
          if (resumoFora) {
            setPerdidasForaPeriodo({
              total: resumoFora.total_oportunidades || 0,
              valor: resumoFora.valor_total || 0
            })
          } else {
            setPerdidasForaPeriodo(null)
          }
        } else {
          const totalPerdidas = Number(
            result.data.total_perdidas || 
            result.data.total || 
            result.data.stats?.[0]?.total_perdidas || 
            result.data.stats?.[0]?.total || 
            0
          )
          const valorPerdidas = Number(
            result.data.valor_perdidas || 
            result.data.valor_total || 
            result.data.stats?.[0]?.valor_perdidas || 
            result.data.stats?.[0]?.valor_total || 
            0
          )
          
          setPerdidasTotal(totalPerdidas)
          setPerdidasValorTotal(valorPerdidas)
          setPerdidasPeriodo(null)
          setPerdidasForaPeriodo(null)
        }
      } else {
        setPerdidasTotal(0)
        setPerdidasValorTotal(0)
        setPerdidasPeriodo(null)
        setPerdidasForaPeriodo(null)
      }
    } catch (error) {
      setPerdidasTotal(0)
      setPerdidasValorTotal(0)
      setPerdidasPeriodo(null)
      setPerdidasForaPeriodo(null)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, unidadesIdsKey, periodoKey, funilKey, periodoInicio, periodoFim])

  useEffect(() => {
    fetchPerdidasData()
  }, [fetchPerdidasData])

  const totalFormatado = useMemo(() => {
    return perdidasTotal.toLocaleString('pt-BR')
  }, [perdidasTotal])

  if (authLoading || !user) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0 rounded-2xl">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              OPORTUNIDADES PERDIDAS
            </span>
          </div>
          
          {loading ? (
            <Skeleton className="h-9 w-24 bg-red-500/30" />
          ) : (
            <p className="text-white text-3xl font-black leading-none">
              {totalFormatado}
            </p>
          )}

          <Separator className="bg-red-500/30" />

          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total de Oportunidades:</span>
              {loading ? (
                <Skeleton className="h-4 w-16 bg-red-500/30" />
              ) : (
                <span className="text-white font-semibold">
                  {totalFormatado}
                </span>
              )}
            </div>
            
            {perdidasPeriodo !== null && perdidasForaPeriodo !== null && (
              <>
                <Separator className="bg-red-500/20 my-1" />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Criadas Dentro (CreateDate):</span>
                    {loading ? (
                      <Skeleton className="h-4 w-32 bg-red-500/30" />
                    ) : (
                      <span className="text-white/90 font-medium">
                        {perdidasPeriodo.total.toLocaleString('pt-BR')} ({formatCurrency(perdidasPeriodo.valor)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Criadas Fora (CreateDate):</span>
                    {loading ? (
                      <Skeleton className="h-4 w-32 bg-red-500/30" />
                    ) : (
                      <span className="text-white/90 font-medium">
                        {perdidasForaPeriodo.total.toLocaleString('pt-BR')} ({formatCurrency(perdidasForaPeriodo.valor)})
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

export default memo(PainelOportunidadesPerdidasCard)
