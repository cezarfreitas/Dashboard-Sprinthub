"use client"

import { memo, useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, XCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface MotivoPerda {
  motivo: string
  quantidade: number
  valor_total: number
  lost_time_medio: number
}

interface VendedorPerdas {
  vendedor_id: number
  vendedor_nome: string
  vendedor_sobrenome: string
  motivos: MotivoPerda[]
}

interface GestorMatrizPerdasVendedorProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

export const GestorMatrizPerdasVendedor = memo(function GestorMatrizPerdasVendedor({
  unidadeId,
  dataInicio,
  dataFim
}: GestorMatrizPerdasVendedorProps) {
  const [dados, setDados] = useState<VendedorPerdas[]>([])
  const [motivos, setMotivos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!unidadeId) {
      setDados([])
      setMotivos([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.append('unidade_id', unidadeId.toString())
      params.append('data_inicio', dataInicio)
      params.append('data_fim', dataFim)

      const response = await fetch(`/api/oportunidades/matriz-perdas-vendedor?${params.toString()}`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setDados(result.dados || [])
        setMotivos(result.motivos || [])
      } else {
        setDados([])
        setMotivos([])
      }
    } catch {
      setDados([])
      setMotivos([])
    } finally {
      setLoading(false)
    }
  }, [unidadeId, dataInicio, dataFim])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Criar mapa de motivos para vendedores (quantidade)
  const motivoVendedorMap = useMemo(() => {
    const map = new Map<string, Map<number, number>>()
    
    dados.forEach(vendedor => {
      vendedor.motivos.forEach(motivo => {
        if (!map.has(motivo.motivo)) {
          map.set(motivo.motivo, new Map())
        }
        const vendedorMap = map.get(motivo.motivo)!
        vendedorMap.set(vendedor.vendedor_id, motivo.quantidade)
      })
    })
    
    return map
  }, [dados])

  // Criar mapa de tempo médio por motivo e vendedor
  const motivoVendedorTempoMap = useMemo(() => {
    const map = new Map<string, Map<number, number>>()
    
    dados.forEach(vendedor => {
      vendedor.motivos.forEach(motivo => {
        if (!map.has(motivo.motivo)) {
          map.set(motivo.motivo, new Map())
        }
        const vendedorMap = map.get(motivo.motivo)!
        vendedorMap.set(vendedor.vendedor_id, motivo.lost_time_medio)
      })
    })
    
    return map
  }, [dados])

  // Calcular totais por motivo
  const totaisPorMotivo = useMemo(() => {
    const totais: Record<string, number> = {}
    
    dados.forEach(vendedor => {
      vendedor.motivos.forEach(motivo => {
        if (!totais[motivo.motivo]) {
          totais[motivo.motivo] = 0
        }
        totais[motivo.motivo] += motivo.quantidade
      })
    })
    
    return totais
  }, [dados])

  // Calcular tempo médio ponderado por motivo (média ponderada pela quantidade)
  const tempoMedioPorMotivo = useMemo(() => {
    const tempos: Record<string, { somaPonderada: number; totalQuantidade: number }> = {}
    
    dados.forEach(vendedor => {
      vendedor.motivos.forEach(motivo => {
        if (!tempos[motivo.motivo]) {
          tempos[motivo.motivo] = { somaPonderada: 0, totalQuantidade: 0 }
        }
        // Média ponderada: soma (tempo * quantidade) / soma (quantidade)
        tempos[motivo.motivo].somaPonderada += motivo.lost_time_medio * motivo.quantidade
        tempos[motivo.motivo].totalQuantidade += motivo.quantidade
      })
    })
    
    const medias: Record<string, number> = {}
    Object.keys(tempos).forEach(motivo => {
      const { somaPonderada, totalQuantidade } = tempos[motivo]
      medias[motivo] = totalQuantidade > 0 ? somaPonderada / totalQuantidade : 0
    })
    
    return medias
  }, [dados])

  // Ordenar motivos por total (maior para menor)
  const motivosOrdenados = useMemo(() => {
    return [...motivos].sort((a, b) => {
      const totalA = totaisPorMotivo[a] || 0
      const totalB = totaisPorMotivo[b] || 0
      return totalB - totalA // Ordenar do maior para o menor
    })
  }, [motivos, totaisPorMotivo])

  // Calcular totais por vendedor
  const totaisPorVendedor = useMemo(() => {
    const totais: Record<number, number> = {}
    
    dados.forEach(vendedor => {
      totais[vendedor.vendedor_id] = vendedor.motivos.reduce((sum, motivo) => sum + motivo.quantidade, 0)
    })
    
    return totais
  }, [dados])

  // Calcular total geral
  const totalGeral = useMemo(() => {
    return Object.values(totaisPorMotivo).reduce((sum, qtd) => sum + qtd, 0)
  }, [totaisPorMotivo])

  // Calcular tempo médio geral ponderado
  const tempoMedioGeral = useMemo(() => {
    let somaPonderada = 0
    let totalQuantidade = 0
    
    dados.forEach(vendedor => {
      vendedor.motivos.forEach(motivo => {
        somaPonderada += motivo.lost_time_medio * motivo.quantidade
        totalQuantidade += motivo.quantidade
      })
    })
    
    return totalQuantidade > 0 ? somaPonderada / totalQuantidade : 0
  }, [dados])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span>Matriz de Perdas por Motivo e Vendedor</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (dados.length === 0 || motivos.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span>Matriz de Perdas por Motivo e Vendedor</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-center text-muted-foreground py-4 text-xs">
            Nenhuma perda encontrada para o período selecionado.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 bg-red-600 rounded-full" />
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span>Matriz de Perdas por Motivo e Vendedor</span>
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Análise de oportunidades perdidas por motivo
              </p>
            </div>
          </div>
          {totalGeral > 0 && (
            <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
              Total: <span className="font-semibold text-red-600">{totalGeral}</span> {totalGeral === 1 ? 'perda' : 'perdas'}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-left font-semibold text-xs h-8 px-3 py-2 sticky left-0 bg-muted/50 z-10 min-w-[200px]">
                    Motivo de Perda
                  </TableHead>
                  {dados.map((vendedor) => (
                    <TableHead
                      key={vendedor.vendedor_id}
                      className="text-center font-semibold text-xs h-8 px-3 py-2 border-l border-gray-300 min-w-[100px]"
                    >
                      <div className="text-[10px] font-semibold">{vendedor.vendedor_nome}</div>
                      <div className="text-[9px] font-normal text-gray-600">{vendedor.vendedor_sobrenome}</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold text-xs h-8 px-3 py-2 border-l-2 border-gray-400 bg-muted min-w-[100px]">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {motivosOrdenados.map((motivo, index) => {
                  const vendedorMap = motivoVendedorMap.get(motivo) || new Map()
                  const tempoMap = motivoVendedorTempoMap.get(motivo) || new Map()
                  const totalMotivo = totaisPorMotivo[motivo] || 0
                  const tempoMedioMotivo = tempoMedioPorMotivo[motivo] || 0
                  
                  return (
                    <TableRow
                      key={motivo}
                      className={`hover:bg-muted/50 ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                      }`}
                    >
                      <TableCell className="font-medium text-xs px-3 py-2 sticky left-0 bg-inherit z-10">
                        {motivo}
                      </TableCell>
                      {dados.map((vendedor) => {
                        const quantidade = vendedorMap.get(vendedor.vendedor_id) || 0
                        const tempoMedio = tempoMap.get(vendedor.vendedor_id)
                        
                        return (
                          <TableCell
                            key={vendedor.vendedor_id}
                            className="text-center text-sm px-3 py-2 border-l border-gray-200"
                          >
                            {quantidade > 0 ? (
                              <span className="text-red-600 font-semibold whitespace-nowrap">
                                {quantidade}
                                {tempoMedio !== undefined && tempoMedio > 0 && (
                                  <span className="text-gray-600 font-normal"> / {Math.round(tempoMedio)}d</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-center text-sm px-3 py-2 border-l-2 border-gray-400 bg-muted font-bold">
                        <span className="text-red-700 whitespace-nowrap">
                          {totalMotivo}
                          {tempoMedioMotivo > 0 && (
                            <span className="text-gray-600 font-normal"> / {Math.round(tempoMedioMotivo)}d</span>
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* Linha de Total */}
                <TableRow className="bg-muted border-t-2 border-muted-foreground/30 font-bold">
                  <TableCell className="font-bold text-xs px-3 py-2 sticky left-0 bg-muted z-10">
                    TOTAL
                  </TableCell>
                  {dados.map((vendedor) => {
                    const total = totaisPorVendedor[vendedor.vendedor_id] || 0
                    // Calcular tempo médio ponderado do vendedor
                    let tempoMedioVendedor = 0
                    if (vendedor.motivos.length > 0) {
                      const somaPonderada = vendedor.motivos.reduce((sum, m) => sum + (m.lost_time_medio * m.quantidade), 0)
                      const totalQuantidade = vendedor.motivos.reduce((sum, m) => sum + m.quantidade, 0)
                      tempoMedioVendedor = totalQuantidade > 0 ? somaPonderada / totalQuantidade : 0
                    }
                    
                    return (
                      <TableCell
                        key={vendedor.vendedor_id}
                        className="text-center text-sm px-3 py-2 border-l border-gray-300 font-bold"
                      >
                        <span className="text-red-700 whitespace-nowrap">
                          {total}
                          {tempoMedioVendedor > 0 && (
                            <span className="text-gray-600 font-normal"> / {Math.round(tempoMedioVendedor)}d</span>
                          )}
                        </span>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center text-sm px-3 py-2 border-l-2 border-gray-400 bg-muted font-bold">
                    <span className="text-red-800 whitespace-nowrap">
                      {totalGeral}
                      {tempoMedioGeral > 0 && (
                        <span className="text-gray-600 font-normal"> / {Math.round(tempoMedioGeral)}d</span>
                      )}
                    </span>
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

