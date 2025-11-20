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
}

function PainelTaxaConversaoCard({ 
  unidadesIds = [],
  periodoInicio,
  periodoFim
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
      
      const params = new URLSearchParams()
      params.append('status', 'gain')
      
      if (unidadesIds.length > 0) {
        params.append('unidade_id', unidadesIds.join(','))
      }
      
      // Se houver período, usar all=1 para obter taxa de conversão baseada no createDate
      if (periodoInicio && periodoFim) {
        params.append('gain_date_start', periodoInicio)
        params.append('gain_date_end', periodoFim)
        params.append('all', '1')
      }
      
      const response = await fetch(`/api/oportunidades/stats?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // Se houver período e all=1, usar dados do resumo_periodo com taxa_completa
        if (periodoInicio && periodoFim && result.data.resumo_dentro_createDate) {
          // Usar taxa_conversao_completa (inclui ganhas criadas fora do período)
          const taxa = result.data.taxa_conversao_completa || result.data.resumo_periodo?.taxa_conversao_completa || 0
          const criadas = result.data.total_criadas_periodo || 0
          // Total de ganhas inclui as criadas fora do período
          const ganhas = result.data.total_ganhas_periodo || 0
          
          setTaxaConversao(taxa)
          setTotalCriadas(criadas)
          setTotalGanhas(ganhas)
        } else {
          // Sem período: calcular taxa de conversão geral
          // Buscar total criadas e total ganhas
          const paramsCriadas = new URLSearchParams()
          if (unidadesIds.length > 0) {
            paramsCriadas.append('unidade_id', unidadesIds.join(','))
          }
          
          const [criadasRes, ganhasData] = await Promise.all([
            fetch(`/api/oportunidades/stats?${paramsCriadas.toString()}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' }
            }),
            Promise.resolve(result)
          ])
          
          if (!criadasRes.ok) {
            throw new Error('Erro ao buscar dados')
          }
          
          const criadasData = await criadasRes.json()
          
          const criadas = Number(
            criadasData.data?.total || 
            criadasData.data?.stats?.[0]?.total || 
            0
          )
          
          const ganhas = Number(
            ganhasData.data?.total_ganhas || 
            ganhasData.data?.total || 
            ganhasData.data?.stats?.[0]?.total_ganhas || 
            ganhasData.data?.stats?.[0]?.total || 
            0
          )
          
          setTotalCriadas(criadas)
          setTotalGanhas(ganhas)
          setTaxaConversao(criadas > 0 ? (ganhas / criadas) * 100 : 0)
        }
      } else {
        setTaxaConversao(0)
        setTotalCriadas(0)
        setTotalGanhas(0)
      }
    } catch (error) {
      setTaxaConversao(0)
      setTotalCriadas(0)
      setTotalGanhas(0)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, unidadesIdsKey, periodoKey, periodoInicio, periodoFim])

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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              TAXA DE CONVERSÃO
            </span>
          </div>
          
          {loading ? (
            <Skeleton className="h-9 w-20 bg-purple-500/30" />
          ) : (
            <p className="text-white text-3xl font-black leading-none">
              {taxaFormatada}
            </p>
          )}

          <Separator className="bg-purple-500/30" />

          <div className="space-y-1 text-[10px]">
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
            <div className="flex items-center justify-between">
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
