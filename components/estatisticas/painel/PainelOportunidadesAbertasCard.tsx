'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { FolderOpen } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PainelOportunidadesAbertasCardProps {
  unidadesIds?: number[]
  periodoInicio?: string
  periodoFim?: string
  funilId?: string
}

function PainelOportunidadesAbertasCard({ 
  unidadesIds = [],
  periodoInicio,
  periodoFim,
  funilId
}: PainelOportunidadesAbertasCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [abertasTotal, setAbertasTotal] = useState(0)
  const [abertasValorTotal, setAbertasValorTotal] = useState(0)
  const [abertasCriadasNoPeriodo, setAbertasCriadasNoPeriodo] = useState(0)
  const [abertasValorCriadasNoPeriodo, setAbertasValorCriadasNoPeriodo] = useState(0)
  const [abertasDeOutrosPeriodos, setAbertasDeOutrosPeriodos] = useState(0)
  const [abertasValorDeOutrosPeriodos, setAbertasValorDeOutrosPeriodos] = useState(0)

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

  const fetchAbertasData = useCallback(async () => {
    if (authLoading || !user) {
      setAbertasTotal(0)
      setAbertasValorTotal(0)
      setAbertasCriadasNoPeriodo(0)
      setAbertasValorCriadasNoPeriodo(0)
      setAbertasDeOutrosPeriodos(0)
      setAbertasValorDeOutrosPeriodos(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const paramsBase = new URLSearchParams()
      paramsBase.append('status', 'open')
      
      if (unidadesIds.length > 0) {
        paramsBase.append('unidade_id', unidadesIds.join(','))
      }
      
      if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
        paramsBase.append('funil_id', funilId)
      }
      
      if (periodoInicio && periodoFim) {
        const paramsAll = new URLSearchParams(paramsBase)
        paramsAll.append('created_date_start', periodoInicio)
        paramsAll.append('created_date_end', periodoFim)
        paramsAll.append('all', '1')
        
        const url = `/api/oportunidades/stats?${paramsAll.toString()}`
        
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          const totalAbertas = Number(result.data.total_abertas_geral || result.data.total_abertas || result.data.total || 0)
          const valorAbertas = Number(result.data.valor_abertas || result.data.valor_total || 0)
          const abertasNoPeriodo = Number(result.data.total_abertas_periodo || 0)
          const valorAbertasNoPeriodo = Number(result.data.valor_abertas_periodo || 0)
          const abertasForaPeriodo = Number(result.data.total_abertas_fora_periodo || 0)
          const valorAbertasForaPeriodo = Number(result.data.valor_abertas_fora_periodo || 0)
          
          setAbertasTotal(totalAbertas)
          setAbertasValorTotal(valorAbertas)
          setAbertasCriadasNoPeriodo(abertasNoPeriodo)
          setAbertasValorCriadasNoPeriodo(valorAbertasNoPeriodo)
          setAbertasDeOutrosPeriodos(abertasForaPeriodo)
          setAbertasValorDeOutrosPeriodos(valorAbertasForaPeriodo)
        } else {
          setAbertasTotal(0)
          setAbertasValorTotal(0)
          setAbertasCriadasNoPeriodo(0)
          setAbertasValorCriadasNoPeriodo(0)
          setAbertasDeOutrosPeriodos(0)
          setAbertasValorDeOutrosPeriodos(0)
        }
      } else {
        const url = `/api/oportunidades/stats?${paramsBase.toString()}`
        
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          const totalAbertas = Number(
            result.data.total_abertas || 
            result.data.total || 
            result.data.stats?.[0]?.total_abertas || 
            result.data.stats?.[0]?.total || 
            0
          )
          const valorAbertas = Number(
            result.data.valor_abertas || 
            result.data.valor_total || 
            result.data.stats?.[0]?.valor_abertas || 
            result.data.stats?.[0]?.valor_total || 
            0
          )
          
          setAbertasTotal(totalAbertas)
          setAbertasValorTotal(valorAbertas)
          setAbertasCriadasNoPeriodo(0)
          setAbertasValorCriadasNoPeriodo(0)
          setAbertasDeOutrosPeriodos(0)
          setAbertasValorDeOutrosPeriodos(0)
        } else {
          setAbertasTotal(0)
          setAbertasValorTotal(0)
          setAbertasCriadasNoPeriodo(0)
          setAbertasValorCriadasNoPeriodo(0)
          setAbertasDeOutrosPeriodos(0)
          setAbertasValorDeOutrosPeriodos(0)
        }
      }
    } catch (error) {
      setAbertasTotal(0)
      setAbertasValorTotal(0)
      setAbertasCriadasNoPeriodo(0)
      setAbertasValorCriadasNoPeriodo(0)
      setAbertasDeOutrosPeriodos(0)
      setAbertasValorDeOutrosPeriodos(0)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, unidadesIdsKey, periodoKey, funilKey])

  useEffect(() => {
    fetchAbertasData()
  }, [fetchAbertasData])

  const totalFormatado = useMemo(() => {
    return abertasTotal.toLocaleString('pt-BR')
  }, [abertasTotal])

  const valorTotalFormatado = useMemo(() => {
    return formatCurrency(abertasValorTotal)
  }, [abertasValorTotal, formatCurrency])

  if (authLoading || !user) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 rounded-2xl">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              OPORTUNIDADES ABERTAS
            </span>
          </div>
          
          {loading ? (
            <Skeleton className="h-9 w-24 bg-blue-500/30" />
          ) : (
            <p className="text-white text-3xl font-black leading-none">
              {totalFormatado}
            </p>
          )}

          <Separator className="bg-blue-500/30" />

          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Valor Total:</span>
              {loading ? (
                <Skeleton className="h-4 w-28 bg-blue-500/30" />
              ) : (
                <span className="text-white font-semibold">
                  {valorTotalFormatado}
                </span>
              )}
            </div>
            {periodoInicio && periodoFim && (
              <>
                <div className="flex items-center justify-between pt-1 border-t border-blue-500/20">
                  <span className="text-white/70">Criadas no período:</span>
                  {loading ? (
                    <Skeleton className="h-4 w-32 bg-blue-500/30" />
                  ) : (
                    <span className="text-white font-semibold">
                      {abertasCriadasNoPeriodo.toLocaleString('pt-BR')} | {formatCurrency(abertasValorCriadasNoPeriodo)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Criadas em outros períodos:</span>
                  {loading ? (
                    <Skeleton className="h-4 w-32 bg-blue-500/30" />
                  ) : (
                    <span className="text-white font-semibold">
                      {abertasDeOutrosPeriodos.toLocaleString('pt-BR')} | {formatCurrency(abertasValorDeOutrosPeriodos)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(PainelOportunidadesAbertasCard)
