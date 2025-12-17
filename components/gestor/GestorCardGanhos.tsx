import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle } from "lucide-react"

interface GestorCardGanhosProps {
  valorTotal: number
  totalOportunidades: number
  criadasDentro: number
  valorCriadasDentro: number
  criadasFora: number
  valorCriadasFora: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const GestorCardGanhos = memo(function GestorCardGanhos({
  valorTotal,
  totalOportunidades,
  criadasDentro,
  valorCriadasDentro,
  criadasFora,
  valorCriadasFora
}: GestorCardGanhosProps) {
  return (
    <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 rounded-2xl h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              GANHOS
            </span>
          </div>
          
          <p className="text-white text-3xl font-black leading-none">
            {formatCurrency(valorTotal)}
          </p>

          <Separator className="bg-emerald-500/30" />

          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total de Oportunidades:</span>
              <span className="text-white font-semibold">
                {totalOportunidades.toLocaleString('pt-BR')}
              </span>
            </div>
            <Separator className="bg-emerald-500/20 my-1" />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Criadas Dentro:</span>
                <span className="text-white/90 font-medium">
                  {criadasDentro.toLocaleString('pt-BR')} ({formatCurrency(valorCriadasDentro)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Criadas Fora:</span>
                <span className="text-white/90 font-medium">
                  {criadasFora.toLocaleString('pt-BR')} ({formatCurrency(valorCriadasFora)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
