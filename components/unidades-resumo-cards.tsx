"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Building2, TrendingUp, DollarSign, XCircle, Clock, Target, Briefcase } from "lucide-react"

interface EtapaFunil {
  id: number
  nome_coluna: string
  sequencia: number
  total_oportunidades: number
  valor_total: number
}

interface UnidadeStats {
  id: number
  nome: string
  responsavel: string
  stats: {
    total_vendedores: number
    vendedores_na_fila: number
    oportunidades_criadas: number
    oportunidades_ganhas: number
    valor_ganho: number
    oportunidades_perdidas: number
    oportunidades_abertas: number
    meta_mes: number
    total_negocios_abertos: number
    etapas_funil: EtapaFunil[]
  }
}

interface ApiResponse {
  success: boolean
  mes: number
  ano: number
  unidades: UnidadeStats[]
}

interface UnidadesResumoCardsProps {
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function UnidadesResumoCards({ mes, ano, vendedorId, unidadeId }: UnidadesResumoCardsProps) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getMesNome = (mes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1] || ''
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (mes) params.append('mes', mes.toString())
      if (ano) params.append('ano', ano.toString())
      if (vendedorId) params.append('vendedorId', vendedorId.toString())
      if (unidadeId) params.append('unidadeId', unidadeId.toString())
      
      const url = `/api/unidades/stats${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar dados')
      }
      
      setData(result)

    } catch (err) {
      console.error('Erro ao buscar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [mes, ano, vendedorId, unidadeId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Resumo por Unidade</h2>
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Resumo por Unidade</h2>
          <button 
            onClick={fetchData}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4 inline mr-1" />
            Tentar novamente
          </button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center text-red-700">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Erro ao carregar dados</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || data.unidades.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Resumo por Unidade</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhuma unidade encontrada</p>
              <p className="text-sm">Não há unidades cadastradas no sistema</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resumo por Unidade</h2>
          <p className="text-sm text-muted-foreground">
            {getMesNome(data.mes)} {data.ano}
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4 inline mr-1" />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.unidades.map((unidade) => (
          <Card key={unidade.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">{unidade.nome}</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Meta do Mês */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Meta do Mês</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-purple-600">
                    {formatCurrency(unidade.stats.meta_mes)}
                  </div>
                  {unidade.stats.meta_mes > 0 && (
                    <div className="text-xs text-purple-500">
                      {((unidade.stats.valor_ganho / unidade.stats.meta_mes) * 100).toFixed(1)}% atingida
                    </div>
                  )}
                </div>
              </div>

              {/* Oportunidades Criadas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Criadas</span>
                </div>
                <span className="font-semibold text-green-600">
                  {unidade.stats.oportunidades_criadas}
                </span>
              </div>

              {/* Oportunidades Ganhas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">Ganhas</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-600">
                    {unidade.stats.oportunidades_ganhas}
                  </div>
                  <div className="text-xs text-emerald-500">
                    {formatCurrency(unidade.stats.valor_ganho)}
                  </div>
                </div>
              </div>

              {/* Oportunidades Perdidas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Perdidas</span>
                </div>
                <span className="font-semibold text-red-600">
                  {unidade.stats.oportunidades_perdidas}
                </span>
              </div>

              {/* Oportunidades Abertas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Abertas</span>
                </div>
                <span className="font-semibold text-yellow-600">
                  {unidade.stats.oportunidades_abertas}
                </span>
              </div>

              {/* Total de Negócios Abertos */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm">Negócios Abertos</span>
                </div>
                <span className="font-semibold text-indigo-600">
                  {unidade.stats.total_negocios_abertos}
                </span>
              </div>

              {/* Tabela das Etapas do Funil */}
              {unidade.stats.etapas_funil && unidade.stats.etapas_funil.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-600 mb-2">Etapas do Funil:</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          {unidade.stats.etapas_funil.map((etapa, index) => {
                            // Encontrar o valor máximo para criar o mapa de calor
                            const maxValue = Math.max(...unidade.stats.etapas_funil.map(e => e.total_oportunidades))
                            const intensity = maxValue > 0 ? etapa.total_oportunidades / maxValue : 0
                            
                            // Definir cor baseada na intensidade com degradê mais suave
                            let bgColor = 'bg-gray-50'
                            let textColor = 'text-gray-500'
                            
                            if (intensity > 0.9) {
                              bgColor = 'bg-red-600'
                              textColor = 'text-white'
                            } else if (intensity > 0.8) {
                              bgColor = 'bg-red-500'
                              textColor = 'text-white'
                            } else if (intensity > 0.7) {
                              bgColor = 'bg-orange-500'
                              textColor = 'text-white'
                            } else if (intensity > 0.6) {
                              bgColor = 'bg-orange-400'
                              textColor = 'text-white'
                            } else if (intensity > 0.5) {
                              bgColor = 'bg-yellow-500'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.4) {
                              bgColor = 'bg-yellow-400'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.3) {
                              bgColor = 'bg-green-400'
                              textColor = 'text-white'
                            } else if (intensity > 0.2) {
                              bgColor = 'bg-green-300'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.1) {
                              bgColor = 'bg-blue-300'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0) {
                              bgColor = 'bg-blue-200'
                              textColor = 'text-gray-800'
                            }
                            
                            return (
                              <td 
                                key={etapa.id} 
                                className={`text-center px-1 py-2 border border-gray-200 ${bgColor}`}
                                title={`${etapa.nome_coluna}\nNegócios: ${etapa.total_oportunidades}\nValor: ${formatCurrency(etapa.valor_total)}`}
                              >
                                <div className={`font-bold ${textColor} text-xs`}>
                                  {etapa.total_oportunidades}
                                </div>
                                <div className={`text-[8px] ${textColor} opacity-80 truncate`} title={etapa.nome_coluna}>
                                  {etapa.nome_coluna.replace(/^\d+\.\s*/, '').substring(0, 4)}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
