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
    <Card>
      <CardHeader>
        <CardTitle>Meta da Equipe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(metaTotal)}
            </p>
            <p className="text-sm text-muted-foreground">
              Meta estabelecida
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-purple-600">
              {percentualMeta}%
            </p>
            <p className="text-sm text-muted-foreground">
              Atingida
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})


