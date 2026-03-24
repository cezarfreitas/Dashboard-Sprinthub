'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Percent } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PainelTaxaConversaoCardProps {
  unidadesIds?: number[]
  periodoInicio?: string
  periodoFim?: string
  funilId?: string
}

function PainelTaxaConversaoCard({ 
  unidadesIds = [],
  periodoInicio,
  periodoFim,
  funilId
}: PainelTaxaConversaoCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [taxaConversao, setTaxaConversao] = useState(0)
  const [totalCriadas, setTotalCriadas] = useState(0)
  const [totalGanhas, setTotalGanhas] = useState(0)

  const unidadesIdsKey = useMemo(() => {
    return unidadesIds.length > 0 ? unidadesIds.sort().join(',') : ''
  }, [unidadesIds])

  const periodoKey = useMemo(() => {
    return `${periodoInicio || ''}-${periodoFim || ''}`
  }, [periodoInicio, periodoFim])

  const funilKey = useMemo(() => {
    return funilId || ''
  }, [funilId])

  const fetchTaxaConversaoData = useCallback(async () => {
    if (authLoading || !user) {
      setTaxaConversao(0)
      setTotalCriadas(0)
      setTotalGanhas(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const baseParams = new URLSearchParams()
      if (unidadesIds.length > 0) {
        baseParams.append('unidade_id', unidadesIds.join(','))
      }
      if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
        baseParams.append('funil_id', funilId)
      }

      if (periodoInicio && periodoFim) {
        // Taxa de conversão com período: ganhas (gain_date) / criadas (createDate) no mesmo período
        const paramsGanhas = new URLSearchParams(baseParams)
        paramsGanhas.append('status', 'won')
        paramsGanhas.append('gain_date_start', periodoInicio)
        paramsGanhas.append('gain_date_end', periodoFim)
        paramsGanhas.append('all', '1')

        const paramsCriadas = new URLSearchParams(baseParams)
        paramsCriadas.append('created_date_start', periodoInicio)
        paramsCriadas.append('created_date_end', periodoFim)

        const [ganhasRes, criadasRes] = await Promise.all([
          fetch(`/api/oportunidades/stats?${paramsGanhas.toString()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          }),
          fetch(`/api/oportunidades/stats?${paramsCriadas.toString()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          })
        ])

        if (!ganhasRes.ok || !criadasRes.ok) throw new Error('Erro ao buscar dados')

        const [ganhasData, criadasData] = await Promise.all([
          ganhasRes.json(),
          criadasRes.json()
        ])

        const ganhas = Number(
          ganhasData.data?.resumo_periodo?.total_oportunidades ??
          ganhasData.data?.total_ganhas_periodo ??
          ganhasData.data?.total_ganhas ??
          0
        )
        const criadas = Number(
          criadasData.data?.total ?? 0
        )

        setTotalGanhas(ganhas)
        setTotalCriadas(criadas)
        setTaxaConversao(criadas > 0 ? (ganhas / criadas) * 100 : 0)
      } else {
        // Sem período: buscar ganhas e criadas sem filtro de data
        const paramsGanhas = new URLSearchParams(baseParams)
        paramsGanhas.append('status', 'won')

        const [ganhasRes, criadasRes] = await Promise.all([
          fetch(`/api/oportunidades/stats?${paramsGanhas.toString()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          }),
          fetch(`/api/oportunidades/stats?${baseParams.toString()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          })
        ])

        if (!ganhasRes.ok || !criadasRes.ok) throw new Error('Erro ao buscar dados')

        const [ganhasData, criadasData] = await Promise.all([
          ganhasRes.json(),
          criadasRes.json()
        ])

        const ganhas = Number(
          ganhasData.data?.total_ganhas ??
          ganhasData.data?.total ??
          0
        )
        const criadas = Number(criadasData.data?.total ?? 0)

        setTotalGanhas(ganhas)
        setTotalCriadas(criadas)
        setTaxaConversao(criadas > 0 ? (ganhas / criadas) * 100 : 0)
      }
    } catch (error) {
      setTaxaConversao(0)
      setTotalCriadas(0)
      setTotalGanhas(0)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, unidadesIdsKey, periodoKey, funilKey, periodoInicio, periodoFim])

  useEffect(() => {
    fetchTaxaConversaoData()
  }, [fetchTaxaConversaoData])

  const taxaFormatada = useMemo(() => {
    return `${taxaConversao.toFixed(1)}%`
  }, [taxaConversao])

  if (authLoading || !user) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 rounded-2xl">
      <CardContent className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-white/15 rounded-lg p-1.5">
              <Percent className="w-4 h-4 text-white/90" />
            </div>
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              TAXA DE CONVERSÃO
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20 bg-purple-500/30" />
          ) : (
            <p className="text-white text-2xl font-black leading-none truncate">
              {taxaFormatada}
            </p>
          )}

          <div className="border-t border-white/10 my-1" />

          <div className="flex flex-col gap-0 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Criadas:</span>
              {loading ? (
                <Skeleton className="h-4 w-16 bg-purple-500/30" />
              ) : (
                <span className="text-white font-semibold">
                  {totalCriadas.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
              <span className="text-white/70">Ganhas:</span>
              {loading ? (
                <Skeleton className="h-4 w-16 bg-purple-500/30" />
              ) : (
                <span className="text-white font-semibold">
                  {totalGanhas.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(PainelTaxaConversaoCard)
