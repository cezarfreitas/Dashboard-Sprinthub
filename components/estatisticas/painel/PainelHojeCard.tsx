'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PainelHojeCardProps {
  unidadesIds?: number[]
  funilId?: string
  grupoId?: string
}

function PainelHojeCard({ 
  unidadesIds = [],
  funilId,
  grupoId
}: PainelHojeCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [criadasHoje, setCriadasHoje] = useState(0)
  const [criadasHojeValor, setCriadasHojeValor] = useState(0)
  const [ganhasHoje, setGanhasHoje] = useState(0)
  const [ganhasHojeValor, setGanhasHojeValor] = useState(0)
  const [criadasOntem, setCriadasOntem] = useState(0)
  const [criadasOntemValor, setCriadasOntemValor] = useState(0)
  const [ganhasOntem, setGanhasOntem] = useState(0)
  const [ganhasOntemValor, setGanhasOntemValor] = useState(0)
  const [diferencaCriadas, setDiferencaCriadas] = useState(0)
  const [diferencaGanhas, setDiferencaGanhas] = useState(0)
  const [diferencaCriadasValor, setDiferencaCriadasValor] = useState(0)
  const [diferencaGanhasValor, setDiferencaGanhasValor] = useState(0)

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

  const filtrosKey = useMemo(() => {
    return `${unidadesIdsKey}-${funilId || ''}-${grupoId || ''}`
  }, [unidadesIdsKey, funilId, grupoId])

  const fetchHojeData = useCallback(async () => {
    if (authLoading || !user) {
      setCriadasHoje(0)
      setCriadasHojeValor(0)
      setGanhasHoje(0)
      setGanhasHojeValor(0)
      setCriadasOntem(0)
      setCriadasOntemValor(0)
      setGanhasOntem(0)
      setGanhasOntemValor(0)
      setDiferencaCriadas(0)
      setDiferencaGanhas(0)
      setDiferencaCriadasValor(0)
      setDiferencaGanhasValor(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      
      if (unidadesIds.length > 0) {
        params.append('unidade_id', unidadesIds.join(','))
      }
      
      if (funilId && funilId !== 'todos') {
        params.append('funil_id', funilId)
      }
      
      if (grupoId && grupoId !== 'todos') {
        params.append('grupo_id', grupoId)
      }
      
      const url = `/api/oportunidades/today?${params.toString()}`
      
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
        setCriadasHoje(result.data.hoje.criadas.total || 0)
        setCriadasHojeValor(result.data.hoje.criadas.valor_total || 0)
        setGanhasHoje(result.data.hoje.ganhas.total || 0)
        setGanhasHojeValor(result.data.hoje.ganhas.valor_total || 0)
        setCriadasOntem(result.data.ontem.criadas.total || 0)
        setCriadasOntemValor(result.data.ontem.criadas.valor_total || 0)
        setGanhasOntem(result.data.ontem.ganhas.total || 0)
        setGanhasOntemValor(result.data.ontem.ganhas.valor_total || 0)
        setDiferencaCriadas(result.data.diferenca_percentual.criadas.total || 0)
        setDiferencaGanhas(result.data.diferenca_percentual.ganhas.total || 0)
        setDiferencaCriadasValor(result.data.diferenca_percentual.criadas.valor || 0)
        setDiferencaGanhasValor(result.data.diferenca_percentual.ganhas.valor || 0)
      } else {
        setCriadasHoje(0)
        setCriadasHojeValor(0)
        setGanhasHoje(0)
        setGanhasHojeValor(0)
        setCriadasOntem(0)
        setCriadasOntemValor(0)
        setGanhasOntem(0)
        setGanhasOntemValor(0)
        setDiferencaCriadas(0)
        setDiferencaGanhas(0)
        setDiferencaCriadasValor(0)
        setDiferencaGanhasValor(0)
      }
    } catch (error) {
      setCriadasHoje(0)
      setCriadasHojeValor(0)
      setGanhasHoje(0)
      setGanhasHojeValor(0)
      setCriadasOntem(0)
      setCriadasOntemValor(0)
      setGanhasOntem(0)
      setGanhasOntemValor(0)
      setDiferencaCriadas(0)
      setDiferencaGanhas(0)
      setDiferencaCriadasValor(0)
      setDiferencaGanhasValor(0)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, filtrosKey, unidadesIds, funilId, grupoId])

  useEffect(() => {
    fetchHojeData()
  }, [fetchHojeData])

  const formatarDiferenca = useCallback((valor: number): string => {
    if (valor === 0) return '0%'
    const sinal = valor > 0 ? '+' : ''
    return `${sinal}${valor.toFixed(1)}%`
  }, [])

  const getDiferencaColor = useCallback((valor: number): string => {
    if (valor > 0) return 'text-green-400'
    if (valor < 0) return 'text-red-400'
    return 'text-white/60'
  }, [])

  if (authLoading || !user) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-primary to-primary/90 border-0 rounded-2xl">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              HOJE
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Criadas Hoje */}
            <div className="space-y-1.5">
              <span className="text-white/70 text-[10px] block">Criadas:</span>
              {loading ? (
                <Skeleton className="h-8 w-12 bg-primary-foreground/15" />
              ) : (
                <p className="text-white text-2xl font-black leading-none">
                  {criadasHoje.toLocaleString('pt-BR')}
                </p>
              )}
              {loading ? (
                <Skeleton className="h-3 w-full bg-primary-foreground/15" />
              ) : (
                <>
                  <span className="text-white/90 text-xs font-medium block">
                    {formatCurrency(criadasHojeValor)}
                  </span>
                  {criadasOntem > 0 && (
                    <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-primary-foreground/15">
                      <span className="text-white/50 text-[9px]">Ontem:</span>
                      <span className="text-white/70 text-[10px] font-medium">
                        {criadasOntem.toLocaleString('pt-BR')} | {formatCurrency(criadasOntemValor)}
                      </span>
                      <span className={`text-[10px] font-semibold ${getDiferencaColor(diferencaCriadas)}`}>
                        {formatarDiferenca(diferencaCriadas)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Ganhas Hoje */}
            <div className="space-y-1.5 border-l border-blue-500/30 pl-3">
              <span className="text-white/70 text-[10px] block">Ganhas:</span>
              {loading ? (
                <Skeleton className="h-8 w-12 bg-blue-500/30" />
              ) : (
                <p className="text-white text-2xl font-black leading-none">
                  {ganhasHoje.toLocaleString('pt-BR')}
                </p>
              )}
              {loading ? (
                <Skeleton className="h-3 w-full bg-blue-500/30" />
              ) : (
                <>
                  <span className="text-white/90 text-xs font-medium block">
                    {formatCurrency(ganhasHojeValor)}
                  </span>
                  {ganhasOntem > 0 && (
                    <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-blue-500/20">
                      <span className="text-white/50 text-[9px]">Ontem:</span>
                      <span className="text-white/70 text-[10px] font-medium">
                        {ganhasOntem.toLocaleString('pt-BR')} | {formatCurrency(ganhasOntemValor)}
                      </span>
                      <span className={`text-[10px] font-semibold ${getDiferencaColor(diferencaGanhas)}`}>
                        {formatarDiferenca(diferencaGanhas)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(PainelHojeCard)

