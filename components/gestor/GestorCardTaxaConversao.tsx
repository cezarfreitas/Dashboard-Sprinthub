import { memo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Percent } from "lucide-react"

interface GestorCardTaxaConversaoProps {
  criadas: number
  ganhas: number
}

export const GestorCardTaxaConversao = memo(function GestorCardTaxaConversao({
  criadas,
  ganhas
}: GestorCardTaxaConversaoProps) {
  const calcularTaxa = useCallback(() => {
    if (criadas === 0) return '0.0'
    return ((ganhas / criadas) * 100).toFixed(1)
  }, [criadas, ganhas])

  const taxa = calcularTaxa()

  return (
    <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 rounded-2xl h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-white/90" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">
              TAXA DE CONVERSÃO
            </span>
          </div>
          
          <p className="text-white text-3xl font-black leading-none">
            {taxa}%
          </p>

          <Separator className="bg-purple-500/30" />

          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Criadas:</span>
              <span className="text-white font-semibold">
                {criadas.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Ganhas:</span>
              <span className="text-white font-semibold">
                {ganhas.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
