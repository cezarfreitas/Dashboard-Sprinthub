"use client"

import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { UnidadeMetaCard } from "@/components/analytics/UnidadeMetaCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Target, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SortField = 'percentual' | 'valor_vendido' | 'meta' | 'faltante' | 'nome'
type SortDirection = 'asc' | 'desc'

interface SortOption {
  field: SortField
  label: string
  defaultDirection: SortDirection
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'percentual', label: '% Atingido', defaultDirection: 'desc' },
  { field: 'valor_vendido', label: 'Valor Vendido', defaultDirection: 'desc' },
  { field: 'meta', label: 'Meta', defaultDirection: 'desc' },
  { field: 'faltante', label: 'Faltante', defaultDirection: 'asc' },
  { field: 'nome', label: 'Nome', defaultDirection: 'asc' },
]

interface VendedorMeta {
  vendedor_id: number
  vendedor_nome: string
  receita: number
  meta: number
  conversao: number
  valor_faltante: number
}

interface UnidadeData {
  id: number
  nome: string
  meta: number
  valorVendido: number
  vendedores: VendedorMeta[]
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export default function ResultadosMetaPage() {
  const [loading, setLoading] = useState(true)
  const [unidadesData, setUnidadesData] = useState<UnidadeData[]>([])
  const [error, setError] = useState<string>('')
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  const [sortField, setSortField] = useState<SortField>('percentual')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleChangeSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      const option = SORT_OPTIONS.find(o => o.field === field)
      setSortField(field)
      setSortDirection(option?.defaultDirection || 'desc')
    }
  }

  const currentSortLabel = SORT_OPTIONS.find(o => o.field === sortField)?.label || 'Ordenar'

  const fetchUnidadesMetas = async () => {
    try {
      setLoading(true)
      setError('')

      // Buscar todas as unidades ativas
      const unidadesResponse = await fetch('/api/unidades/list?limit=1000')
      const unidadesResult = await unidadesResponse.json()

      if (!unidadesResult.success || !unidadesResult.unidades) {
        setUnidadesData([])
        return
      }

      const unidades = unidadesResult.unidades as Array<{ id: number; nome: string }>

      // Buscar metas do mês atual para todas as unidades
      const metasResponse = await fetch(`/api/meta/stats?mes=${mesAtual}&ano=${anoAtual}`)
      const metasResult = await metasResponse.json()

      // Criar mapa de metas por unidade e por vendedor
      const metasPorUnidade = new Map<number, number>()
      const metasPorVendedor = new Map<number, { meta: number; vendedor_nome: string }>()
      
      if (metasResult.success) {
        // Metas por unidade
        if (metasResult.unidades) {
          metasResult.unidades.forEach((u: any) => {
            metasPorUnidade.set(u.unidade_id, Number(u.meta_total || 0))
          })
        }
        
        // Metas por vendedor
        if (metasResult.metas) {
          metasResult.metas.forEach((m: any) => {
            metasPorVendedor.set(m.vendedor_id, {
              meta: Number(m.meta_valor || 0),
              vendedor_nome: m.vendedor_nome || 'Desconhecido'
            })
          })
        }
      }

      // Buscar vendas (ganhos) de cada unidade no mês atual
      const dataInicio = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
      const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate()
      const dataFim = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

      const unidadesComDados = await Promise.all(
        unidades.map(async (unidade) => {
          // Buscar vendas do mês atual usando unidade_id (a API já resolve os vendedores)
          let valorVendido = 0
          let vendedoresData: VendedorMeta[] = []
          
          try {
            // Buscar stats agregados da unidade
            const statsResponse = await fetch(
              `/api/oportunidades/stats?status=won&gain_date_start=${dataInicio}&gain_date_end=${dataFim}&unidade_id=${unidade.id}`
            )
            const statsResult = await statsResponse.json()

            if (statsResult.success && statsResult.data) {
              valorVendido = Number(statsResult.data.valor_ganhas || statsResult.data.valor_total || 0)
              
              // Buscar stats por vendedor se disponível
              if (statsResult.data.por_vendedor && Array.isArray(statsResult.data.por_vendedor)) {
                vendedoresData = statsResult.data.por_vendedor.map((v: any) => {
                  const metaVendedor = metasPorVendedor.get(v.vendedor_id)
                  const meta = metaVendedor?.meta || 0
                  const receita = Number(v.valor_ganhas || 0)
                  const conversao = meta > 0 ? (receita / meta) * 100 : 0
                  const valor_faltante = Math.max(0, meta - receita)
                  
                  return {
                    vendedor_id: v.vendedor_id,
                    vendedor_nome: v.vendedor_nome || metaVendedor?.vendedor_nome || 'Desconhecido',
                    receita,
                    meta,
                    conversao,
                    valor_faltante
                  }
                }).filter((v: VendedorMeta) => v.meta > 0) // Apenas vendedores com meta
              } else {
                // Se não tiver por_vendedor, buscar individualmente
                // Buscar metas dos vendedores desta unidade
                const metasUnidadeResponse = await fetch(
                  `/api/meta/stats?mes=${mesAtual}&ano=${anoAtual}&unidade_id=${unidade.id}`
                )
                const metasUnidadeResult = await metasUnidadeResponse.json()
                
                if (metasUnidadeResult.success && metasUnidadeResult.metas) {
                  // Buscar vendas de cada vendedor
                  vendedoresData = await Promise.all(
                    metasUnidadeResult.metas.map(async (m: any) => {
                      const vendedorId = m.vendedor_id
                      let receita = 0
                      
                      try {
                        const vendedorStatsResponse = await fetch(
                          `/api/oportunidades/stats?status=won&gain_date_start=${dataInicio}&gain_date_end=${dataFim}&user_id=${vendedorId}`
                        )
                        const vendedorStatsResult = await vendedorStatsResponse.json()
                        
                        if (vendedorStatsResult.success && vendedorStatsResult.data) {
                          receita = Number(vendedorStatsResult.data.valor_ganhas || vendedorStatsResult.data.valor_total || 0)
                        }
                      } catch (error) {
                        // sem console; falha pontual não deve quebrar a tela
                      }
                      
                      const meta = Number(m.meta_valor || 0)
                      const conversao = meta > 0 ? (receita / meta) * 100 : 0
                      const valor_faltante = Math.max(0, meta - receita)
                      
                      return {
                        vendedor_id: vendedorId,
                        vendedor_nome: m.vendedor_nome || 'Desconhecido',
                        receita,
                        meta,
                        conversao,
                        valor_faltante
                      }
                    })
                  )
                }
              }
            }
          } catch (error) {
            // sem console; falha pontual não deve quebrar a tela
          }

          const meta = metasPorUnidade.get(unidade.id) || 0

          // Ordenar vendedores por receita (maior primeiro)
          vendedoresData.sort((a, b) => b.receita - a.receita)

          return {
            id: unidade.id,
            nome: unidade.nome || 'Sem nome',
            meta,
            valorVendido,
            vendedores: vendedoresData
          }
        })
      )

      setUnidadesData(unidadesComDados)
    } catch (error) {
      setUnidadesData([])
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnidadesMetas()
  }, [mesAtual, anoAtual])

  const totalMeta = useMemo(() => {
    return unidadesData.reduce((sum, u) => sum + u.meta, 0)
  }, [unidadesData])

  const totalVendido = useMemo(() => {
    return unidadesData.reduce((sum, u) => sum + u.valorVendido, 0)
  }, [unidadesData])

  const percentualGeral = useMemo(() => {
    return totalMeta > 0 ? (totalVendido / totalMeta) * 100 : 0
  }, [totalMeta, totalVendido])

  // Ordenar todas as unidades
  const unidadesOrdenadas = useMemo(() => {
    return [...unidadesData].sort((a, b) => {
      let valueA: number | string
      let valueB: number | string

      switch (sortField) {
        case 'percentual':
          valueA = a.meta > 0 ? (a.valorVendido / a.meta) * 100 : -1
          valueB = b.meta > 0 ? (b.valorVendido / b.meta) * 100 : -1
          break
        case 'valor_vendido':
          valueA = a.valorVendido
          valueB = b.valorVendido
          break
        case 'meta':
          valueA = a.meta
          valueB = b.meta
          break
        case 'faltante':
          valueA = a.meta > 0 ? Math.max(0, a.meta - a.valorVendido) : Infinity
          valueB = b.meta > 0 ? Math.max(0, b.meta - b.valorVendido) : Infinity
          break
        case 'nome':
          valueA = a.nome.toLowerCase()
          valueB = b.nome.toLowerCase()
          break
        default:
          valueA = a.valorVendido
          valueB = b.valorVendido
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA)
      }

      return sortDirection === 'asc' 
        ? (valueA as number) - (valueB as number)
        : (valueB as number) - (valueA as number)
    })
  }, [unidadesData, sortField, sortDirection])

  const unidadesComMeta = useMemo(() => {
    return unidadesOrdenadas.filter(u => u.meta > 0)
  }, [unidadesOrdenadas])

  const unidadesSemMeta = useMemo(() => {
    return unidadesOrdenadas.filter(u => u.meta === 0)
  }, [unidadesOrdenadas])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
          {error && (
            <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {/* Cabeçalho */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Target className="h-6 w-6" />
                Resultados / Meta
              </h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe o desempenho de cada unidade em relação às metas mensais.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Ordenação */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    {currentSortLabel}
                    {sortDirection === 'desc' ? (
                      <ArrowDown className="h-3 w-3 ml-1 text-muted-foreground" />
                    ) : (
                      <ArrowUp className="h-3 w-3 ml-1 text-muted-foreground" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.field}
                      onClick={() => handleChangeSort(option.field)}
                      className={sortField === option.field ? 'bg-accent' : ''}
                    >
                      <span className="flex-1">{option.label}</span>
                      {sortField === option.field && (
                        sortDirection === 'desc' ? (
                          <ArrowDown className="h-3 w-3 ml-2" />
                        ) : (
                          <ArrowUp className="h-3 w-3 ml-2" />
                        )
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge variant="outline" className="font-medium tabular-nums">
                {mesAtual}/{anoAtual}
              </Badge>
              <Badge variant="secondary" className="font-medium tabular-nums">
                {unidadesData.length} unidades
                {unidadesComMeta.length > 0 && ` (${unidadesComMeta.length} com meta)`}
              </Badge>
            </div>
          </div>

          {/* Resumo Geral */}
          {!loading && unidadesData.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Resumo Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground">Meta Total</div>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(totalMeta)}</div>
                  </div>
                  <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground">Vendido</div>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(totalVendido)}</div>
                  </div>
                  <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground">Percentual Geral</div>
                    <div className="text-2xl font-bold text-foreground">{percentualGeral.toFixed(1)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-40 w-full" />
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : unidadesData.length > 0 ? (
            <>
              {/* Cards das Unidades com Meta */}
              {unidadesComMeta.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {unidadesComMeta.map((unidade, index) => (
                    <UnidadeMetaCard
                      key={unidade.id}
                      unidadeId={unidade.id}
                      unidadeNome={unidade.nome}
                      valorAtual={unidade.valorVendido}
                      meta={unidade.meta}
                      mes={mesAtual}
                      ano={anoAtual}
                      vendedores={unidade.vendedores}
                      posicao={index + 1}
                    />
                  ))}
                </div>
              )}

              {/* Unidades sem Meta - Exibir cards simplificados com valor vendido */}
              {unidadesSemMeta.length > 0 && (
                <div className={unidadesComMeta.length > 0 ? "mt-6" : ""}>
                  {unidadesComMeta.length > 0 && (
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Unidades sem Meta Cadastrada
                    </h2>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {unidadesSemMeta.map((unidade) => (
                      <Card key={unidade.id} className="border-dashed">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {unidade.nome}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              Sem meta
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                              <div className="text-xs text-muted-foreground">Vendido no Mês</div>
                              <div className="text-lg font-bold text-foreground">
                                {formatCurrency(unidade.valorVendido)}
                              </div>
                            </div>
                            <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                              <div className="text-xs text-muted-foreground">Meta</div>
                              <div className="text-lg font-bold text-muted-foreground">
                                Não definida
                              </div>
                            </div>
                          </div>
                          {unidade.vendedores.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs text-muted-foreground mb-2">
                                Vendedores ({unidade.vendedores.length})
                              </div>
                              <div className="space-y-1">
                                {unidade.vendedores.slice(0, 3).map((v) => (
                                  <div key={v.vendedor_id} className="flex justify-between text-sm">
                                    <span className="truncate">{v.vendedor_nome}</span>
                                    <span className="font-medium">{formatCurrency(v.receita)}</span>
                                  </div>
                                ))}
                                {unidade.vendedores.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{unidade.vendedores.length - 3} vendedores
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium">Nenhuma unidade encontrada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cadastre unidades no sistema para visualizar os resultados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

