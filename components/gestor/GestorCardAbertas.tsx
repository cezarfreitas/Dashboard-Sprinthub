import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FolderOpen } from "lucide-react"

interface GestorCardAbertasProps {
  total: number
  valorTotal: number
  criadasNoPeriodo: number
  valorCriadasNoPeriodo: number
  criadasOutrosPeriodos: number
  valorCriadasOutrosPeriodos: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const GestorCardAbertas = memo(function GestorCardAbertas({
  total,
  valorTotal,
  criadasNoPeriodo,
  valorCriadasNoPeriodo,
  criadasOutrosPeriodos,
  valorCriadasOutrosPeriodos
}: GestorCardAbertasProps) {
  return (
    <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 border-0 rounded-2xl h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              OPORTUNIDADES ABERTAS
            </span>
          </div>
          
          <p className="text-white text-3xl font-black leading-none">
            {total.toLocaleString('pt-BR')}
          </p>

          <Separator className="bg-indigo-500/30" />

          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Valor Total:</span>
              <span className="text-white font-semibold">
                {formatCurrency(valorTotal)}
              </span>
            </div>
            <Separator className="bg-indigo-500/20 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-white/60">Criadas no período:</span>
              <span className="text-white/90 font-medium">
                {criadasNoPeriodo.toLocaleString('pt-BR')} | {formatCurrency(valorCriadasNoPeriodo)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Criadas em outros períodos:</span>
              <span className="text-white/90 font-medium">
                {criadasOutrosPeriodos.toLocaleString('pt-BR')} | {formatCurrency(valorCriadasOutrosPeriodos)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
