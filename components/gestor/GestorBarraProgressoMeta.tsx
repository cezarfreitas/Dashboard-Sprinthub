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
  const diaAtual = currentDate.getDate()

  const diasNoMes = useMemo(() => {
    // new Date(ano, mes, 0) = último dia do mês (mes é 1-based aqui)
    return new Date(targetAno, targetMes, 0).getDate()
  }, [targetAno, targetMes])

  const projecaoValor = useMemo(() => {
    if (meta <= 0) return 0
    if (!Number.isFinite(valorAtual) || valorAtual <= 0) return 0
    if (!Number.isFinite(diaAtual) || diaAtual <= 0) return 0
    if (!Number.isFinite(diasNoMes) || diasNoMes <= 0) return 0
    return (valorAtual / diaAtual) * diasNoMes
  }, [meta, valorAtual, diaAtual, diasNoMes])

  const projecaoPercentual = useMemo(() => {
    if (meta <= 0) return 0
    return Math.min(100, (projecaoValor / meta) * 100)
  }, [meta, projecaoValor])

  const projecaoAtingeMeta = meta > 0 && projecaoValor >= meta

  const handleOpenDialog = () => {
    if (unidadeId && meta > 0) {
      setDialogOpen(true)
    }
  }

  return (
    <>
      <div className="bg-primary rounded-lg border-2 border-primary p-4 shadow-sm">
        <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Target className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold text-white whitespace-nowrap">
            {meta === 0 ? 'Vendas do Mês:' : 'Meta do Mês:'}
          </span>
        </div>
        
        {meta > 0 ? (
          <>
            {/* Barra de Progresso Grande */}
            <div className="relative flex-1">
              {projecaoValor > 0 && (
                <div
                  className="absolute -top-5 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-semibold text-white/95 backdrop-blur"
                  style={{ left: `${Math.max(0, Math.min(100, projecaoPercentual))}%` }}
                  title={`Projeção: ${formatCurrency(projecaoValor)} (${projecaoPercentual.toFixed(1)}%)`}
                >
                  Projeção
                  <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-black/25" />
                </div>
              )}

              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          {/* Overlay de projeção (ritmo atual até o fim do mês) */}
          {projecaoValor > 0 && (
            <div
              className="absolute inset-y-0 left-0 opacity-35"
              style={{ width: `${Math.max(0, Math.min(100, projecaoPercentual))}%` }}
            >
              <div className="h-full w-full bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.35)_0px,rgba(255,255,255,0.35)_8px,rgba(255,255,255,0.10)_8px,rgba(255,255,255,0.10)_16px)]" />
            </div>
          )}
          <div 
            className={cn(
              "absolute inset-y-0 left-0 transition-all duration-700 rounded-full flex items-center justify-end pr-3",
              percentualMeta >= 100
                ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                : projecaoValor > 0 && !projecaoAtingeMeta
                  ? "bg-gradient-to-r from-orange-400 to-red-500"
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
          {/* Marcador da projeção */}
          {projecaoValor > 0 && (
            <div
              className="absolute inset-y-1 w-[2px] bg-blue-700/70"
              style={{ left: `calc(${Math.max(0, Math.min(100, projecaoPercentual))}% - 1px)` }}
              title={`Projeção: ${formatCurrency(projecaoValor)} (${projecaoPercentual.toFixed(1)}%)`}
            />
          )}
          {percentualMeta <= 15 && percentualMeta > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {percentualMeta.toFixed(1)}%
              </span>
            </div>
          )}
              </div>
            </div>
        
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <span className="text-xs text-white/80">Atingido: </span>
            <span className="text-sm font-bold text-white">{formatCurrency(valorAtual)}</span>
          </div>
          <div className="text-white/60">/</div>
          <div className="text-right">
            <span className="text-xs text-white/80">Meta: </span>
            <span className="text-sm font-bold text-white">{formatCurrency(meta)}</span>
          </div>
          <div className="text-right min-w-[60px]">
            <span className={cn(
              "text-sm font-bold",
              percentualMeta >= 100 ? "text-yellow-200" : "text-green-200"
            )}>
              {percentualMeta.toFixed(1)}%
            </span>
          </div>

          {projecaoValor > 0 && (
            <div className="text-right min-w-[120px] hidden lg:block">
              <div className="text-[10px] text-white/80">Projeção</div>
              <div className="flex items-baseline justify-end gap-2">
                <span
                  className={cn(
                    "text-[12px] font-bold leading-tight",
                    projecaoAtingeMeta ? "text-emerald-200" : "text-amber-200"
                  )}
                >
                  {projecaoPercentual.toFixed(1)}%
                </span>
                <span className="text-[11px] font-semibold text-white/95 leading-tight">
                  {formatCurrency(projecaoValor)}
                </span>
              </div>
            </div>
          )}
          
          {unidadeId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenDialog}
              className="flex-shrink-0 h-8 px-3 hover:bg-white/20 hover:text-white transition-colors text-white/90"
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
              <span className="text-xs text-white/80">Total vendido: </span>
              <span className="text-sm font-bold text-white">{formatCurrency(valorAtual)}</span>
            </div>
            <div className="px-3 py-1 bg-white/20 border border-white/30 rounded-md">
              <span className="text-xs text-white">Sem meta cadastrada</span>
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

