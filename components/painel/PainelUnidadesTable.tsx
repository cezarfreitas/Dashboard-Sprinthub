import { memo, useMemo } from "react"
import type { PainelFiltros, PainelUnidade } from "@/types/painel.types"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getCardColor } from "./PainelUnidadeCard"

type UnidadeStatus = "abertas" | "ganhas" | "perdidas"

interface PainelUnidadesTableProps {
  unidades: PainelUnidade[]
  filtros: Pick<PainelFiltros, "periodoInicio" | "periodoFim">
  onClickStatus: (unidade: { id: number; nome: string }, status: UnidadeStatus) => void
}

function computeSmartMeta({
  metaValor,
  valorGanho,
  periodoInicio,
  periodoFim,
}: {
  metaValor: number
  valorGanho: number
  periodoInicio?: string
  periodoFim?: string
}) {
  const percentualMeta = metaValor > 0 ? Math.min(100, (valorGanho / metaValor) * 100) : 0

  if (!metaValor || metaValor <= 0) {
    return {
      percentualMeta,
      statusKey: "no-meta" as const,
      statusLabel: "Sem meta",
      deviationPp: null as number | null,
      fillClass: "bg-white/20",
    }
  }

  if (!periodoInicio || !periodoFim) {
    return {
      percentualMeta,
      statusKey: "unknown" as const,
      statusLabel: "Atingido",
      deviationPp: null as number | null,
      fillClass: "bg-gradient-to-r from-green-400 to-green-500",
    }
  }

  const start = new Date(`${periodoInicio}T00:00:00`)
  const end = new Date(`${periodoFim}T23:59:59`)
  const now = new Date()

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return {
      percentualMeta,
      statusKey: "unknown" as const,
      statusLabel: "Atingido",
      deviationPp: null as number | null,
      fillClass: "bg-gradient-to-r from-green-400 to-green-500",
    }
  }

  const rangeMs = end.getTime() - start.getTime()
  const clampedNowMs = Math.min(end.getTime(), Math.max(start.getTime(), now.getTime()))
  const elapsed = (clampedNowMs - start.getTime()) / rangeMs

  const expectedPercent = Math.min(100, Math.max(0, elapsed * 100))
  const deviationPpRaw = percentualMeta - expectedPercent
  const deviationPp = Math.round(deviationPpRaw * 10) / 10

  if (deviationPp >= -5) {
    return {
      percentualMeta,
      statusKey: "on-track" as const,
      statusLabel: deviationPp >= 0 ? "Acima do ritmo" : "No ritmo",
      deviationPp,
      fillClass: "bg-gradient-to-r from-green-400 to-green-500",
    }
  }

  if (deviationPp >= -15) {
    return {
      percentualMeta,
      statusKey: "warning" as const,
      statusLabel: "Um pouco abaixo",
      deviationPp,
      fillClass: "bg-gradient-to-r from-yellow-300 to-amber-400",
    }
  }

  return {
    percentualMeta,
    statusKey: "off-track" as const,
    statusLabel: "Fora do ritmo",
    deviationPp,
    fillClass: "bg-gradient-to-r from-red-400 to-rose-500",
  }
}

function getStatusBadgeClass(statusKey: "no-meta" | "unknown" | "on-track" | "warning" | "off-track") {
  switch (statusKey) {
    case "on-track":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
    case "warning":
      return "bg-amber-500/15 text-amber-200 border-amber-500/30"
    case "off-track":
      return "bg-rose-500/15 text-rose-200 border-rose-500/30"
    case "no-meta":
      return "bg-slate-500/15 text-slate-200 border-slate-500/30"
    case "unknown":
    default:
      return "bg-blue-500/15 text-blue-200 border-blue-500/30"
  }
}


