'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FolderOpen } from 'lucide-react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

interface PainelAbertasCardProps {
  unidadesIds?: number[]
}

function PainelAbertasCard({ unidadesIds = [] }: PainelAbertasCardProps) {
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [abertasTotal, setAbertasTotal] = useState(0)
  const [abertasValorTotal, setAbertasValorTotal] = useState(0)

  // Memoizar a formatação de moeda
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  // Memoizar a string de IDs para evitar recriação desnecessária
  const unidadesIdsKey = useMemo(() => {
    return unidadesIds.length > 0 ? unidadesIds.sort().join(',') : ''
  }, [unidadesIds])

  // Função para buscar dados
  const fetchAbertasData = useCallback(async () => {
    // Não fazer requisição se não estiver autenticado
    if (authLoading || !user) {
      setAbertasTotal(0)
      setAbertasValorTotal(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const url = unidadesIds.length > 0
        ? `/api/oportunidades/stats-abertas?unidades=${unidadesIds.join(',')}`
        : '/api/oportunidades/stats-abertas'
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        setAbertasTotal(Number(data.data.total) || 0)
        setAbertasValorTotal(Number(data.data.valorTotal) || 0)
      } else {
        setAbertasTotal(0)
        setAbertasValorTotal(0)
      }
    } catch (error) {
      setAbertasTotal(0)
      setAbertasValorTotal(0)
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, unidadesIdsKey])

  useEffect(() => {
    fetchAbertasData()
  }, [fetchAbertasData])

  // Memoizar valores formatados
  const totalFormatado = useMemo(() => {
    return abertasTotal.toLocaleString('pt-BR')
  }, [abertasTotal])

  const valorTotalFormatado = useMemo(() => {
    return formatCurrency(abertasValorTotal)
  }, [abertasValorTotal, formatCurrency])

  // Não renderizar nada se não estiver autenticado
  if (authLoading || !user) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 rounded-2xl">
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              Oportunidades Abertas
            </span>
          </div>
          
          {/* Valor principal */}
          <p className="text-white text-3xl font-black leading-none">
            {loading ? '...' : totalFormatado}
          </p>

          <Separator className="bg-blue-500/30" />

          {/* Informações secundárias */}
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Valor Total:</span>
              <span className="text-white font-semibold">
                {loading ? '...' : valorTotalFormatado}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Memoizar componente para evitar re-renders desnecessários
export default memo(PainelAbertasCard)

