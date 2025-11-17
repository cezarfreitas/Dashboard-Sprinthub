"use client"

import { memo, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

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
  periodo?: {
    mes: number
    ano: number
    descricao: string
  }
  totais_periodo?: {
    total_criados: number
    total_ganhos: number
    total_perdidos: number
    valor_total_criados: number
    valor_total_ganhos: number
    valor_total_perdidos: number
  }
}

interface GestorFunilColunasProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
  idFunil?: number
}

export const GestorFunilColunas = memo(function GestorFunilColunas({
  unidadeId,
  dataInicio,
  dataFim,
  idFunil = 4
}: GestorFunilColunasProps) {
  const [funilData, setFunilData] = useState<FunilData | null>(null)
  const [loading, setLoading] = useState(true)

  const formatCurrency = useCallback((value: number): string => {
    const numValue = Number(value) || 0
    if (isNaN(numValue)) return 'R$ 0'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!unidadeId) {
        setFunilData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.append('id_funil', idFunil.toString())
        params.append('unidade_id', unidadeId.toString())
        params.append('dataInicio', dataInicio)
        params.append('dataFim', dataFim)
        
        const response = await fetch(`/api/funil?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.success) {
          setFunilData(result)
        } else {
          setFunilData(null)
        }
      } catch {
        setFunilData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [unidadeId, dataInicio, dataFim, idFunil])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Funil de Vendas - Colunas</CardTitle>
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

  if (!funilData || funilData.colunas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Funil de Vendas - Colunas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6 text-xs">
            Nenhuma coluna encontrada para este funil.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calcular largura dinâmica das colunas baseado no número de colunas
  const totalColunas = funilData.colunas.length
  const larguraColuna = totalColunas > 0 
    ? `calc((100% - ${(totalColunas - 1) * 0.5}rem) / ${totalColunas})`
    : '110px'
  const larguraMaxima = totalColunas > 8 ? '110px' : 'none'

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Funil de Vendas - Colunas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            {/* Container sem scroll - ajusta automaticamente */}
            <div className="pb-4">
              <div className="flex gap-2 justify-start items-start">
                {/* Colunas do funil */}
                {funilData.colunas.map((coluna, index) => {
                  const nextColuna = funilData.colunas[index + 1]
                  const totalInicial = funilData.totais_periodo?.total_criados || 0
                  
                  // Calcular taxas de conversão
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
                    <div key={coluna.id} className="flex items-center flex-shrink-0" style={{ width: larguraColuna, maxWidth: larguraMaxima }}>
                      {/* Card da coluna */}
                      <div className="p-2 rounded-lg border bg-background w-full min-h-[160px] flex flex-col">
                        <div className="text-center mb-2">
                          <div className="text-[9px] font-semibold text-foreground line-clamp-2 min-h-[2rem] flex items-center justify-center px-1">
                            {coluna.nome_coluna}
                          </div>
                        </div>
                        
                        <div className="space-y-1 flex-1">
                          {/* Barra empilhada */}
                          <div className="flex flex-col h-12 w-full rounded overflow-hidden border">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex-1 bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-help">
                                  <span className="text-[10px] font-semibold text-white drop-shadow">
                                    {coluna.abertos}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Abertos: {coluna.abertos} ({formatCurrency(coluna.valor_abertos)})</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex-1 bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors cursor-help">
                                  <span className="text-[10px] font-semibold text-white drop-shadow">
                                    {coluna.ganhos}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ganhos: {coluna.ganhos} ({formatCurrency(coluna.valor_ganhos)})</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex-1 bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors cursor-help">
                                  <span className="text-[10px] font-semibold text-white drop-shadow">
                                    {coluna.perdidos}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Perdidos: {coluna.perdidos} ({formatCurrency(coluna.valor_perdidos)})</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          
                          {/* Informações da etapa */}
                          <div className="text-center">
                            <div className="text-[8px] text-muted-foreground">
                              Total: {coluna.abertos + coluna.ganhos + coluna.perdidos}
                            </div>
                            <div className="text-[8px] text-muted-foreground">
                              {formatCurrency(coluna.valor_abertos + coluna.valor_ganhos + coluna.valor_perdidos)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Seta e percentuais */}
                      {nextColuna && (
                        <div className="flex flex-col items-center gap-0.5 mx-0.5 flex-shrink-0">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-col gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="text-[9px] px-1 py-0 cursor-help h-3.5 bg-blue-500 text-white hover:bg-blue-600">
                                  {taxaRelativa}%
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Relativa: {taxaRelativa}% da etapa anterior</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="text-[9px] px-1 py-0 cursor-help h-3.5 bg-purple-100 text-purple-700 border border-purple-400">
                                  {taxaAcumulada}%
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Acumulada: {taxaAcumulada}% do total inicial</p>
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
            <div className="mt-2 p-2 bg-muted/30 rounded text-center">
              <div className="flex flex-wrap justify-center items-center gap-2 text-[9px]">
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
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
})

