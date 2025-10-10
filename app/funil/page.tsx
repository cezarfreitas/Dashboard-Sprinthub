"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RefreshCw, TrendingDown, Users, Info, ArrowRight, Target, CheckCircle, XCircle } from "lucide-react"
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
  created_at?: string
  updated_at?: string
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

export default function FunilPage() {
  const { user, loading: authLoading } = useAuth()
  const [funilData, setFunilData] = useState<FunilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedUnidade, setSelectedUnidade] = useState<string>('')
  const [users, setUsers] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])

  const fetchFunilData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Construir URL com filtros
      const params = new URLSearchParams()
      params.append('id_funil', '4')
      if (selectedUser) params.append('user_id', selectedUser)
      if (selectedUnidade) params.append('unidade_id', selectedUnidade)
      
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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/vendedores')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.vendedores || [])
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    }
  }

  const fetchUnidades = async () => {
    try {
      const response = await fetch('/api/unidades')
      const data = await response.json()
      
      if (data.success) {
        setUnidades(data.unidades || [])
      }
    } catch (err) {
      console.error('Erro ao carregar unidades:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchUnidades()
    fetchFunilData()
  }, [])

  useEffect(() => {
    fetchFunilData()
  }, [selectedUser, selectedUnidade])

  const formatCurrency = (value: number): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'R$ 0'
    }
    return `R$ ${value.toLocaleString('pt-BR')}`
  }

  const getStatusColor = (status: 'abertos' | 'ganhos' | 'perdidos') => {
    switch (status) {
      case 'abertos':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'ganhos':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'perdidos':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
  }

  const getStatusIcon = (status: 'abertos' | 'ganhos' | 'perdidos') => {
    switch (status) {
      case 'abertos':
        return <Users className="h-4 w-4" />
      case 'ganhos':
        return <TrendingDown className="h-4 w-4" />
      case 'perdidos':
        return <TrendingDown className="h-4 w-4" />
    }
  }


  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="text-muted-foreground text-sm">Carregando dados do funil...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-display">Funil de Vendas</h1>
          <p className="text-muted-foreground font-body">
            Visualização do funil CRM{user ? `, ${user.name || user.username}` : ''}.
          </p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchFunilData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!funilData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-display">Funil de Vendas</h1>
          <p className="text-muted-foreground font-body">
            Nenhum dado encontrado{user ? `, ${user.name || user.username}` : ''}.
          </p>
        </div>
      </div>
    )
  }


  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col">
        {/* Header compacto */}
        <div className="p-2 border-b bg-card">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold">Funil de Vendas</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>{funilData?.periodo.descricao}</span>
                <span className="font-medium text-foreground">
                  {funilData?.totais_periodo.total_oportunidades} ops
                </span>
              </div>
            </div>
            <Button onClick={fetchFunilData} variant="outline" size="sm" className="h-7 px-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </Button>
          </div>
          
          {/* Filtros compactos */}
          <div className="flex gap-2">
            <div className="flex-1 max-w-[200px]">
              <Select value={selectedUser || "all"} onValueChange={(value) => setSelectedUser(value === "all" ? "" : value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.completName || `${user.name} ${user.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 max-w-[200px]">
              <Select value={selectedUnidade || "all"} onValueChange={(value) => setSelectedUnidade(value === "all" ? "" : value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id.toString()}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Funil - Layout responsivo */}
        <div className="flex-1 overflow-x-auto p-1">
          <div className="flex items-center w-full gap-1">
            {/* Total de oportunidades criadas no período */}
            <Card className="w-[60px] border-0 shadow-none flex-shrink-0">
              <CardContent className="p-1 text-center">
                <div className="text-sm font-bold text-primary">
                  {funilData.totais_periodo.total_oportunidades}
                </div>
              </CardContent>
            </Card>
            
            {/* Seta para o funil */}
            <div className="flex flex-col items-center justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          
          {funilData.colunas.map((coluna, index) => {
            const nextColuna = funilData.colunas[index + 1]
            const totalInicial = funilData.totais_periodo.total_oportunidades
            
            // Calcular taxas de conversão
            let taxaAcumulada = 0 // Em relação ao total inicial
            let taxaRelativa = 0 // Em relação à etapa anterior
            
            if (nextColuna && totalInicial > 0) {
              // Calcular quantos avançaram da etapa atual para a próxima
              const queAvancaram = (() => {
                const etapaAnterior = funilData.colunas[index]
                const queFicaramNaEtapaAtual = etapaAnterior.abertos + etapaAnterior.ganhos + etapaAnterior.perdidos
                
                if (index === 0) {
                  // Etapa 0: total inicial - que ficaram na etapa 0
                  return totalInicial - queFicaramNaEtapaAtual
                } else {
                  // Para etapas 1+: calcular o valor que avançou da etapa anterior
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
              
              // Calcular valor da etapa atual (que chegou nesta etapa)
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
              
              // Percentual em relação ao total inicial
              taxaAcumulada = Math.round((queAvancaram / totalInicial) * 100)
              
              // Percentual em relação à etapa anterior
              if (valorEtapaAtual > 0) {
                taxaRelativa = Math.round((queAvancaram / valorEtapaAtual) * 100)
              }
            }

            return (
              <div key={coluna.id} className="flex items-center">
                {/* Card da etapa responsivo */}
                <Card className="flex-1 min-w-[90px] border-0 shadow-none">
                  <CardContent className="p-2">
                    <div className="text-xs text-center font-medium mb-2">
                      {coluna.nome_coluna}
                    </div>
                    <div className="space-y-2">
                      {/* Barra empilhada compacta */}
                      <div className="flex flex-col h-16 w-full rounded overflow-hidden border">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1 bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-help">
                              <span className="text-xs font-semibold text-white drop-shadow">
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
                              <span className="text-xs font-semibold text-white drop-shadow">
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
                              <span className="text-xs font-semibold text-white drop-shadow">
                                {coluna.perdidos}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Perdidos: {coluna.perdidos} ({formatCurrency(coluna.valor_perdidos)})</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {/* Informações da etapa compactas */}
                      <div className="text-center">
                        {index === 0 && (
                          <div className="text-xs text-muted-foreground">
                            {totalInicial}
                          </div>
                        )}
                        
                        {index > 0 && (
                          <div className="text-xs text-muted-foreground">
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
                  </CardContent>
                </Card>

                {/* Seta e percentuais responsivos */}
                {nextColuna && (
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-xs px-1 py-0 cursor-help h-4 bg-blue-500 text-white hover:bg-blue-600">
                            {taxaRelativa}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Relativa: {taxaRelativa}% da etapa anterior</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-xs px-1 py-0 cursor-help h-4 bg-purple-100 text-purple-700 border border-purple-400 dark:bg-purple-950 dark:text-purple-400">
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
        
        {/* Legenda compacta */}
        <div className="mt-1 p-1 bg-muted/30 rounded text-center">
          <div className="flex flex-wrap justify-center items-center gap-2 text-xs">
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
              <Badge className="text-xs h-4 px-1 bg-blue-500 text-white">Relativa</Badge>
              <span className="text-muted-foreground">% etapa anterior</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="text-xs h-4 px-1 bg-purple-100 text-purple-700 border border-purple-400">Acumulada</Badge>
              <span className="text-muted-foreground">% total inicial</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}