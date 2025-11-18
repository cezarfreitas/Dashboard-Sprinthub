import { memo, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, XCircle, Circle, CheckCircle } from "lucide-react"
import { fetchWithCache } from "@/lib/apiCache"

interface ResumoUnidadeData {
  oportunidades_criadas: number
  oportunidades_criadas_mes_anterior: number
  crescimento_criadas_percentual: number
  oportunidades_ganhas: number
  valor_ganho: number
  ganhas_criadas_no_periodo: number
  ganhas_criadas_periodo_anterior: number
  crescimento_ganhas_percentual: number
  oportunidades_perdidas: number
  perdidas_criadas_no_periodo: number
  perdidas_criadas_periodo_anterior: number
  crescimento_perdidas_percentual: number
  oportunidades_abertas: number
  abertas_criadas_no_periodo: number
  abertas_criadas_periodo_anterior: number
  meta_mes: number
  maior_valor_ganho: number
  menor_valor_ganho: number
}

interface GestorResumoUnidadeProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

export const GestorResumoUnidade = memo(function GestorResumoUnidade({
  unidadeId,
  dataInicio,
  dataFim
}: GestorResumoUnidadeProps) {
  const [data, setData] = useState<ResumoUnidadeData | null>(null)
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
      if (!unidadeId) return

      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.append('unidadeId', unidadeId.toString())
        params.append('dataInicio', dataInicio)
        params.append('dataFim', dataFim)
        
        const result = await fetchWithCache(`/api/unidades/resumo?${params.toString()}`)
        
        if (result.success && result.unidades && result.unidades.length > 0) {
          const unidade = result.unidades[0]
          setData({
            oportunidades_criadas: Number(unidade.oportunidades_criadas) || 0,
            oportunidades_criadas_mes_anterior: Number(unidade.oportunidades_criadas_mes_anterior) || 0,
            crescimento_criadas_percentual: Number(unidade.crescimento_criadas_percentual) || 0,
            oportunidades_ganhas: Number(unidade.oportunidades_ganhas) || 0,
            valor_ganho: Number(unidade.valor_ganho) || 0,
            ganhas_criadas_no_periodo: Number(unidade.ganhas_criadas_no_periodo) || 0,
            ganhas_criadas_periodo_anterior: Number(unidade.ganhas_criadas_periodo_anterior) || 0,
            crescimento_ganhas_percentual: Number(unidade.crescimento_ganhas_percentual) || 0,
            oportunidades_perdidas: Number(unidade.oportunidades_perdidas) || 0,
            perdidas_criadas_no_periodo: Number(unidade.perdidas_criadas_no_periodo) || 0,
            perdidas_criadas_periodo_anterior: Number(unidade.perdidas_criadas_periodo_anterior) || 0,
            crescimento_perdidas_percentual: Number(unidade.crescimento_perdidas_percentual) || 0,
            oportunidades_abertas: Number(unidade.oportunidades_abertas) || 0,
            abertas_criadas_no_periodo: Number(unidade.abertas_criadas_no_periodo) || 0,
            abertas_criadas_periodo_anterior: Number(unidade.abertas_criadas_periodo_anterior) || 0,
            meta_mes: Number(unidade.meta_mes) || 0,
            maior_valor_ganho: Number(unidade.maior_valor_ganho) || 0,
            menor_valor_ganho: Number(unidade.menor_valor_ganho) || 0
          })
        }
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [unidadeId, dataInicio, dataFim])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  const valorGanho = Number(data.valor_ganho) || 0
  const metaMes = Number(data.meta_mes) || 0
  const percentualMeta = metaMes > 0 && !isNaN(valorGanho) && !isNaN(metaMes)
    ? (valorGanho / metaMes) * 100 
    : 0

  return (
    <>
      {metaMes > 0 && (
        <Card className="relative overflow-hidden border-2 bg-white w-full h-full">
          {/* Background base */}
          <div className={`absolute inset-0 bg-gradient-to-br ${
            percentualMeta >= 100 
              ? 'from-green-50 to-green-100' 
              : percentualMeta >= 75
              ? 'from-yellow-50 to-yellow-100'
              : 'from-red-50 to-red-100'
          }`} />
          
          {/* Overlay de progresso - como água enchendo de baixo para cima */}
          <div 
            className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out ${
              percentualMeta >= 100 
                ? 'bg-gradient-to-t from-green-400/30 to-green-300/20' 
                : percentualMeta >= 75
                ? 'bg-gradient-to-t from-yellow-400/30 to-yellow-300/20'
                : 'bg-gradient-to-t from-red-400/30 to-red-300/20'
            }`}
            style={{
              height: `${Math.min(percentualMeta, 100)}%`,
              zIndex: 1
            }}
          />
          
          {/* Conteúdo - sempre acima da "água" */}
          <CardContent className="relative z-10 p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <DollarSign className={`h-4 w-4 flex-shrink-0 ${
                  percentualMeta >= 100 
                    ? 'text-green-600' 
                    : percentualMeta >= 75
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`} />
                <span className={`text-xs font-semibold uppercase ${
                  percentualMeta >= 100 
                    ? 'text-green-700' 
                    : percentualMeta >= 75
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}>Meta / Realizado</span>
              </div>
              <p className={`text-2xl font-bold leading-tight whitespace-nowrap ${
                percentualMeta >= 100 
                  ? 'text-green-900' 
                  : percentualMeta >= 75
                  ? 'text-yellow-900'
                  : 'text-red-900'
              }`}>
                {formatCurrency(valorGanho)}
              </p>
              <div className="pt-2 space-y-1.5">
                {/* Barra de progresso */}
                <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out rounded-full ${
                      percentualMeta >= 100 
                        ? 'bg-green-500' 
                        : percentualMeta >= 75
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(percentualMeta, 100)}%`
                    }}
                  />
                </div>
                {/* Labels */}
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <span className={`text-base font-bold ${
                      percentualMeta >= 100 
                        ? 'text-green-800' 
                        : percentualMeta >= 75
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}>
                      {isNaN(percentualMeta) ? '0.0' : percentualMeta.toFixed(1)}%
                    </span>
                    <span className={`text-xs ${
                      percentualMeta >= 100 
                        ? 'text-green-700/70' 
                        : percentualMeta >= 75
                        ? 'text-yellow-700/70'
                        : 'text-red-700/70'
                    }`}>
                      da meta
                    </span>
                  </div>
                  <span className={`text-xs truncate ${
                    percentualMeta >= 100 
                      ? 'text-green-700/70' 
                      : percentualMeta >= 75
                      ? 'text-yellow-700/70'
                      : 'text-red-700/70'
                  }`}>
                    de {formatCurrency(metaMes)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 w-full h-full">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp className="h-4 w-4 flex-shrink-0 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase">Novas Oportunidades</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-blue-900 leading-tight whitespace-nowrap">
                {data.oportunidades_criadas}
              </p>
              {data.oportunidades_criadas_mes_anterior > 0 && (
                <div className={`flex items-center gap-1 whitespace-nowrap ${
                  data.crescimento_criadas_percentual >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {data.crescimento_criadas_percentual >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-xs font-semibold">
                    {data.crescimento_criadas_percentual >= 0 ? '+' : ''}{data.crescimento_criadas_percentual.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div className="pt-1.5 border-t border-blue-200/50 space-y-1">
              <p className="text-xs text-blue-700/90 font-medium">
                Criadas até hoje ({new Date().toLocaleDateString('pt-BR')})
              </p>
            {data.oportunidades_criadas_mes_anterior > 0 && (
                <p className="text-xs text-blue-700/70">
                  Mesmo período mês anterior: <span className="font-bold text-blue-800">{data.oportunidades_criadas_mes_anterior}</span>
              </p>
            )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 w-full h-full">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Circle className="h-4 w-4 flex-shrink-0 text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700 uppercase">Abertos</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 leading-tight whitespace-nowrap">
              {data.oportunidades_abertas}
            </p>
            <div className="pt-1.5 border-t border-yellow-200/50 space-y-1">
              <p className="text-xs text-yellow-700/90 font-medium">
                Total de oportunidades abertas
              </p>
              <div className="space-y-0.5">
                <p className="text-xs text-yellow-700/70">
                  Criadas este mês: <span className="font-bold text-yellow-800">{data.abertas_criadas_no_periodo || 0}</span>
                </p>
                <p className="text-xs text-yellow-700/70">
                  Criadas anteriormente: <span className="font-bold text-yellow-800">{data.abertas_criadas_periodo_anterior || 0}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 w-full h-full">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
              <span className="text-xs font-semibold text-red-700 uppercase">Perdidos</span>
            </div>
            <p className="text-2xl font-bold text-red-900 leading-tight whitespace-nowrap">
              {data.oportunidades_perdidas}
            </p>
            <div className="pt-1.5 border-t border-red-200/50 space-y-1">
              <p className="text-xs text-red-700/90 font-medium">
                Perdidas em {new Date(dataInicio).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
              </p>
              <div className="space-y-0.5">
                <p className="text-xs text-red-700/70">
                  Perdidos e criados no mês: <span className="font-bold text-red-800">{data.perdidas_criadas_no_periodo || 0}</span>
                </p>
                <p className="text-xs text-red-700/70">
                  Perdidos no mês, criados antes: <span className="font-bold text-red-800">{(data.oportunidades_perdidas || 0) - (data.perdidas_criadas_no_periodo || 0)}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 w-full h-full">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase">Ganhas</span>
            </div>
            <p className="text-2xl font-bold text-green-900 leading-tight whitespace-nowrap">
              {formatCurrency(data.valor_ganho)}
            </p>
            <div className="pt-1.5 border-t border-green-200/50 space-y-1">
              <p className="text-xs text-green-700/90 font-medium">
                Ganhas em {new Date(dataInicio).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
              </p>
              <div className="space-y-0.5">
                <p className="text-xs text-green-700/70">
                  Ganhas e criadas no mês: <span className="font-bold text-green-800">{data.ganhas_criadas_no_periodo || 0}</span>
                </p>
                <p className="text-xs text-green-700/70">
                  Ganhas no mês, criadas antes: <span className="font-bold text-green-800">{(data.oportunidades_ganhas || 0) - (data.ganhas_criadas_no_periodo || 0)}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taxa de Conversão */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 w-full h-full">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp className="h-4 w-4 flex-shrink-0 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700 uppercase">Taxa de Conversão</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 leading-tight whitespace-nowrap">
              {data.oportunidades_criadas > 0 
                ? ((data.oportunidades_ganhas / data.oportunidades_criadas) * 100).toFixed(1)
                : '0.0'}%
            </p>
            <div className="pt-1.5 border-t border-purple-200/50 space-y-1">
              <p className="text-xs text-purple-700/70">
                {data.oportunidades_ganhas} ganhas de {data.oportunidades_criadas} criadas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Médio */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 w-full h-full">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <DollarSign className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 uppercase">Ticket Médio</span>
              </div>
            <p className="text-2xl font-bold text-emerald-900 leading-tight whitespace-nowrap">
              {formatCurrency(data.oportunidades_ganhas > 0 ? data.valor_ganho / data.oportunidades_ganhas : 0)}
            </p>
            <div className="pt-1.5 border-t border-emerald-200/50 space-y-1">
              <p className="text-xs text-emerald-700/90 font-medium">
                Baseado em {data.oportunidades_ganhas} {data.oportunidades_ganhas === 1 ? 'negócio ganho' : 'negócios ganhos'}
              </p>
              <div className="space-y-0.5">
                <p className="text-xs text-emerald-700/70">
                  Maior: <span className="font-bold text-emerald-800">{formatCurrency(data.maior_valor_ganho || 0)}</span>
                </p>
                <p className="text-xs text-emerald-700/70">
                  Menor: <span className="font-bold text-emerald-800">{formatCurrency(data.menor_valor_ganho || 0)}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
})

