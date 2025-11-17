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
  oportunidades_perdidas: number
  perdidas_criadas_no_periodo: number
  perdidas_criadas_periodo_anterior: number
  oportunidades_abertas: number
  abertas_criadas_no_periodo: number
  abertas_criadas_periodo_anterior: number
  meta_mes: number
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
            oportunidades_perdidas: Number(unidade.oportunidades_perdidas) || 0,
            perdidas_criadas_no_periodo: Number(unidade.perdidas_criadas_no_periodo) || 0,
            perdidas_criadas_periodo_anterior: Number(unidade.perdidas_criadas_periodo_anterior) || 0,
            oportunidades_abertas: Number(unidade.oportunidades_abertas) || 0,
            abertas_criadas_no_periodo: Number(unidade.abertas_criadas_no_periodo) || 0,
            abertas_criadas_periodo_anterior: Number(unidade.abertas_criadas_periodo_anterior) || 0,
            meta_mes: Number(unidade.meta_mes) || 0
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
    <div className="grid grid-cols-5 gap-4">
      {metaMes > 0 && (
        <Card className="relative overflow-hidden border-2 bg-white">
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
          <CardContent className="relative z-10 p-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <DollarSign className={`h-3 w-3 ${
                  percentualMeta >= 100 
                    ? 'text-green-600' 
                    : percentualMeta >= 75
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`} />
                <span className={`text-[9px] font-semibold uppercase ${
                  percentualMeta >= 100 
                    ? 'text-green-700' 
                    : percentualMeta >= 75
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}>Meta / Realizado</span>
              </div>
              <p className={`text-xl font-bold leading-none ${
                percentualMeta >= 100 
                  ? 'text-green-900' 
                  : percentualMeta >= 75
                  ? 'text-yellow-900'
                  : 'text-red-900'
              }`}>
                {formatCurrency(valorGanho)}
              </p>
              <div className="pt-1.5 space-y-1">
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
                  <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-bold ${
                      percentualMeta >= 100 
                        ? 'text-green-800' 
                        : percentualMeta >= 75
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}>
                      {isNaN(percentualMeta) ? '0.0' : percentualMeta.toFixed(1)}%
                    </span>
                    <span className={`text-[10px] ${
                      percentualMeta >= 100 
                        ? 'text-green-700/70' 
                        : percentualMeta >= 75
                        ? 'text-yellow-700/70'
                        : 'text-red-700/70'
                    }`}>
                      da meta
                    </span>
                  </div>
                  <span className={`text-xs ${
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

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-600" />
              <span className="text-[9px] font-semibold text-blue-700 uppercase">Criadas</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-blue-900 leading-none">
                {data.oportunidades_criadas}
              </p>
              {data.oportunidades_criadas_mes_anterior > 0 && (
                <div className={`flex items-center gap-0.5 ${
                  data.crescimento_criadas_percentual >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {data.crescimento_criadas_percentual >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs font-semibold">
                    {Math.abs(data.crescimento_criadas_percentual).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            {data.oportunidades_criadas_mes_anterior > 0 && (
              <p className="text-xs text-blue-700/70">
                vs mês anterior: {data.oportunidades_criadas_mes_anterior}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <CardContent className="p-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-yellow-600" />
              <span className="text-[9px] font-semibold text-yellow-700 uppercase">Abertas</span>
            </div>
            <p className="text-xl font-bold text-yellow-900 leading-none">
              {data.oportunidades_abertas}
            </p>
            <div className="flex items-baseline gap-2 pt-1 border-t border-yellow-200/50">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-yellow-800">{data.abertas_criadas_no_periodo || 0}</span>
                <span className="text-[10px] text-yellow-700/70">Atual</span>
              </div>
              <span className="text-yellow-300">•</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-yellow-800">{data.abertas_criadas_periodo_anterior || 0}</span>
                <span className="text-[10px] text-yellow-700/70">Anterior</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardContent className="p-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-[9px] font-semibold text-red-700 uppercase">Perdidas</span>
            </div>
            <p className="text-xl font-bold text-red-900 leading-none">
              {data.oportunidades_perdidas}
            </p>
            <div className="flex items-baseline gap-2 pt-1 border-t border-red-200/50">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-red-800">{data.perdidas_criadas_no_periodo || 0}</span>
                <span className="text-[10px] text-red-700/70">Atual</span>
              </div>
              <span className="text-red-300">•</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-red-800">{data.perdidas_criadas_periodo_anterior || 0}</span>
                <span className="text-[10px] text-red-700/70">Anterior</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-[9px] font-semibold text-green-700 uppercase">Ganhas</span>
            </div>
            <p className="text-xl font-bold text-green-900 leading-none">
              {data.oportunidades_ganhas}
            </p>
            <div className="flex items-baseline gap-2 pt-1 border-t border-green-200/50">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-green-800">{data.ganhas_criadas_no_periodo || 0}</span>
                <span className="text-[10px] text-green-700/70">Atual</span>
              </div>
              <span className="text-green-300">•</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-green-800">{data.ganhas_criadas_periodo_anterior || 0}</span>
                <span className="text-[10px] text-green-700/70">Anterior</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

