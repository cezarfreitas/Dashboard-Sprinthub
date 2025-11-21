'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PainelTicketMedioCardProps {
  unidadesIds?: number[]
  periodoInicio?: string
  periodoFim?: string
  funilId?: string
}

function PainelTicketMedioCard({ 
  unidadesIds = [],
  periodoInicio,
  periodoFim,
  funilId
}: PainelTicketMedioCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [ticketMedio, setTicketMedio] = useState(0)
  const [totalGanhas, setTotalGanhas] = useState(0)
  const [valorTotal, setValorTotal] = useState(0)

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

  const fetchTicketMedioData = useCallback(async () => {
    if (authLoading || !user) {
      setTicketMedio(0)
      setTotalGanhas(0)
      setValorTotal(0)
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
      
      if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
        params.append('funil_id', funilId)
      }
      
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
        let ganhas = 0
        let valor = 0
        
        if (result.data.resumo_periodo) {
          ganhas = result.data.resumo_periodo.total_oportunidades || 0
          valor = result.data.resumo_periodo.valor_total || 0
        } else {
          ganhas = Number(
            result.data.total_ganhas || 
            result.data.total || 
            result.data.stats?.[0]?.total_ganhas || 
            result.data.stats?.[0]?.total || 
            0
          )
          valor = Number(
            result.data.valor_ganhas || 
            result.data.valor_total || 
            result.data.stats?.[0]?.valor_ganhas || 
            result.data.stats?.[0]?.valor_total || 
            0
          )
        }
        
        setTotalGanhas(ganhas)
        setValorTotal(valor)
        setTicketMedio(ganhas > 0 ? valor / ganhas : 0)
      } else {
        setTicketMedio(0)
        setTotalGanhas(0)
        setValorTotal(0)
      }
    } catch (error) {
      setTicketMedio(0)
      setTotalGanhas(0)
      setValorTotal(0)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, unidadesIdsKey, periodoKey, funilKey, periodoInicio, periodoFim])

  useEffect(() => {
    fetchTicketMedioData()
  }, [fetchTicketMedioData])

  const ticketFormatado = useMemo(() => {
    return formatCurrency(ticketMedio)
  }, [ticketMedio, formatCurrency])

  if (authLoading || !user) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-amber-600 to-amber-700 border-0 rounded-2xl">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              TICKET MÉDIO
            </span>
          </div>
          
          {loading ? (
            <Skeleton className="h-9 w-32 bg-amber-500/30" />
          ) : (
            <p className="text-white text-3xl font-black leading-none">
              {ticketFormatado}
            </p>
          )}

          <Separator className="bg-amber-500/30" />

          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total de Vendas:</span>
              {loading ? (
                <Skeleton className="h-4 w-16 bg-amber-500/30" />
              ) : (
                <span className="text-white font-semibold">
                  {totalGanhas.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Valor Total:</span>
              {loading ? (
                <Skeleton className="h-4 w-28 bg-amber-500/30" />
              ) : (
                <span className="text-white font-semibold">
                  {formatCurrency(valorTotal)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(PainelTicketMedioCard)
