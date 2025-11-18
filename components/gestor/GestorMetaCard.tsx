import { memo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface GestorMetaCardProps {
  metaTotal: number
  valorGanho: number
}

export const GestorMetaCard = memo(function GestorMetaCard({
  metaTotal,
  valorGanho
}: GestorMetaCardProps) {
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  const percentualMeta = metaTotal > 0 
    ? ((valorGanho / metaTotal) * 100).toFixed(1)
    : '0.0'

  if (metaTotal <= 0) {
    return null
  }

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold whitespace-nowrap">Meta da Equipe</CardTitle>
      </CardHeader>
      <CardContent className="pt-1 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-bold text-purple-600 leading-tight whitespace-nowrap truncate">
              {formatCurrency(metaTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Meta estabelecida
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-semibold text-purple-600 leading-tight whitespace-nowrap">
              {percentualMeta}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Atingida
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})


