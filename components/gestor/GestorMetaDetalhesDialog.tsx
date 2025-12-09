"use client"

import { memo, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface VendedorMeta {
  vendedor_id: number
  vendedor_nome: string
  meta_valor: number
  realizado: number
  diferenca: number
  percentual: number
}

interface GestorMetaDetalhesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unidadeId: number | null
  mes: number
  ano: number
  metaTotal: number
  realizadoTotal: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export const GestorMetaDetalhesDialog = memo(function GestorMetaDetalhesDialog({
  open,
  onOpenChange,
  unidadeId,
  mes,
  ano,
  metaTotal,
  realizadoTotal
}: GestorMetaDetalhesDialogProps) {
  const [loading, setLoading] = useState(false)
  const [vendedores, setVendedores] = useState<VendedorMeta[]>([])

  useEffect(() => {
    if (open && unidadeId) {
      fetchDetalhes()
    }
  }, [open, unidadeId, mes, ano])

  const fetchDetalhes = async () => {
    if (!unidadeId) return

    try {
      setLoading(true)

      // Buscar metas dos vendedores
      const metaResponse = await fetch(
        `/api/meta/stats?unidade_id=${unidadeId}&mes=${mes}&ano=${ano}`
      )
      const metaData = await metaResponse.json()

      if (!metaData.success) {
        throw new Error(metaData.message || 'Erro ao buscar metas')
      }

      // Buscar realizados dos vendedores do mês
      const primeiroDiaMes = new Date(ano, mes - 1, 1)
      const ultimoDiaMes = new Date(ano, mes, 0)

      const formatarData = (data: Date) => {
        const ano = data.getFullYear()
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        const dia = String(data.getDate()).padStart(2, '0')
        return `${ano}-${mes}-${dia}`
      }

      const dataInicio = formatarData(primeiroDiaMes)
      const dataFim = formatarData(ultimoDiaMes)

      // Buscar vendedores da unidade
      const unidadeResponse = await fetch(`/api/unidades/${unidadeId}`)
      const unidadeData = await unidadeResponse.json()

      if (!unidadeData.success || !unidadeData.data?.users) {
        throw new Error('Erro ao buscar vendedores da unidade')
      }

      // Extrair IDs dos vendedores
      const vendedorIds = unidadeData.data.users
        .map((u: any) => {
          if (typeof u === 'object' && u !== null) {
            return u.id || u.user_id || u.vendedor_id
          } else if (typeof u === 'number') {
            return u
          } else if (typeof u === 'string') {
            const parsed = parseInt(u.trim())
            return !isNaN(parsed) ? parsed : null
          }
          return null
        })
        .filter((id: any) => id !== null)

      // Buscar realizado de cada vendedor
      const realizadoPromises = vendedorIds.map(async (vendedorId: number) => {
        const response = await fetch(
          `/api/oportunidades/stats?status=won&gain_date_start=${dataInicio}&gain_date_end=${dataFim}&user_id=${vendedorId}`
        )
        const data = await response.json()
        return {
          vendedor_id: vendedorId,
          realizado: data.success ? Number(data.data?.valor_ganhas || 0) : 0
        }
      })

      const realizados = await Promise.all(realizadoPromises)
      const realizadoMap = realizados.reduce((acc, item) => {
        acc[item.vendedor_id] = item.realizado
        return acc
      }, {} as Record<number, number>)

      // Combinar metas e realizados
      const vendedoresComDetalhes: VendedorMeta[] = metaData.metas.map((meta: any) => {
        const realizado = realizadoMap[meta.vendedor_id] || 0
        const diferenca = realizado - meta.meta_valor
        const percentual = meta.meta_valor > 0 ? (realizado / meta.meta_valor) * 100 : 0

        return {
          vendedor_id: meta.vendedor_id,
          vendedor_nome: meta.vendedor_nome,
          meta_valor: meta.meta_valor,
          realizado,
          diferenca,
          percentual
        }
      })

      // Ordenar por percentual (maior primeiro)
      vendedoresComDetalhes.sort((a, b) => b.percentual - a.percentual)

      setVendedores(vendedoresComDetalhes)
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error)
    } finally {
      setLoading(false)
    }
  }

  const mesNome = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const percentualTotal = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0
  const diferencaTotal = realizadoTotal - metaTotal

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-bold flex items-center justify-between">
            <span>Meta - {mesNome}</span>
            <div className={cn(
              "text-xl font-bold px-3 py-1 rounded-lg",
              percentualTotal >= 100 ? "text-green-600 bg-green-50" : percentualTotal >= 80 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50"
            )}>
              {percentualTotal.toFixed(1)}%
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Resumo Compacto */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-2 border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-500">Meta: </span>
                <span className="font-bold text-gray-900">{formatCurrency(metaTotal)}</span>
              </div>
              <div>
                <span className="text-gray-500">Real: </span>
                <span className="font-bold text-gray-900">{formatCurrency(realizadoTotal)}</span>
              </div>
            </div>
            <div>
              <span className={cn(
                "font-bold text-base",
                diferencaTotal >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {diferencaTotal >= 0 ? '+' : ''}{formatCurrency(diferencaTotal)}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Carregando detalhes...</span>
          </div>
        ) : vendedores.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum vendedor com meta cadastrada para este período
          </div>
        ) : (
          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-2">
              {vendedores.map((vendedor, index) => (
                <div
                  key={vendedor.vendedor_id}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 transition-all hover:shadow-sm",
                    vendedor.percentual >= 100 
                      ? "bg-green-50/50 border-green-200 hover:border-green-300" 
                      : vendedor.percentual >= 80 
                      ? "bg-yellow-50/50 border-yellow-200 hover:border-yellow-300"
                      : "bg-red-50/50 border-red-200 hover:border-red-300"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Nome e Ranking */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn(
                        "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                        index === 0 ? "bg-yellow-400 text-yellow-900" :
                        index === 1 ? "bg-gray-300 text-gray-700" :
                        index === 2 ? "bg-orange-400 text-orange-900" :
                        "bg-gray-200 text-gray-600"
                      )}>
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-sm text-gray-900 truncate">
                        {vendedor.vendedor_nome}
                      </h3>
                    </div>

                    {/* Valores Compactos */}
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      <div className="text-right">
                        <span className="text-gray-400">Meta: </span>
                        <span className="font-semibold text-gray-700">
                          {formatCurrency(vendedor.meta_valor)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400">Real: </span>
                        <span className="font-semibold text-gray-700">
                          {formatCurrency(vendedor.realizado)}
                        </span>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <span className={cn(
                          "font-bold text-xs inline-flex items-center gap-0.5",
                          vendedor.diferenca >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {vendedor.diferenca > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : vendedor.diferenca < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          <span>
                            {vendedor.diferenca >= 0 ? '+' : ''}{formatCurrency(vendedor.diferenca)}
                          </span>
                        </span>
                      </div>
                      
                      {/* Percentual */}
                      <div className={cn(
                        "px-2 py-1 rounded-md font-bold text-sm min-w-[60px] text-center",
                        vendedor.percentual >= 100 
                          ? "bg-green-100 text-green-700" 
                          : vendedor.percentual >= 80 
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {vendedor.percentual.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso compacta */}
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        vendedor.percentual >= 100 
                          ? "bg-gradient-to-r from-green-400 to-green-500" 
                          : vendedor.percentual >= 80 
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                          : "bg-gradient-to-r from-red-400 to-red-500"
                      )}
                      style={{ width: `${Math.min(100, vendedor.percentual)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
})

