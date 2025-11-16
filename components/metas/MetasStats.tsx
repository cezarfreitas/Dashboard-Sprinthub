'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Target, Users, Building2, DollarSign } from 'lucide-react'
import type { MetaMensal, Vendedor, Unidade } from '@/hooks/metas/useMetasConfig'

interface MetasStatsProps {
  metas: MetaMensal[]
  vendedores: Vendedor[]
  unidades: Unidade[]
}

const formatCurrency = (value: number): string => {
  if (!value || isNaN(value)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const MetasStats = memo(function MetasStats({
  metas,
  vendedores,
  unidades
}: MetasStatsProps) {
  const stats = useMemo(() => {
    const totalMetas = metas.reduce((sum, meta) => sum + parseFloat(meta.meta_valor.toString()), 0)
    const percentualDefinido = vendedores.length > 0 
      ? Math.round((metas.length / (vendedores.length * 12)) * 100) 
      : 0

    return {
      percentualDefinido,
      totalVendedores: vendedores.length,
      totalUnidades: unidades.length,
      totalMetas
    }
  }, [metas, vendedores, unidades])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div className="text-xs text-blue-700 font-medium whitespace-nowrap">Metas Definidas</div>
            </div>
            <div className="text-lg font-bold text-blue-600">
              {stats.percentualDefinido}%
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <div className="text-xs text-green-700 font-medium whitespace-nowrap">Vendedores</div>
            </div>
            <div className="text-lg font-bold text-green-600">{stats.totalVendedores}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <div className="text-xs text-purple-700 font-medium whitespace-nowrap">Unidades</div>
            </div>
            <div className="text-lg font-bold text-purple-600">{stats.totalUnidades}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <div className="text-xs text-orange-700 font-medium whitespace-nowrap">Total em Metas</div>
            </div>
            <div className="text-sm font-bold text-orange-600">
              {formatCurrency(stats.totalMetas)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

