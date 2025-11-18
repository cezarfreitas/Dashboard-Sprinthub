import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, CheckCircle, XCircle, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PainelUnidade } from '@/types/painel.types'

interface PainelUnidadeCardProps {
  unidade: PainelUnidade
  posicao: number
  color: {
    bg: string
    text: string
  }
  onClickAbertas?: () => void
  onClickGanhas?: () => void
  onClickPerdidas?: () => void
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
  color,
  onClickAbertas,
  onClickGanhas,
  onClickPerdidas
}: PainelUnidadeCardProps) {
  const nomeExibicao = unidade.nome_exibicao || unidade.nome || unidade.name || 'Sem nome'
  
  const valorAbertoFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.valor_aberto)

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.valor_ganho)

  const valorPerdidoFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.valor_perdido)

  const metaFormatada = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.meta_valor)

  const percentualMeta = unidade.meta_valor > 0 
    ? Math.min(100, (unidade.valor_ganho / unidade.meta_valor) * 100)
    : 0

  return (
    <Card 
      className={cn(
        "unidade-card hover:shadow-xl border-0 overflow-hidden animate-card-appear",
        color.bg
      )}
      style={{
        animationDelay: `${posicao * 0.05}s`
      }}
    >
      <CardContent className={cn("p-4", color.text)}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="font-black text-lg uppercase tracking-wide truncate flex-1">
            {nomeExibicao}
          </span>
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-base text-white",
            posicao <= 3 ? "bg-yellow-400" : "bg-white/20"
          )}>
            {posicao}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClickAbertas?.()
              }}
              className="flex flex-col items-center gap-1 flex-1 cursor-pointer hover:bg-white/10 rounded p-1 transition-colors"
              title="Ver oportunidades abertas"
            >
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 opacity-90" />
                <span className="text-xs opacity-90">Abertas</span>
              </div>
              <span className="text-xs font-bold">{unidade.oportunidades_abertas}</span>
              <span className="text-[10px] opacity-80">{valorAbertoFormatado}</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClickGanhas?.()
              }}
              className="flex flex-col items-center gap-1 flex-1 border-x border-white/20 px-2 cursor-pointer hover:bg-white/10 rounded p-1 transition-colors"
              title="Ver oportunidades ganhas"
            >
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 opacity-90" />
                <span className="text-xs opacity-90">Ganhas</span>
              </div>
              <span className="text-xs font-bold">{unidade.oportunidades_ganhas}</span>
              <span className="text-[10px] opacity-80">{valorFormatado}</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClickPerdidas?.()
              }}
              className="flex flex-col items-center gap-1 flex-1 cursor-pointer hover:bg-white/10 rounded p-1 transition-colors"
              title="Ver oportunidades perdidas"
            >
              <div className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 opacity-90" />
                <span className="text-xs opacity-90">Perdidas</span>
              </div>
              <span className="text-xs font-bold">{unidade.oportunidades_perdidas}</span>
              <span className="text-[10px] opacity-80">{valorPerdidoFormatado}</span>
            </button>
          </div>

          {/* Barra de Progresso da Meta */}
          <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5 opacity-90" />
                <span className="opacity-90">Meta</span>
              </div>
              <span className="font-semibold">{metaFormatada}</span>
            </div>

            {/* Barra */}
            <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 rounded-full"
                style={{ width: `${percentualMeta}%` }}
              />
            </div>

            {/* Percentual e Total */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs opacity-90">
                Atingido: <span className="font-bold">{percentualMeta.toFixed(1)}%</span>
              </span>
              <span className="text-sm font-bold text-white">
                {valorFormatado}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

