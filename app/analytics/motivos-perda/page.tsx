"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import AnalyticsFilters from "@/components/filters/AnalyticsFilters"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingDown, Building2, Users } from "lucide-react"
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
  motivo_id: number | null
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

interface UnidadeMotivos {
  unidade_id: number
  unidade_nome: string
  vendedores: VendedorMotivos[]
}

interface ApiResponse {
  success: boolean
  data?: {
    motivos_perda?: MotivoPerda[]
    resumo_por_vendedor?: Array<{
      unidade_id: number
      unidade_nome: string
      vendedores: VendedorMotivos[]
    }>
    totais?: {
      total_oportunidades: number
      valor_total: number
      total_motivos: number
    }
  }
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
  
  const [loading, setLoading] = useState(false)
  const [filtrosInicializados, setFiltrosInicializados] = useState(false)
  const [unidades, setUnidades] = useState<UnidadeMotivos[]>([])
  const [todosVendedores, setTodosVendedores] = useState<VendedorMotivos[]>([])
  const [motivosGerais, setMotivosGerais] = useState<MotivoPerda[]>([])
  const [totais, setTotais] = useState({ total_oportunidades: 0, valor_total: 0, total_motivos: 0 })
  const [activeTab, setActiveTab] = useState<'unidades' | 'vendedores' | 'motivos'>('unidades')
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
      setUnidades([])
      setTodosVendedores([])
      setMotivosGerais([])
      setTotais({ total_oportunidades: 0, valor_total: 0, total_motivos: 0 })
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
      
      const apiUrl = `/api/oportunidades/lost?${params.toString()}`
      
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const result: ApiResponse = await response.json()
      
