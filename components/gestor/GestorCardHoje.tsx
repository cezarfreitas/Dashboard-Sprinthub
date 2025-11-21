import { memo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TrendingDown, TrendingUp, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface GestorCardHojeProps {
  criadasHoje: number
  valorCriadasHoje: number
  criadasOntem: number
  valorCriadasOntem: number
  ganhasHoje: number
  valorGanhasHoje: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const GestorCardHoje = memo(function GestorCardHoje({
  criadasHoje,
  valorCriadasHoje,
  criadasOntem,
  valorCriadasOntem,
  ganhasHoje,
  valorGanhasHoje
}: GestorCardHojeProps) {
  const calcularVariacao = useCallback(() => {
    if (criadasOntem === 0) return null
    const variacao = ((criadasHoje - criadasOntem) / criadasOntem) * 100
    return variacao.toFixed(1)
  }, [criadasHoje, criadasOntem])

  const variacao = calcularVariacao()
  const isPositive = variacao !== null && parseFloat(variacao) >= 0

  return (
    <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 rounded-2xl h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              HOJE
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-white/70 text-[10px] block">Criadas:</span>
              <p className="text-white text-2xl font-black leading-none">
                {criadasHoje.toLocaleString('pt-BR')}
              </p>
              <span className="text-white/90 text-xs font-medium block">
                {formatCurrency(valorCriadasHoje)}
              </span>
              {criadasOntem > 0 && (
                <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-blue-500/20">
                  <span className="text-white/50 text-[9px]">Ontem:</span>
                  <span className="text-white/70 text-[10px] font-medium">
                    {criadasOntem.toLocaleString('pt-BR')} | {formatCurrency(valorCriadasOntem)}
                  </span>
                  {variacao !== null && (
                    <span className={cn(
                      "text-[10px] font-semibold",
                      isPositive ? "text-green-400" : "text-red-400"
                    )}>
                      {isPositive ? '+' : ''}{variacao}%
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5 border-l border-blue-500/30 pl-3">
              <span className="text-white/70 text-[10px] block">Ganhas:</span>
              <p className="text-white text-2xl font-black leading-none">
                {ganhasHoje.toLocaleString('pt-BR')}
              </p>
              <span className="text-white/90 text-xs font-medium block">
                {formatCurrency(valorGanhasHoje)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
