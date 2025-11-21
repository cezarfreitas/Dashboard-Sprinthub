"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import AnalyticsFilters from "@/components/filters/AnalyticsFilters"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface FiltrosType {
  unidadesSelecionadas: number[]
  periodoInicio: string
  periodoFim: string
  funilSelecionado: string
  grupoSelecionado: string
}

interface MotivoPerda {
  motivo_id: number
  motivo: string
  total_oportunidades: number
  valor_total: number
  lost_time: number
}

interface VendedorMotivos {
  vendedor_id: number
  vendedor_nome: string
  total_oportunidades: number
  valor_total: number
  motivos: MotivoPerda[]
}

export default function MotivosPerdaPage() {
  const { user, loading: authLoading } = useAuth()
  const [filtros, setFiltros] = useState<FiltrosType>({
    unidadesSelecionadas: [],
    periodoInicio: '',
    periodoFim: '',
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos'
  })
  
  const [loading, setLoading] = useState(true)
  const [todosVendedores, setTodosVendedores] = useState<VendedorMotivos[]>([])
  const [sortField, setSortField] = useState<{ [key: number]: { field: string; direction: 'asc' | 'desc' } }>({})

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  const fetchData = useCallback(async () => {
    if (!filtros.periodoInicio || !filtros.periodoFim) {
      setTodosVendedores([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      params.append('lost_date_start', filtros.periodoInicio)
      params.append('lost_date_end', filtros.periodoFim)
      params.append('all', '1')
      
      if (filtros.unidadesSelecionadas.length > 0) {
        params.append('unidade_id', filtros.unidadesSelecionadas.join(','))
      }
      
      if (filtros.funilSelecionado !== 'todos' && filtros.funilSelecionado !== 'undefined') {
        params.append('funil_id', filtros.funilSelecionado)
      }

      const response = await fetch(`/api/oportunidades/lost?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const result = await response.json()
      
      if (result.success && result.data?.resumo_por_vendedor) {
        const vendedores: VendedorMotivos[] = []
        
        // result.data.resumo_por_vendedor é um array de unidades
        result.data.resumo_por_vendedor.forEach((unidade: any) => {
          // Cada unidade tem um array de vendedores
          if (unidade.vendedores && Array.isArray(unidade.vendedores)) {
            unidade.vendedores.forEach((vendedor: any) => {
              vendedores.push({
                vendedor_id: vendedor.vendedor_id,
                vendedor_nome: vendedor.vendedor_nome,
                total_oportunidades: vendedor.total_oportunidades || 0,
                valor_total: vendedor.valor_total || 0,
                motivos: vendedor.motivos || []
              })
            })
          }
        })
        
        setTodosVendedores(vendedores)
      } else {
        setTodosVendedores([])
      }
    } catch (error) {
      setTodosVendedores([])
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    if (!authLoading && user && filtros.periodoInicio && filtros.periodoFim) {
      fetchData()
    }
  }, [authLoading, user, filtros, fetchData])

  const totalGeralOportunidades = useMemo(() => {
    return todosVendedores.reduce((sum, v) => sum + v.total_oportunidades, 0)
  }, [todosVendedores])

  const totalGeralValor = useMemo(() => {
    return todosVendedores.reduce((sum, v) => sum + v.valor_total, 0)
  }, [todosVendedores])

  const sortMotivos = useCallback((motivos: MotivoPerda[], vendedorId: number, totalVendedor: number) => {
    const sort = sortField[vendedorId]
    if (!sort) return motivos

    const sorted = [...motivos].sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0

      switch (sort.field) {
        case 'motivo':
          aVal = a.motivo.toLowerCase()
          bVal = b.motivo.toLowerCase()
          break
        case 'quantidade':
          aVal = a.total_oportunidades
          bVal = b.total_oportunidades
          break
        case 'percentual':
          aVal = (a.total_oportunidades / totalVendedor) * 100
          bVal = (b.total_oportunidades / totalVendedor) * 100
          break
        case 'tempo':
          aVal = a.lost_time
          bVal = b.lost_time
          break
        case 'valor':
          aVal = a.valor_total
          bVal = b.valor_total
          break
      }

      if (typeof aVal === 'string') {
        return sort.direction === 'asc' 
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
      }

      return sort.direction === 'asc' ? aVal - bVal : bVal - aVal
    })

    return sorted
  }, [sortField])

  const handleSort = (vendedorId: number, field: string) => {
    setSortField(prev => {
      const current = prev[vendedorId]
      if (current?.field === field) {
        return {
          ...prev,
          [vendedorId]: {
            field,
            direction: current.direction === 'asc' ? 'desc' : 'asc'
          }
        }
      }
      return {
        ...prev,
        [vendedorId]: {
          field,
          direction: 'desc'
        }
      }
    })
  }

  const SortableHeader = ({ vendedorId, field, children, align = 'center' }: {
    vendedorId: number
    field: string
    children: React.ReactNode
    align?: 'left' | 'center' | 'right'
  }) => {
    const sort = sortField[vendedorId]
    const isActive = sort?.field === field
    const direction = isActive ? sort.direction : null

    return (
      <TableHead 
        className={`text-${align} cursor-pointer select-none hover:bg-gray-800/50 transition-colors`}
        onClick={() => handleSort(vendedorId, field)}
      >
        <div className="flex items-center justify-center gap-1">
          {children}
          {isActive && (
            <span className="text-[8px]">
              {direction === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      </TableHead>
    )
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <div className="w-full overflow-y-auto scrollbar-hide">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Motivos de Perda
              </h1>
              <p className="text-gray-400 text-sm">
                Análise detalhada de motivos de perda de oportunidades
              </p>
            </div>

            {/* Filtros */}
            <AnalyticsFilters onFiltersChange={setFiltros} />

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-8 w-64 bg-gray-800" />
              </div>
            ) : (
              <>
                {todosVendedores.length > 0 && (
                  <div className="rounded-lg border border-gray-800 bg-gray-900/50 text-card-foreground shadow-sm mb-4">
                    <CardHeader className="py-2.5 px-4 flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                          <TrendingDown className="h-4 w-4" />
                          Motivos de Perda por Vendedor
                        </CardTitle>
                        <CardDescription className="text-[10px] mt-0.5 text-gray-400">
                          Distribuição de oportunidades perdidas no período
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400">Total</div>
                          <div className="font-semibold text-sm text-white">{totalGeralOportunidades} ops</div>
                        </div>
                        {totalGeralValor > 0 && (
                          <div className="text-right border-l border-gray-700 pl-3">
                            <div className="text-[10px] text-gray-400">Valor</div>
                            <div className="font-semibold text-sm text-white">
                              {formatCurrency(totalGeralValor)}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todosVendedores.map(vendedor => (
                    <Card key={vendedor.vendedor_id} className="border-gray-800 bg-gray-900">
                      <CardHeader className="pb-2 px-3 pt-3 bg-gray-800/50">
                        <CardTitle className="text-sm font-semibold text-white">
                          {vendedor.vendedor_nome}
                        </CardTitle>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{vendedor.total_oportunidades} oportunidades</span>
                          {vendedor.valor_total > 0 && (
                            <span>
                              {formatCurrency(vendedor.valor_total)}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 px-0">
                        {vendedor.motivos.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent border-gray-800">
                                  <SortableHeader vendedorId={vendedor.vendedor_id} field="motivo" align="left">
                                    <span className="text-xs text-gray-400">Motivo</span>
                                  </SortableHeader>
                                  <SortableHeader vendedorId={vendedor.vendedor_id} field="quantidade">
                                    <span className="text-xs text-gray-400">Qtd</span>
                                  </SortableHeader>
                                  <SortableHeader vendedorId={vendedor.vendedor_id} field="percentual">
                                    <span className="text-xs text-gray-400">%</span>
                                  </SortableHeader>
                                  <SortableHeader vendedorId={vendedor.vendedor_id} field="tempo">
                                    <span className="text-xs text-gray-400">Tempo</span>
                                  </SortableHeader>
                                  <SortableHeader vendedorId={vendedor.vendedor_id} field="valor" align="right">
                                    <span className="text-xs text-gray-400">Valor</span>
                                  </SortableHeader>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortMotivos(vendedor.motivos, vendedor.vendedor_id, vendedor.total_oportunidades)
                                  .map((motivo, idx) => (
                                    <TableRow key={motivo.motivo_id || `vendedor-${vendedor.vendedor_id}-motivo-${idx}`} className="hover:bg-gray-800/30 border-gray-800">
                                      <TableCell className="text-xs py-1.5 px-3 text-white">
                                        <div className="truncate max-w-[200px]" title={motivo.motivo}>
                                          {motivo.motivo}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center text-xs font-semibold py-1.5 px-1 text-white">
                                        {motivo.total_oportunidades}
                                      </TableCell>
                                      <TableCell className="text-center py-1.5 px-1">
                                        <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                          {((motivo.total_oportunidades / vendedor.total_oportunidades) * 100).toFixed(1)}%
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center text-xs text-gray-400 py-1.5 px-1">
                                        {motivo.lost_time}d
                                      </TableCell>
                                      <TableCell className="text-right text-xs font-medium py-1.5 px-3 text-white">
                                        {motivo.valor_total > 0 ? (
                                          <span>
                                            {formatCurrency(motivo.valor_total)}
                                          </span>
                                        ) : (
                                          <span className="text-gray-600">-</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 text-center py-4">
                            Nenhum motivo registrado
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {todosVendedores.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Nenhum dado encontrado para o período selecionado</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