      if (result.success && result.data) {
        // Processar resumo por unidade e vendedor
        if (result.data.resumo_por_vendedor && Array.isArray(result.data.resumo_por_vendedor)) {
          const unidadesData: UnidadeMotivos[] = result.data.resumo_por_vendedor.map((unidade: any) => ({
            unidade_id: unidade.unidade_id,
            unidade_nome: unidade.unidade_nome || 'Sem unidade',
            vendedores: (unidade.vendedores || []).map((v: any) => ({
              vendedor_id: v.vendedor_id,
              vendedor_nome: v.vendedor_nome || 'Desconhecido',
              total_oportunidades: Number(v.total_oportunidades || 0),
              valor_total: Number(v.valor_total || 0),
              motivos: (v.motivos || []).map((m: any) => ({
                motivo_id: m.motivo_id,
                motivo: m.motivo || 'Sem motivo',
                total_oportunidades: Number(m.total_oportunidades || 0),
                valor_total: Number(m.valor_total || 0),
                lost_time: Number(m.lost_time || 0)
              }))
            }))
          }))
          
          setUnidades(unidadesData)
          
          // Flatten todos os vendedores para a aba de vendedores
          const todosVendedoresData: VendedorMotivos[] = []
          unidadesData.forEach(unidade => {
            unidade.vendedores.forEach(vendedor => {
              todosVendedoresData.push(vendedor)
            })
          })
          setTodosVendedores(todosVendedoresData)
        } else {
          setUnidades([])
          setTodosVendedores([])
        }

        // Processar motivos gerais
        if (result.data.motivos_perda && Array.isArray(result.data.motivos_perda)) {
          setMotivosGerais(result.data.motivos_perda.map((m: any) => ({
            motivo_id: m.motivo_id,
            motivo: m.motivo || 'Sem motivo',
            total_oportunidades: Number(m.total_oportunidades || 0),
            valor_total: Number(m.valor_total || 0),
            lost_time: Number(m.lost_time || 0)
          })))
        } else {
          setMotivosGerais([])
        }

        // Processar totais
        if (result.data.totais) {
          setTotais({
            total_oportunidades: Number(result.data.totais.total_oportunidades || 0),
            valor_total: Number(result.data.totais.valor_total || 0),
            total_motivos: Number(result.data.totais.total_motivos || 0)
          })
        }
      } else {
        setUnidades([])
        setTodosVendedores([])
        setMotivosGerais([])
        setTotais({ total_oportunidades: 0, valor_total: 0, total_motivos: 0 })
      }
    } catch (error) {
      setUnidades([])
      setTodosVendedores([])
      setMotivosGerais([])
      setTotais({ total_oportunidades: 0, valor_total: 0, total_motivos: 0 })
    } finally {
      setLoading(false)
    }
  }, [filtros])

  // Marcar filtros como inicializados quando as datas e unidades forem definidas
  useEffect(() => {
    if (filtros.periodoInicio && filtros.periodoFim && filtros.unidadesSelecionadas.length > 0) {
      setFiltrosInicializados(true)
    }
  }, [filtros.periodoInicio, filtros.periodoFim, filtros.unidadesSelecionadas.length])

  useEffect(() => {
    if (!authLoading && user && filtrosInicializados) {
      fetchData()
    }
  }, [authLoading, user, filtrosInicializados, fetchData])

  const totalGeralOportunidades = useMemo(() => {
    return totais.total_oportunidades || todosVendedores.reduce((sum, v) => sum + v.total_oportunidades, 0)
  }, [totais, todosVendedores])

  const totalGeralValor = useMemo(() => {
    return totais.valor_total || todosVendedores.reduce((sum, v) => sum + v.valor_total, 0)
  }, [totais, todosVendedores])

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

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
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
        className={`text-${align} cursor-pointer select-none hover:bg-gray-100 transition-colors`}
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <div className="w-full overflow-y-auto scrollbar-hide">
          <div className="px-6 pb-6 pt-0">
            {/* Cabeçalho e Filtros na mesma linha */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                Motivos de Perda
              </h1>
              <div className="flex-1 min-w-[300px]">
                <AnalyticsFilters onFiltersChange={setFiltros} />
              </div>
            </div>

            {/* Resumo geral */}
            {(totalGeralOportunidades > 0 || loading) && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 text-card-foreground shadow-sm mb-6 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                      <TrendingDown className="h-4 w-4" />
                      Resumo Geral
                    </h2>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Oportunidades perdidas no período selecionado
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-600">Total Perdidas</div>
                      <div className="font-semibold text-lg text-gray-900">{totalGeralOportunidades}</div>
                      <div className="text-[10px] text-gray-500">oportunidades</div>
                    </div>
                    {totalGeralValor > 0 && (
                      <div className="text-right border-l border-gray-300 pl-6">
                        <div className="text-[10px] text-gray-600">Valor Total</div>
                        <div className="font-semibold text-lg text-gray-900">
                          {formatCurrency(totalGeralValor)}
                        </div>
                        <div className="text-[10px] text-gray-500">perdido</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="text-sm text-gray-600">Carregando dados...</p>
                </div>
              </div>
            ) : totalGeralOportunidades > 0 ? (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
                  <TabsTrigger value="unidades" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Unidades
                  </TabsTrigger>
                  <TabsTrigger value="vendedores" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Vendedores
                  </TabsTrigger>
                  <TabsTrigger value="motivos" className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Motivos
                  </TabsTrigger>
                </TabsList>

                {/* Análise por Unidades */}
                <TabsContent value="unidades" className="space-y-4">
                  {unidades.map(unidade => {
                    const totalUnidade = unidade.vendedores.reduce((sum, v) => sum + v.total_oportunidades, 0)
                    const valorUnidade = unidade.vendedores.reduce((sum, v) => sum + v.valor_total, 0)
                    return (
                      <Card key={unidade.unidade_id} className="border-gray-200 bg-white">
                        <CardHeader className="pb-3 px-4 pt-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {unidade.unidade_nome}
                              </CardTitle>
                              <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                                <span>{unidade.vendedores.length} vendedor{unidade.vendedores.length !== 1 ? 'es' : ''}</span>
                                <span>{totalUnidade} oportunidades</span>
                                {valorUnidade > 0 && <span>{formatCurrency(valorUnidade)}</span>}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 px-4 pb-4">
                          <div className="space-y-4">
                            {unidade.vendedores.map(vendedor => (
                              <div key={vendedor.vendedor_id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-gray-900">{vendedor.vendedor_nome}</h4>
                                  <div className="flex items-center gap-3 text-xs text-gray-600">
                                    <span>{vendedor.total_oportunidades} ops</span>
                                    {vendedor.valor_total > 0 && <span>{formatCurrency(vendedor.valor_total)}</span>}
                                  </div>
                                </div>
                                {vendedor.motivos.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent border-gray-200">
                                          <SortableHeader vendedorId={vendedor.vendedor_id} field="motivo" align="left">
                                            <span className="text-xs text-gray-600">Motivo</span>
                                          </SortableHeader>
                                          <SortableHeader vendedorId={vendedor.vendedor_id} field="quantidade">
                                            <span className="text-xs text-gray-600">Qtd</span>
                                          </SortableHeader>
                                          <SortableHeader vendedorId={vendedor.vendedor_id} field="percentual">
                                            <span className="text-xs text-gray-600">%</span>
                                          </SortableHeader>
                                          <SortableHeader vendedorId={vendedor.vendedor_id} field="tempo">
                                            <span className="text-xs text-gray-600">Tempo</span>
                                          </SortableHeader>
                                          <SortableHeader vendedorId={vendedor.vendedor_id} field="valor" align="right">
                                            <span className="text-xs text-gray-600">Valor</span>
                                          </SortableHeader>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {sortMotivos(vendedor.motivos, vendedor.vendedor_id, vendedor.total_oportunidades)
                                          .map((motivo, idx) => (
                                            <TableRow key={motivo.motivo_id || `vendedor-${vendedor.vendedor_id}-motivo-${idx}`} className="hover:bg-gray-50 border-gray-200">
                                              <TableCell className="text-xs py-1.5 px-3 text-gray-900">
                                                <div className="truncate max-w-[200px]" title={motivo.motivo}>
                                                  {motivo.motivo}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-center text-xs font-semibold py-1.5 px-1 text-gray-900">
                                                {motivo.total_oportunidades}
                                              </TableCell>
                                              <TableCell className="text-center py-1.5 px-1">
                                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                                  {((motivo.total_oportunidades / vendedor.total_oportunidades) * 100).toFixed(1)}%
                                                </span>
                                              </TableCell>
                                              <TableCell className="text-center text-xs text-gray-600 py-1.5 px-1">
                                                {motivo.lost_time}d
                                              </TableCell>
                                              <TableCell className="text-right text-xs font-medium py-1.5 px-3 text-gray-900">
                                                {motivo.valor_total > 0 ? formatCurrency(motivo.valor_total) : <span className="text-gray-400">-</span>}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-600 text-center py-4">
                                    Nenhum motivo registrado
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </TabsContent>

                {/* Análise por Vendedores */}
                <TabsContent value="vendedores" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {todosVendedores.map(vendedor => (
                      <Card key={vendedor.vendedor_id} className="border-gray-200 bg-white">
                        <CardHeader className="pb-2 px-3 pt-3 bg-gray-50">
                          <CardTitle className="text-sm font-semibold text-gray-900">
                            {vendedor.vendedor_nome}
                          </CardTitle>
                          <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                            <span>{vendedor.total_oportunidades} oportunidades</span>
                            {vendedor.valor_total > 0 && (
                              <span>{formatCurrency(vendedor.valor_total)}</span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 px-0">
                          {vendedor.motivos.length > 0 ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-gray-200">
                                    <SortableHeader vendedorId={vendedor.vendedor_id} field="motivo" align="left">
                                      <span className="text-xs text-gray-600">Motivo</span>
                                    </SortableHeader>
                                    <SortableHeader vendedorId={vendedor.vendedor_id} field="quantidade">
                                      <span className="text-xs text-gray-600">Qtd</span>
                                    </SortableHeader>
                                    <SortableHeader vendedorId={vendedor.vendedor_id} field="percentual">
                                      <span className="text-xs text-gray-600">%</span>
                                    </SortableHeader>
                                    <SortableHeader vendedorId={vendedor.vendedor_id} field="tempo">
                                      <span className="text-xs text-gray-600">Tempo</span>
                                    </SortableHeader>
                                    <SortableHeader vendedorId={vendedor.vendedor_id} field="valor" align="right">
                                      <span className="text-xs text-gray-600">Valor</span>
                                    </SortableHeader>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortMotivos(vendedor.motivos, vendedor.vendedor_id, vendedor.total_oportunidades)
                                    .map((motivo, idx) => (
                                      <TableRow key={motivo.motivo_id || `vendedor-${vendedor.vendedor_id}-motivo-${idx}`} className="hover:bg-gray-50 border-gray-200">
                                        <TableCell className="text-xs py-1.5 px-3 text-gray-900">
                                          <div className="truncate max-w-[200px]" title={motivo.motivo}>
                                            {motivo.motivo}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-center text-xs font-semibold py-1.5 px-1 text-gray-900">
                                          {motivo.total_oportunidades}
                                        </TableCell>
                                        <TableCell className="text-center py-1.5 px-1">
                                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                            {((motivo.total_oportunidades / vendedor.total_oportunidades) * 100).toFixed(1)}%
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-center text-xs text-gray-600 py-1.5 px-1">
                                          {motivo.lost_time}d
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-medium py-1.5 px-3 text-gray-900">
                                          {motivo.valor_total > 0 ? formatCurrency(motivo.valor_total) : <span className="text-gray-400">-</span>}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-600 text-center py-4">
                              Nenhum motivo registrado
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Análise por Motivos Gerais */}
                <TabsContent value="motivos" className="space-y-4">
                  <Card className="border-gray-200 bg-white">
                    <CardHeader className="pb-3 px-4 pt-4 bg-gray-50 border-b border-gray-200">
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Motivos de Perda - Visão Geral
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-600 mt-1">
                        Distribuição geral de motivos de perda no período
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 px-4 pb-4">
                      {motivosGerais.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-gray-200">
                                <TableHead className="text-left">
                                  <span className="text-xs font-semibold text-gray-700">Motivo</span>
                                </TableHead>
                                <TableHead className="text-center">
                                  <span className="text-xs font-semibold text-gray-700">Quantidade</span>
                                </TableHead>
                                <TableHead className="text-center">
                                  <span className="text-xs font-semibold text-gray-700">%</span>
                                </TableHead>
                                <TableHead className="text-center">
                                  <span className="text-xs font-semibold text-gray-700">Tempo Médio</span>
                                </TableHead>
                                <TableHead className="text-right">
                                  <span className="text-xs font-semibold text-gray-700">Valor Total</span>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {motivosGerais.map((motivo, idx) => (
                                <TableRow key={motivo.motivo_id || `motivo-${idx}`} className="hover:bg-gray-50 border-gray-200">
                                  <TableCell className="text-xs py-2 px-3 text-gray-900">
                                    <div className="truncate max-w-[300px]" title={motivo.motivo}>
                                      {motivo.motivo}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-semibold py-2 px-1 text-gray-900">
                                    {motivo.total_oportunidades}
                                  </TableCell>
                                  <TableCell className="text-center py-2 px-1">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                      {totalGeralOportunidades > 0 
                                        ? ((motivo.total_oportunidades / totalGeralOportunidades) * 100).toFixed(1)
                                        : '0.0'}%
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center text-xs text-gray-600 py-2 px-1">
                                    {motivo.lost_time}d
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-medium py-2 px-3 text-gray-900">
                                    {motivo.valor_total > 0 ? formatCurrency(motivo.valor_total) : <span className="text-gray-400">-</span>}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 text-center py-8">
                          Nenhum motivo de perda encontrado
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">Nenhum dado encontrado para o período selecionado</p>
                <p className="text-sm text-gray-500 mt-2">Selecione um período para visualizar os dados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
