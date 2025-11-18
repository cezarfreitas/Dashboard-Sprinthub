"use client"

import { memo, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchWithCache } from "@/lib/apiCache"

interface VendedorPerformance {
  id: number
  nome: string
  criadas: number
  ganhas: number
  perdidas: number
  abertas: number
  valor: number
  meta: number
  won_time_dias: number | null
  taxa_conversao?: number
  ticket_medio?: number
  isGestor?: boolean
}

interface GestorPerformanceVendedoresProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

export const GestorPerformanceVendedores = memo(function GestorPerformanceVendedores({
  unidadeId,
  dataInicio,
  dataFim
}: GestorPerformanceVendedoresProps) {
  const [vendedores, setVendedores] = useState<VendedorPerformance[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = useCallback((value: number): string => {
    const numValue = Number(value) || 0
    if (isNaN(numValue)) return '0'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue).replace('R$', '').trim()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!unidadeId) {
        setVendedores([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.append('unidadeId', unidadeId.toString())
        params.append('dataInicio', dataInicio)
        params.append('dataFim', dataFim)
        
        const result = await fetchWithCache(`/api/unidades/resumo?${params.toString()}`)
        
        if (result.success && result.unidades && result.unidades.length > 0) {
          const unidade = result.unidades[0]
          
          const vendedoresData = (unidade.vendedores || []).map((v: any) => {
            const criadas = Number(v.criadas) || 0
            const ganhas = Number(v.ganhas) || 0
            const valor = Number(v.valor) || 0
            const meta = Number(v.meta) || 0
            
            // Calcular taxa de conversão
            const taxaConversao = criadas > 0 ? (ganhas / criadas) * 100 : 0
            
            // Calcular ticket médio
            const ticketMedio = ganhas > 0 ? valor / ganhas : 0
            
            return {
              id: v.id,
              nome: v.nome || '',
              criadas,
              ganhas,
              perdidas: Number(v.perdidas) || 0,
              abertas: Number(v.abertas) || 0,
              valor,
              meta,
              won_time_dias: v.won_time_dias !== null && v.won_time_dias !== undefined ? Number(v.won_time_dias) : null,
              taxa_conversao: taxaConversao,
              ticket_medio: ticketMedio,
              isGestor: v.isGestor || false
            }
          })
          
          setVendedores(vendedoresData)
        } else {
          setVendedores([])
        }
      } catch {
        setVendedores([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [unidadeId, dataInicio, dataFim])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Performance por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (vendedores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Performance por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6 text-xs">
            Nenhum vendedor encontrado.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calcular totais
  const totalCriadas = vendedores.reduce((sum, v) => sum + v.criadas, 0)
  const totalPerdidas = vendedores.reduce((sum, v) => sum + v.perdidas, 0)
  const totalGanhas = vendedores.reduce((sum, v) => sum + v.ganhas, 0)
  const totalAbertas = vendedores.reduce((sum, v) => sum + v.abertas, 0)
  const totalValor = vendedores.reduce((sum, v) => sum + v.valor, 0)
  const totalMeta = vendedores.reduce((sum, v) => sum + v.meta, 0)
  const percentualMetaTotal = totalMeta > 0 ? (totalValor / totalMeta) * 100 : 0
  const taxaConversaoTotal = totalCriadas > 0 ? (totalGanhas / totalCriadas) * 100 : 0
  const ticketMedioTotal = totalGanhas > 0 ? totalValor / totalGanhas : 0
  
  // Calcular média de won_time
  const vendedoresComWonTime = vendedores.filter(v => v.won_time_dias !== null && v.won_time_dias > 0)
  const mediaWonTime = vendedoresComWonTime.length > 0
    ? Math.round(vendedoresComWonTime.reduce((sum, v) => sum + (v.won_time_dias || 0), 0) / vendedoresComWonTime.length)
    : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 bg-blue-600 rounded-full" />
          <div>
            <CardTitle className="text-base font-bold text-gray-900">
              Performance por Vendedor
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Análise detalhada de resultados individuais
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-left min-w-[120px] font-semibold text-xs h-8 px-2 py-1.5">
                    Vendedor
                  </TableHead>
                  <TableHead className="text-center min-w-[60px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Criados
                  </TableHead>
                  <TableHead className="text-center min-w-[50px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Per.
                  </TableHead>
                  <TableHead className="text-center min-w-[50px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Gan.
                  </TableHead>
                  <TableHead className="text-center min-w-[50px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Abe.
                  </TableHead>
                  <TableHead className="text-right min-w-[90px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Valor / %
                  </TableHead>
                  <TableHead className="text-right min-w-[80px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Meta
                  </TableHead>
                  <TableHead className="text-center min-w-[50px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    W.T
                  </TableHead>
                  <TableHead className="text-center min-w-[60px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    T.C%
                  </TableHead>
                  <TableHead className="text-right min-w-[70px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    T.Méd
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.map((vendedor, index) => {
                  const percentualMeta = vendedor.meta > 0 ? (vendedor.valor / vendedor.meta) * 100 : 0
                  
                  return (
                    <TableRow 
                      key={vendedor.id} 
                      className={`hover:bg-muted/50 ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                      }`}
                    >
                      <TableCell className="font-medium whitespace-nowrap text-xs px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          {vendedor.nome}
                          {vendedor.isGestor && (
                            <span className="text-[8px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                              G
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-green-600 font-semibold text-xs px-1.5 py-1.5">
                        {vendedor.criadas}
                      </TableCell>
                      <TableCell className="text-center text-red-600 font-semibold text-xs px-1.5 py-1.5">
                        {vendedor.perdidas}
                      </TableCell>
                      <TableCell className="text-center text-emerald-600 font-semibold text-xs px-1.5 py-1.5">
                        {vendedor.ganhas}
                      </TableCell>
                      <TableCell className="text-center text-yellow-600 font-semibold text-xs px-1.5 py-1.5">
                        {vendedor.abertas}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-semibold text-xs px-1.5 py-1.5">
                        <div className="flex items-center justify-end gap-1">
                          <span>{formatCurrency(vendedor.valor)}</span>
                          {vendedor.meta > 0 && (
                            <span className={`text-[9px] ${
                              percentualMeta >= 100 
                                ? 'text-green-600' 
                                : 'text-orange-600'
                            }`}>
                              ({percentualMeta.toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-purple-600 font-semibold text-xs px-1.5 py-1.5">
                        {formatCurrency(vendedor.meta)}
                      </TableCell>
                      <TableCell className="text-center text-indigo-600 font-semibold text-xs px-1.5 py-1.5">
                        {vendedor.won_time_dias !== null 
                          ? `${vendedor.won_time_dias}d` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center text-emerald-600 font-semibold text-xs px-1.5 py-1.5">
                        {vendedor.taxa_conversao !== undefined 
                          ? `${vendedor.taxa_conversao.toFixed(0)}%` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right text-teal-600 font-semibold text-xs px-1.5 py-1.5">
                        {vendedor.ticket_medio !== undefined && vendedor.ticket_medio > 0
                          ? formatCurrency(vendedor.ticket_medio)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* Linha de Total */}
                <TableRow className="bg-muted border-t-2 border-muted-foreground/30 font-bold">
                  <TableCell className="font-bold text-xs px-2 py-1.5">TOTAL</TableCell>
                  <TableCell className="text-center text-green-700 font-bold text-xs px-1.5 py-1.5">
                    {totalCriadas}
                  </TableCell>
                  <TableCell className="text-center text-red-700 font-bold text-xs px-1.5 py-1.5">
                    {totalPerdidas}
                  </TableCell>
                  <TableCell className="text-center text-emerald-700 font-bold text-xs px-1.5 py-1.5">
                    {totalGanhas}
                  </TableCell>
                  <TableCell className="text-center text-yellow-700 font-bold text-xs px-1.5 py-1.5">
                    {totalAbertas}
                  </TableCell>
                  <TableCell className="text-right text-blue-700 font-bold text-xs px-1.5 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <span>{formatCurrency(totalValor)}</span>
                      {totalMeta > 0 && (
                        <span className={`text-[9px] ${
                          percentualMetaTotal >= 100 
                            ? 'text-green-700' 
                            : 'text-orange-700'
                        }`}>
                          ({percentualMetaTotal.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-purple-700 font-bold text-xs px-1.5 py-1.5">
                    {formatCurrency(totalMeta)}
                  </TableCell>
                  <TableCell className="text-center text-indigo-700 font-bold text-xs px-1.5 py-1.5">
                    {mediaWonTime !== null ? `${mediaWonTime}d` : '-'}
                  </TableCell>
                  <TableCell className="text-center text-emerald-700 font-bold text-xs px-1.5 py-1.5">
                    {taxaConversaoTotal > 0 ? `${taxaConversaoTotal.toFixed(0)}%` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-teal-700 font-bold text-xs px-1.5 py-1.5">
                    {ticketMedioTotal > 0 ? formatCurrency(ticketMedioTotal) : '-'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

