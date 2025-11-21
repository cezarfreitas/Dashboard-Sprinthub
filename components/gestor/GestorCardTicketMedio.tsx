import { memo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DollarSign } from "lucide-react"

interface GestorCardTicketMedioProps {
  totalVendas: number
  valorTotal: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const GestorCardTicketMedio = memo(function GestorCardTicketMedio({
  totalVendas,
  valorTotal
}: GestorCardTicketMedioProps) {
  const calcularTicketMedio = useCallback(() => {
    if (totalVendas === 0) return 0
    return Math.round(valorTotal / totalVendas)
  }, [totalVendas, valorTotal])

  const ticketMedio = calcularTicketMedio()

  return (
    <Card className="bg-gradient-to-br from-amber-600 to-amber-700 border-0 rounded-2xl h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              TICKET MÉDIO
            </span>
          </div>
          
          <p className="text-white text-3xl font-black leading-none">
            {formatCurrency(ticketMedio)}
          </p>

          <Separator className="bg-amber-500/30" />

          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total de Vendas:</span>
              <span className="text-white font-semibold">
                {totalVendas.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Valor Total:</span>
              <span className="text-white font-semibold">
                {formatCurrency(valorTotal)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