export const PainelUnidadesTable = memo(function PainelUnidadesTable({
  unidades,
  filtros,
  onClickStatus,
}: PainelUnidadesTableProps) {
  const currency = useMemo(() => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  }, [])

  // Formatador compacto (sem centavos)
  const currencyCompact = useMemo(() => {
    return new Intl.NumberFormat("pt-BR", { 
      style: "currency", 
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }, [])

  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
      <TooltipProvider delayDuration={200}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-800/50 hover:bg-gray-800/50 border-b border-gray-800">
              <TableHead className="w-10 py-3 text-gray-400 font-semibold text-xs">#</TableHead>
              <TableHead className="py-3 text-gray-400 font-semibold text-xs">Unidade</TableHead>
              <TableHead className="py-3 text-center text-gray-400 font-semibold text-xs">Abertas</TableHead>
              <TableHead className="py-3 text-center text-gray-400 font-semibold text-xs">Ganhas</TableHead>
              <TableHead className="py-3 text-center text-gray-400 font-semibold text-xs">Perdidas</TableHead>
              <TableHead className="py-3 text-right text-gray-400 font-semibold text-xs">Meta</TableHead>
              <TableHead className="py-3 text-right text-gray-400 font-semibold text-xs">Falta</TableHead>
              <TableHead className="py-3 text-right text-gray-400 font-semibold text-xs">Progresso</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {unidades.map((unidade, index) => {
              const posicao = index + 1
              const nomeExibicao = unidade.nome_exibicao || unidade.nome || unidade.name || "Sem nome"
              const smartMeta = computeSmartMeta({
                metaValor: unidade.meta_valor,
                valorGanho: unidade.valor_ganho,
                periodoInicio: filtros.periodoInicio,
                periodoFim: filtros.periodoFim,
              })

              const faltante = Math.max(0, unidade.meta_valor - unidade.valor_ganho)
              const topRank = posicao <= 3
              const color = getCardColor(unidade.id)
              // Cores alternadas para melhor leitura (padrão gray-900)
              const isEven = index % 2 === 0

              return (
                <TableRow
                  key={`unidade-row-${unidade.id}-${index}`}
                  className={cn(
                    "border-gray-800 text-white transition-colors",
                    isEven ? "bg-gray-900" : "bg-gray-900/60",
                    "hover:bg-gray-800",
                    topRank && "ring-1 ring-inset ring-yellow-400/30"
                  )}
                >
                  {/* Posição */}
                  <TableCell className="py-2.5 px-3">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black",
                        topRank ? "bg-yellow-400 text-gray-900" : "bg-gray-700 text-gray-300"
                      )}
                    >
                      {posicao}
                    </span>
                  </TableCell>

                  {/* Unidade */}
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("w-3 h-3 rounded-full flex-shrink-0", color.bg)} aria-hidden="true" />
                      <span className="font-bold text-sm text-white uppercase tracking-wide truncate max-w-[180px]">
                        {nomeExibicao}
                      </span>
                    </div>
                  </TableCell>

                  {/* Abertas */}
                  <TableCell className="py-2.5 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onClickStatus({ id: unidade.id, nome: nomeExibicao }, "abertas")}
                          className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-2.5 py-1.5 transition-colors"
                          aria-label={`Ver ${unidade.oportunidades_abertas} oportunidades abertas`}
                        >
                          <span className="font-bold text-sm text-blue-400">{unidade.oportunidades_abertas}</span>
                          <span className="text-[10px] text-gray-400">{currencyCompact.format(unidade.valor_aberto)}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-gray-950 border-gray-700 text-white text-xs">
                        {unidade.oportunidades_abertas} abertas • {currency.format(unidade.valor_aberto)}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Ganhas */}
                  <TableCell className="py-2.5 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onClickStatus({ id: unidade.id, nome: nomeExibicao }, "ganhas")}
                          className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-2.5 py-1.5 transition-colors"
                          aria-label={`Ver ${unidade.oportunidades_ganhas} oportunidades ganhas`}
                        >
                          <span className="font-bold text-sm text-green-400">{unidade.oportunidades_ganhas}</span>
                          <span className="text-[10px] text-gray-400">{currencyCompact.format(unidade.valor_ganho)}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-gray-950 border-gray-700 text-white text-xs">
                        {unidade.oportunidades_ganhas} ganhas • {currency.format(unidade.valor_ganho)}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Perdidas */}
                  <TableCell className="py-2.5 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onClickStatus({ id: unidade.id, nome: nomeExibicao }, "perdidas")}
                          className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-2.5 py-1.5 transition-colors"
                          aria-label={`Ver ${unidade.oportunidades_perdidas} oportunidades perdidas`}
                        >
                          <span className="font-bold text-sm text-red-400">{unidade.oportunidades_perdidas}</span>
                          <span className="text-[10px] text-gray-400">{currencyCompact.format(unidade.valor_perdido)}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-gray-950 border-gray-700 text-white text-xs">
                        {unidade.oportunidades_perdidas} perdidas • {currency.format(unidade.valor_perdido)}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Meta */}
                  <TableCell className="py-2.5 text-right">
                    <span className="font-semibold text-sm text-gray-300">{currencyCompact.format(unidade.meta_valor)}</span>
                  </TableCell>

                  {/* Faltante */}
                  <TableCell className="py-2.5 text-right">
                    <span className={cn(
                      "text-sm font-semibold",
                      faltante === 0 ? "text-green-400" : "text-gray-300"
                    )}>
                      {faltante === 0 ? "✓" : currencyCompact.format(faltante)}
                    </span>
                  </TableCell>

                  {/* Progresso */}
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Barra + % */}
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="h-2 w-20 rounded-full bg-gray-700 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", smartMeta.fillClass)}
                            style={{ width: `${smartMeta.percentualMeta}%` }}
                          />
                        </div>
                        <span className="font-black text-sm w-12 text-right text-white">{smartMeta.percentualMeta.toFixed(0)}%</span>
                      </div>

                      {/* Badge status */}
                      <Badge className={cn(
                        "text-[10px] px-1.5 py-0 h-5 font-semibold border whitespace-nowrap",
                        getStatusBadgeClass(smartMeta.statusKey)
                      )}>
                        {smartMeta.deviationPp !== null ? (
                          <>{smartMeta.deviationPp >= 0 ? "+" : ""}{smartMeta.deviationPp.toFixed(0)}pp</>
                        ) : (
                          smartMeta.statusLabel
                        )}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  )
})


