import { memo, useMemo } from "react"
import { Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface GestorBarraProgressoMetaProps {
  valorAtual: number
  meta: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const GestorBarraProgressoMeta = memo(function GestorBarraProgressoMeta({
  valorAtual,
  meta
}: GestorBarraProgressoMetaProps) {
  const percentualMeta = useMemo(() => {
    if (meta === 0) return 0
    return Math.min(100, (valorAtual / meta) * 100)
  }, [valorAtual, meta])

  if (meta === 0 && valorAtual === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Target className="w-5 h-5 text-gray-700" />
          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            {meta === 0 ? 'Vendas do Mês:' : 'Meta do Mês:'}
          </span>
        </div>
        
        {meta > 0 ? (
          <>
            {/* Barra de Progresso Grande */}
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden flex-1">
          <div 
            className={cn(
              "absolute inset-y-0 left-0 transition-all duration-700 rounded-full flex items-center justify-end pr-3",
              percentualMeta >= 100 
                ? "bg-gradient-to-r from-yellow-400 to-yellow-500" 
                : "bg-gradient-to-r from-green-400 to-green-500"
            )}
            style={{ width: `${Math.max(3, Math.min(100, percentualMeta))}%` }}
          >
            {percentualMeta > 15 && (
              <span className="text-white text-xs font-bold">
                {percentualMeta.toFixed(1)}%
              </span>
            )}
          </div>
          {percentualMeta <= 15 && percentualMeta > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-600 text-xs font-bold">
                {percentualMeta.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <span className="text-xs text-gray-500">Atingido: </span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(valorAtual)}</span>
          </div>
          <div className="text-gray-300">/</div>
          <div className="text-right">
            <span className="text-xs text-gray-500">Meta: </span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(meta)}</span>
          </div>
          <div className="text-right min-w-[60px]">
            <span className={cn(
              "text-sm font-bold",
              percentualMeta >= 100 ? "text-yellow-600" : "text-green-600"
            )}>
              {percentualMeta.toFixed(1)}%
            </span>
          </div>
        </div>
          </>
        ) : (
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <span className="text-xs text-gray-500">Total vendido: </span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(valorAtual)}</span>
            </div>
            <div className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-md">
              <span className="text-xs text-orange-600">Sem meta cadastrada</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

