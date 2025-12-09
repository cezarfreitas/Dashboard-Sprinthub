import { memo, useMemo, useState } from "react"
import { Target, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GestorMetaDetalhesDialog } from "./GestorMetaDetalhesDialog"

interface GestorBarraProgressoMetaProps {
  valorAtual: number
  meta: number
  unidadeId?: number | null
  mes?: number
  ano?: number
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
  meta,
  unidadeId = null,
  mes,
  ano
}: GestorBarraProgressoMetaProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const percentualMeta = useMemo(() => {
    if (meta === 0) return 0
    return Math.min(100, (valorAtual / meta) * 100)
  }, [valorAtual, meta])

  // Determinar mês e ano atual se não fornecidos
  const currentDate = new Date()
  const targetMes = mes ?? currentDate.getMonth() + 1
  const targetAno = ano ?? currentDate.getFullYear()

  if (meta === 0 && valorAtual === 0) {
    return null
  }

  const handleOpenDialog = () => {
    if (unidadeId && meta > 0) {
      setDialogOpen(true)
    }
  }

  return (
    <>
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
          
          {unidadeId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenDialog}
              className="flex-shrink-0 h-8 px-3 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <span className="text-xs font-medium">Ver Detalhes</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
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

      {unidadeId && (
        <GestorMetaDetalhesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          unidadeId={unidadeId}
          mes={targetMes}
          ano={targetAno}
          metaTotal={meta}
          realizadoTotal={valorAtual}
        />
      )}
    </>
  )
})

