"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RefreshCw, ArrowRight, Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface ColunaFunil {
  id: number
  nome_coluna: string
  id_funil: number
  total_oportunidades: number
  valor_total: number
  sequencia: number
  abertos: number
  ganhos: number
  perdidos: number
  valor_abertos: number
  valor_ganhos: number
  valor_perdidos: number
}

interface FunilData {
  success: boolean
  colunas: ColunaFunil[]
  id_funil: number
  total_colunas: number
  periodo: {
    mes: number
    ano: number
    descricao: string
  }
  totais_periodo: {
    total_oportunidades: number
    valor_total: number
  }
}

interface FunilDashboardProps {
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function FunilDashboard({ vendedorId, unidadeId }: FunilDashboardProps) {
  const [funilData, setFunilData] = useState<FunilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchFunilData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams()
      params.append('id_funil', '4')
      if (vendedorId) params.append('user_id', vendedorId.toString())
      if (unidadeId) params.append('unidade_id', unidadeId.toString())
      
      const url = `/api/funil?${params.toString()}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar dados do funil')
      }
      
      setFunilData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFunilData()
  }, [vendedorId, unidadeId])

  const formatCurrency = (value: number): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'R$ 0'
    }
    return `R$ ${value.toLocaleString('pt-BR')}`
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando funil...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchFunilData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!funilData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Nenhum dado encontrado</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">
                {funilData.periodo?.descricao || 
                 (funilData.periodo?.mes && funilData.periodo?.ano 
                   ? `${funilData.periodo.mes}/${funilData.periodo.ano}` 
                   : 'Período não definido')}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">
                {funilData.totais_periodo?.total_oportunidades || 0} ops
              </span>
            </div>
            <Button 
              onClick={fetchFunilData} 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          {/* Funil */}
          <div className="overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {/* Total inicial */}
              <div className="w-[50px] text-center">
                <div className="text-sm font-bold text-primary">
                  {funilData.totais_periodo?.total_oportunidades || 0}
                </div>
              </div>
              
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            
              {funilData.colunas.map((coluna, index) => {
                const nextColuna = funilData.colunas[index + 1]
                const totalInicial = funilData.totais_periodo?.total_oportunidades || 0
                
                let taxaAcumulada = 0
                let taxaRelativa = 0
                
                if (nextColuna && totalInicial > 0) {
                  const queAvancaram = (() => {
                    const etapaAnterior = funilData.colunas[index]
                    const queFicaramNaEtapaAtual = etapaAnterior.abertos + etapaAnterior.ganhos + etapaAnterior.perdidos
                    
                    if (index === 0) {
                      return totalInicial - queFicaramNaEtapaAtual
                    } else {
                      const calcularValorEtapa = (etapaIndex: number): number => {
                        if (etapaIndex === 0) {
                          return totalInicial
                        } else if (etapaIndex === 1) {
                          return totalInicial - (funilData.colunas[0].abertos + funilData.colunas[0].ganhos + funilData.colunas[0].perdidos)
                        } else {
                          const etapaAnteriorAnterior = funilData.colunas[etapaIndex - 1]
                          const queFicaramNaEtapaAnteriorAnterior = etapaAnteriorAnterior.abertos + etapaAnteriorAnterior.ganhos + etapaAnteriorAnterior.perdidos
                          return calcularValorEtapa(etapaIndex - 1) - queFicaramNaEtapaAnteriorAnterior
                        }
                      }
                      
                      return calcularValorEtapa(index) - queFicaramNaEtapaAtual
                    }
                  })()
                  
                  const valorEtapaAtual = (() => {
                    if (index === 0) {
                      return totalInicial
                    } else {
                      const calcularValorEtapa = (etapaIndex: number): number => {
                        if (etapaIndex === 0) {
                          return totalInicial
                        } else if (etapaIndex === 1) {
                          return totalInicial - (funilData.colunas[0].abertos + funilData.colunas[0].ganhos + funilData.colunas[0].perdidos)
                        } else {
                          const etapaAnteriorAnterior = funilData.colunas[etapaIndex - 1]
                          const queFicaramNaEtapaAnteriorAnterior = etapaAnteriorAnterior.abertos + etapaAnteriorAnterior.ganhos + etapaAnteriorAnterior.perdidos
                          return calcularValorEtapa(etapaIndex - 1) - queFicaramNaEtapaAnteriorAnterior
                        }
                      }
                      
                      return calcularValorEtapa(index)
                    }
                  })()
                  
                  taxaAcumulada = Math.round((queAvancaram / totalInicial) * 100)
                  
                  if (valorEtapaAtual > 0) {
                    taxaRelativa = Math.round((queAvancaram / valorEtapaAtual) * 100)
                  }
                }

                return (
                  <div key={coluna.id} className="flex items-center">
                    <div className="min-w-[80px]">
                      <div className="text-[10px] text-center font-medium mb-1.5 truncate">
                        {coluna.nome_coluna}
                      </div>
                      
                      <div className="flex flex-col h-14 w-full rounded overflow-hidden border">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1 bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-help">
                              <span className="text-xs font-semibold text-white">
                                {coluna.abertos}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">Abertos</p>
                            <p className="text-xs">{coluna.abertos} ops - {formatCurrency(coluna.valor_abertos)}</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1 bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors cursor-help">
                              <span className="text-xs font-semibold text-white">
                                {coluna.ganhos}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">Ganhos</p>
                            <p className="text-xs">{coluna.ganhos} ops - {formatCurrency(coluna.valor_ganhos)}</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1 bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors cursor-help">
                              <span className="text-xs font-semibold text-white">
                                {coluna.perdidos}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">Perdidos</p>
                            <p className="text-xs">{coluna.perdidos} ops - {formatCurrency(coluna.valor_perdidos)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="text-center mt-1">
                        {index === 0 && (
                          <div className="text-[10px] text-muted-foreground font-medium">
                            {totalInicial}
                          </div>
                        )}
                        
                        {index > 0 && (
                          <div className="text-[10px] text-muted-foreground font-medium">
                            {(() => {
                              const etapaAnterior = funilData.colunas[index - 1]
                              const queFicaramNaEtapaAnterior = etapaAnterior.abertos + etapaAnterior.ganhos + etapaAnterior.perdidos
                              
                              if (index === 1) {
                                return totalInicial - queFicaramNaEtapaAnterior
                              } else {
                                const calcularValorEtapa = (etapaIndex: number): number => {
                                  if (etapaIndex === 0) {
                                    return totalInicial
                                  } else if (etapaIndex === 1) {
                                    return totalInicial - (funilData.colunas[0].abertos + funilData.colunas[0].ganhos + funilData.colunas[0].perdidos)
                                  } else {
                                    const etapaAnteriorAnterior = funilData.colunas[etapaIndex - 1]
                                    const queFicaramNaEtapaAnteriorAnterior = etapaAnteriorAnterior.abertos + etapaAnteriorAnterior.ganhos + etapaAnteriorAnterior.perdidos
                                    return calcularValorEtapa(etapaIndex - 1) - queFicaramNaEtapaAnteriorAnterior
                                  }
                                }
                                
                                return calcularValorEtapa(index - 1) - queFicaramNaEtapaAnterior
                              }
                            })()} / {coluna.abertos + coluna.ganhos + coluna.perdidos}
                          </div>
                        )}
                      </div>
                    </div>

                    {nextColuna && (
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 px-1">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <div className="flex flex-col gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="text-[9px] px-1 py-0 cursor-help h-3.5 bg-blue-500 text-white hover:bg-blue-600">
                                {taxaRelativa}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Relativa: {taxaRelativa}%</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="text-[9px] px-1 py-0 cursor-help h-3.5 bg-purple-100 text-purple-700 border border-purple-400 dark:bg-purple-950 dark:text-purple-400">
                                {taxaAcumulada}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Acumulada: {taxaAcumulada}%</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Legenda */}
          <div className="mt-3 p-1.5 bg-muted/30 rounded">
            <div className="flex flex-wrap justify-center items-center gap-2 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded"></div>
                <span className="text-muted-foreground">Abertos</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded"></div>
                <span className="text-muted-foreground">Ganhos</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded"></div>
                <span className="text-muted-foreground">Perdidos</span>
              </div>
              <Separator orientation="vertical" className="h-3" />
              <div className="flex items-center gap-1">
                <Badge className="text-[9px] h-3 px-1 bg-blue-500 text-white">Relativa</Badge>
                <span className="text-muted-foreground">% etapa anterior</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge className="text-[9px] h-3 px-1 bg-purple-100 text-purple-700 border border-purple-400">Acumulada</Badge>
                <span className="text-muted-foreground">% total inicial</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

