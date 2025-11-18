import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PainelUnidade } from '@/types/painel.types'

interface PainelUnidadeCardProps {
  unidade: PainelUnidade
  posicao: number
  color: {
    bg: string
    text: string
  }
}

const cardColors = [
  {
    bg: "bg-gradient-to-br from-blue-500 to-blue-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-purple-500 to-purple-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-pink-500 to-pink-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-teal-500 to-teal-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-violet-500 to-violet-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-rose-500 to-rose-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-orange-500 to-orange-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-amber-500 to-amber-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-lime-500 to-lime-600",
    text: "text-white"
  }
]

export function getCardColor(id: number) {
  return cardColors[id % cardColors.length]
}

export const PainelUnidadeCard = memo(function PainelUnidadeCard({
  unidade,
  posicao,
  color
}: PainelUnidadeCardProps) {
  const nomeExibicao = unidade.nome_exibicao || unidade.nome || unidade.name || 'Sem nome'
  
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.valor_ganho)

  return (
    <Card 
      className={cn(
        "hover:shadow-xl transition-all duration-300 cursor-pointer border-0 overflow-hidden",
        color.bg,
        "hover:scale-105"
      )}
    >
      <CardContent className={cn("p-6", color.text)}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <span className="font-black text-base uppercase tracking-wide truncate flex-1">
            {nomeExibicao}
          </span>
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
            posicao <= 3 ? "bg-yellow-400 text-yellow-900" : "bg-white/20 text-white"
          )}>
            {posicao}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 opacity-90" />
                <span className="text-xs opacity-90">Abertas</span>
              </div>
              <span className="text-xs font-bold">{unidade.oportunidades_abertas}</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 flex-1 border-x border-white/20 px-2">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 opacity-90 text-green-200" />
                <span className="text-xs opacity-90">Ganhas</span>
              </div>
              <span className="text-xs font-bold text-green-200">{unidade.oportunidades_ganhas}</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 opacity-90 text-red-200" />
                <span className="text-xs opacity-90">Perdidas</span>
              </div>
              <span className="text-xs font-bold text-red-200">{unidade.oportunidades_perdidas}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-white/20">
            <span className="text-xs opacity-90">Valor Ganho</span>
            <span className="text-sm font-bold text-green-200">{valorFormatado}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

