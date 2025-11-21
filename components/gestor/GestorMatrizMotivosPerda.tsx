"use client"

import { memo, useEffect, useState } from "react"
import { AlertCircle, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface MotivoPerda {
  motivo_id: number | null
  motivo: string
  total_oportunidades: number
  valor_total: number
  lost_time: number
  percentual: string
}

interface VendedorMotivo {
  vendedor_id: number
  vendedor_nome: string
  total_oportunidades: number
  valor_total: number
  motivos: MotivoPerda[]
}

interface UnidadeResumo {
  unidade_id: number
  unidade_nome: string
  vendedores: VendedorMotivo[]
}

interface GestorMatrizMotivosPerdaProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

type SortField = 'motivo' | 'quantidade' | 'percentual' | 'tempo' | 'valor'
type SortDirection = 'asc' | 'desc' | null

export const GestorMatrizMotivosPerda = memo(function GestorMatrizMotivosPerda({
  unidadeId,
  dataInicio,
  dataFim
}: GestorMatrizMotivosPerdaProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [motivosPerda, setMotivosPerda] = useState<MotivoPerda[]>([])
  const [resumoPorVendedor, setResumoPorVendedor] = useState<UnidadeResumo[]>([])
  const [sortConfig, setSortConfig] = useState<Record<number, { field: SortField; direction: SortDirection }>>({})

  useEffect(() => {
    if (!unidadeId || !dataInicio || !dataFim) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.append('unidade_id', unidadeId.toString())
        params.append('lost_date_start', dataInicio)
        params.append('lost_date_end', dataFim)
        params.append('all', '1')

        const response = await fetch(`/api/oportunidades/lost?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setMotivosPerda(data.data.motivos_perda || [])
          setResumoPorVendedor(data.data.resumo_por_vendedor || [])
        } else {
          setError(data.message || 'Erro ao carregar dados')
        }
      } catch (err) {
        setError('Erro ao buscar dados de motivos de perda')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [unidadeId, dataInicio, dataFim])

  if (!unidadeId) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Carregando motivos de perda...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  // Coletar todos os vendedores únicos
  const todosVendedores: VendedorMotivo[] = []
  resumoPorVendedor.forEach(unidade => {
    unidade.vendedores.forEach(vendedor => {
      if (!todosVendedores.find(v => v.vendedor_id === vendedor.vendedor_id)) {
        todosVendedores.push(vendedor)
      }
    })
  })

  // Se não houver dados, não mostrar
  if (motivosPerda.length === 0 && todosVendedores.length === 0) {
    return null
  }

  // Calcular totais gerais
  const totalGeralOportunidades = motivosPerda.reduce((sum, m) => sum + m.total_oportunidades, 0)
  const totalGeralValor = motivosPerda.reduce((sum, m) => sum + m.valor_total, 0)

  // Função para ordenar motivos de um vendedor
  const sortMotivos = (motivos: MotivoPerda[], vendedorId: number, totalVendedor: number) => {
    const config = sortConfig[vendedorId]
    if (!config || !config.direction) {
      // Ordenação padrão: por quantidade (desc)
      return [...motivos].sort((a, b) => b.total_oportunidades - a.total_oportunidades)
    }

    const sorted = [...motivos].sort((a, b) => {
      let comparison = 0

      switch (config.field) {
        case 'motivo':
          comparison = a.motivo.localeCompare(b.motivo)
          break
        case 'quantidade':
          comparison = a.total_oportunidades - b.total_oportunidades
          break
        case 'percentual':
          const percentA = (a.total_oportunidades / totalVendedor) * 100
          const percentB = (b.total_oportunidades / totalVendedor) * 100
          comparison = percentA - percentB
          break
        case 'tempo':
          comparison = a.lost_time - b.lost_time
          break
        case 'valor':
          comparison = a.valor_total - b.valor_total
          break
      }

      return config.direction === 'asc' ? comparison : -comparison
    })

    return sorted
  }

  // Função para alternar ordenação
  const handleSort = (vendedorId: number, field: SortField) => {
    setSortConfig(prev => {
      const current = prev[vendedorId]
      if (current?.field === field) {
        // Alternar direção: null -> asc -> desc -> null
        if (current.direction === null) {
          return { ...prev, [vendedorId]: { field, direction: 'asc' } }
        } else if (current.direction === 'asc') {
          return { ...prev, [vendedorId]: { field, direction: 'desc' } }
        } else {
          return { ...prev, [vendedorId]: { field, direction: null } }
        }
      } else {
        // Novo campo: começar com asc
        return { ...prev, [vendedorId]: { field, direction: 'asc' } }
      }
    })
  }

  // Componente de header ordenável
  const SortableHeader = ({ vendedorId, field, children, align = 'center' }: { vendedorId: number; field: SortField; children: React.ReactNode; align?: 'left' | 'center' | 'right' }) => {
    const config = sortConfig[vendedorId]
    const isActive = config?.field === field
    const direction = isActive ? config.direction : null

    const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'

    return (
      <TableHead className={`${alignClass} text-xs h-10 px-1.5 font-medium text-muted-foreground`}>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-semibold hover:bg-transparent"
          onClick={() => handleSort(vendedorId, field)}
        >
          <div className={`flex items-center gap-1 ${justifyClass}`}>
            {children}
            {direction === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : direction === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </div>
        </Button>
      </TableHead>
    )
  }

  return (
    <>
      {/* Cards por Vendedor - cada um formatado separadamente */}
      {todosVendedores.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Motivos de Perda por Vendedor
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Distribuição de oportunidades perdidas no período
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">Total</div>
                <div className="font-semibold text-sm">{totalGeralOportunidades} ops</div>
              </div>
              {totalGeralValor > 0 && (
                <div className="text-right border-l pl-3">
                  <div className="text-[10px] text-muted-foreground">Valor</div>
                  <div className="font-semibold text-sm">
                    R$ {totalGeralValor.toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todosVendedores.map(vendedor => (
              <Card key={vendedor.vendedor_id} className="border-gray-200">
                <CardHeader className="bg-muted/50 py-2.5 px-4 flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      {vendedor.vendedor_nome}
                    </CardTitle>
                    <CardDescription className="text-[10px] mt-0.5">
                      {vendedor.total_oportunidades} oportunidades
                      {vendedor.valor_total > 0 && (
                        <span className="ml-2">
                          • R$ {vendedor.valor_total.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          })}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {vendedor.motivos.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <SortableHeader vendedorId={vendedor.vendedor_id} field="motivo" align="left">
                              <span className="text-xs">Motivo</span>
                            </SortableHeader>
                            <SortableHeader vendedorId={vendedor.vendedor_id} field="quantidade">
                              <span className="text-xs">Qtd</span>
                            </SortableHeader>
                            <SortableHeader vendedorId={vendedor.vendedor_id} field="percentual">
                              <span className="text-xs">%</span>
                            </SortableHeader>
                            <SortableHeader vendedorId={vendedor.vendedor_id} field="tempo">
                              <span className="text-xs">Tempo</span>
                            </SortableHeader>
                            <SortableHeader vendedorId={vendedor.vendedor_id} field="valor" align="right">
                              <span className="text-xs">Valor</span>
                            </SortableHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortMotivos(vendedor.motivos, vendedor.vendedor_id, vendedor.total_oportunidades)
                            .map((motivo, idx) => (
                              <TableRow key={motivo.motivo_id || `vendedor-${vendedor.vendedor_id}-motivo-${idx}`} className="hover:bg-muted/30">
                                <TableCell className="text-xs py-1.5 px-3">
                                  <div className="truncate max-w-[200px]" title={motivo.motivo}>
                                    {motivo.motivo}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-xs font-semibold py-1.5 px-1">
                                  {motivo.total_oportunidades}
                                </TableCell>
                                <TableCell className="text-center py-1.5 px-1">
                                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                                    {((motivo.total_oportunidades / vendedor.total_oportunidades) * 100).toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground py-1.5 px-1">
                                  {motivo.lost_time}d
                                </TableCell>
                                <TableCell className="text-right text-xs font-medium py-1.5 px-3">
                                  {motivo.valor_total > 0 ? (
                                    <span>
                                      R$ {motivo.valor_total.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/50">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Nenhum motivo registrado
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  )
})

