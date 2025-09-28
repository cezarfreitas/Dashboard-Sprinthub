"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, TrendingDown, Users, DollarSign, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ColunaFunil {
  id: number
  nome_coluna: string
  id_funil: number
  total_oportunidades: number
  valor_total: string
  sequencia: number
  abertos: number
  ganhos: number
  perdidos: number
  valor_abertos: number
  valor_ganhos: number
  valor_perdidos: number
  created_at?: string
  updated_at?: string
}

interface FunilData {
  success: boolean
  colunas: ColunaFunil[]
  id_funil: number
  total_colunas: number
  periodo?: {
    mes: number
    ano: number
    descricao: string
  }
  totais_periodo?: {
    total_criados: number
    valor_total_criados: number
    total_ganhos: number
    valor_total_ganhos: number
    total_perdidos: number
    valor_total_perdidos: number
  }
}

export default function FunilVendas() {
  const [funilData, setFunilData] = useState<FunilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const formatCurrency = (value: string | number): string => {
    const numValue = Math.round(Number(value) || 0)
    return `R$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
  }

  const formatColumnName = (nome: string): string => {
    // Remove números e pontos do início e limpa caracteres especiais
    return nome.replace(/^\d+\.\s*/, '').replace(/Ã§Ã£o/g, 'ção').replace(/Ã§/g, 'ç')
  }

  const getConversionRate = (current: ColunaFunil, previous: ColunaFunil | null): number => {
    if (!previous || previous.total_oportunidades === 0) return 0
    return (current.total_oportunidades / previous.total_oportunidades) * 100
  }

  const fetchFunilData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/funil?id_funil=4')
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar dados do funil')
      }
      
      setFunilData(data)

    } catch (err) {
      console.error('Erro ao buscar funil:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFunilData()
  }, [])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Carregando funil...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Erro: {error}</p>
            <Button onClick={fetchFunilData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!funilData || funilData.colunas.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum dado encontrado para o funil</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalOportunidades = funilData.colunas.reduce((sum, col) => sum + col.total_oportunidades, 0)
  const totalValor = funilData.colunas.reduce((sum, col) => sum + Number(col.valor_total), 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Funil de Vendas
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{totalOportunidades.toLocaleString()} oportunidades</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>{formatCurrency(totalValor)}</span>
            </div>
            <Button onClick={fetchFunilData} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Grid de etapas horizontal */}
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Fluxo do Funil de Vendas</h4>
              {funilData.periodo && (
                <p className="text-xs text-muted-foreground mt-1">
                  Negócios de {funilData.periodo.descricao}
                </p>
              )}
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              ← Arraste para navegar →
            </div>
          </div>
          
          {/* Container com scroll mais visível */}
          <div className="relative">
            {/* Gradientes nas bordas para indicar scroll */}
            <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
            
            {/* Container scrollável */}
            <div className="flex gap-3 overflow-x-auto pb-4 px-2 scroll-smooth" style={{scrollbarWidth: 'thin'}}>
              {/* Etapa inicial com totais do período */}
              {funilData.totais_periodo && (
                <div className="relative flex-shrink-0">
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 hover:bg-purple-100/50 transition-all duration-200 hover:shadow-md w-[160px] min-h-[200px] flex flex-col">
                    <div className="text-center mb-3">
                      <div className="text-[10px] text-purple-600 mb-1">TOTAL DO PERÍODO</div>
                      <div className="font-semibold text-xs line-clamp-2 min-h-[2rem] flex items-center justify-center px-1 text-purple-700">
                        Negócios de {funilData.periodo?.descricao}
                      </div>
                    </div>
                    
                    <div className="flex flex-col flex-1 space-y-1">
                        {/* GANHOS - Topo */}
                        <div className="text-center p-2 rounded bg-green-50 border border-green-200">
                          <div className="text-xs text-green-600 font-medium mb-1">↗ GANHOS</div>
                          <div className="font-bold text-green-700 text-sm">{funilData.totais_periodo.total_ganhos}</div>
                          <div className="text-[9px] text-green-600 truncate">{formatCurrency(funilData.totais_periodo.valor_total_ganhos)}</div>
                          <div className="text-[8px] text-green-500 mt-1">Finalizados</div>
                        </div>

                        {/* CRIADOS - Centro (Principal) */}
                        <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded flex-1 flex flex-col justify-center">
                          <div className="text-xs text-purple-600 font-medium mb-1">⚪ CRIADOS</div>
                          <div className="text-xl font-bold text-purple-700">{funilData.totais_periodo.total_criados}</div>
                          <div className="text-[10px] text-purple-600 truncate">{formatCurrency(funilData.totais_periodo.valor_total_criados)}</div>
                          <div className="text-[8px] text-purple-500 mt-1">No Período</div>
                        </div>

                        {/* PERDIDOS - Baixo */}
                        <div className="text-center p-2 rounded bg-red-50 border border-red-200">
                          <div className="text-xs text-red-600 font-medium mb-1">↘ PERDIDOS</div>
                          <div className="font-bold text-red-700 text-sm">{funilData.totais_periodo.total_perdidos}</div>
                          <div className="text-[9px] text-red-600 truncate">{formatCurrency(funilData.totais_periodo.valor_total_perdidos)}</div>
                          <div className="text-[8px] text-red-500 mt-1">Finalizados</div>
                        </div>
                    </div>
                  </div>
                  
                  {/* Seta para primeira etapa do funil */}
                  {funilData.colunas.length > 0 && (
                    <div className="absolute -right-1.5 top-1/2 transform -translate-y-1/2 z-20">
                      <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                        <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Etapas do funil */}
              {funilData.colunas.map((coluna, index) => {
                const previousColumn = index > 0 ? funilData.colunas[index - 1] : null
                const conversionRate = getConversionRate(coluna, previousColumn)
                
                return (
                  <div key={coluna.id} className="relative flex-shrink-0">
                    <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-md w-[160px] min-h-[200px] flex flex-col">
                      <div className="text-center mb-3">
                        <div className="text-[10px] text-muted-foreground mb-1">Etapa {coluna.sequencia + 1}</div>
                        <div className="font-semibold text-xs line-clamp-2 min-h-[2rem] flex items-center justify-center px-1">
                          {formatColumnName(coluna.nome_coluna)}
                        </div>
                      </div>
                        
                      <div className="flex flex-col flex-1 space-y-1">
                          {/* GANHOS - Topo */}
                          <div className="text-center p-2 rounded bg-green-50 border border-green-200">
                            <div className="text-xs text-green-600 font-medium mb-1">↗ GANHOS</div>
                            <div className="font-bold text-green-700 text-sm">{coluna.ganhos}</div>
                            <div className="text-[9px] text-green-600 truncate">{formatCurrency(coluna.valor_ganhos)}</div>
                            <div className="text-[8px] text-green-500 mt-1">Finalizados</div>
                          </div>

                          {/* ABERTOS - Centro (Principal) */}
                          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded flex-1 flex flex-col justify-center">
                            <div className="text-xs text-blue-600 font-medium mb-1">⚪ ABERTOS</div>
                            <div className="text-xl font-bold text-blue-700">{coluna.abertos}</div>
                            <div className="text-[10px] text-blue-600 truncate">{formatCurrency(coluna.valor_abertos)}</div>
                            <div className="text-[8px] text-blue-500 mt-1">Criados</div>
                            
                            {/* Taxa de conversão */}
                            {previousColumn && (
                              <Badge 
                                variant={conversionRate >= 50 ? "default" : conversionRate >= 25 ? "secondary" : "destructive"}
                                className="text-[9px] mt-2 py-0 px-2 mx-auto"
                              >
                                {conversionRate.toFixed(1)}%
                              </Badge>
                            )}
                          </div>

                          {/* PERDIDOS - Baixo */}
                          <div className="text-center p-2 rounded bg-red-50 border border-red-200">
                            <div className="text-xs text-red-600 font-medium mb-1">↘ PERDIDOS</div>
                            <div className="font-bold text-red-700 text-sm">{coluna.perdidos}</div>
                            <div className="text-[9px] text-red-600 truncate">{formatCurrency(coluna.valor_perdidos)}</div>
                            <div className="text-[8px] text-red-500 mt-1">Finalizados</div>
                          </div>
                      </div>
                    </div>
                    
                    {/* Seta para próxima etapa */}
                    {index < funilData.colunas.length - 1 && (
                      <div className="absolute -right-1.5 top-1/2 transform -translate-y-1/2 z-20">
                        <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                          <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Indicadores de scroll para mobile */}
            <div className="flex justify-center mt-2 sm:hidden">
              <div className="flex space-x-1">
                {funilData.colunas.map((_, index) => (
                  <div key={index} className="w-2 h-2 rounded-full bg-muted"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Resumo final */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Taxa de Conversão Geral:</span>
            <Badge variant="outline" className="text-base px-3 py-1">
              {funilData.colunas.length > 0 && totalOportunidades > 0
                ? ((funilData.colunas[funilData.colunas.length - 1].total_oportunidades / funilData.colunas[0].total_oportunidades) * 100).toFixed(2)
                : '0.00'
              }%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
