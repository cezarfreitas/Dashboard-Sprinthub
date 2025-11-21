import { memo, useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, XCircle, CheckCircle } from "lucide-react"

interface ResumoUnidadeData {
  oportunidades_ganhas: number
  valor_ganho: number
  ganhas_criadas_no_periodo: number
  oportunidades_perdidas: number
  valor_perdidas: number
  perdidas_criadas_no_periodo: number
}

interface GestorResumoUnidadeProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
  funilId?: string | null
}

export const GestorResumoUnidade = memo(function GestorResumoUnidade({
  unidadeId,
  dataInicio,
  dataFim,
  funilId
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
        
        // Buscar oportunidades perdidas usando API /api/oportunidades/stats
        const perdidasParams = new URLSearchParams()
        perdidasParams.append('status', 'lost')
        perdidasParams.append('unidade_id', unidadeId.toString())
        perdidasParams.append('lost_date_start', dataInicio)
        perdidasParams.append('lost_date_end', dataFim)
        perdidasParams.append('all', '1')
        if (funilId) {
          perdidasParams.append('funil_id', funilId)
        }
        
        const perdidasResponse = await fetch(`/api/oportunidades/stats?${perdidasParams.toString()}`)
        let totalPerdidas = 0
        let valorPerdidas = 0
        let perdidasCriadasNoPeriodo = 0
        
        if (perdidasResponse.ok) {
          const perdidasData = await perdidasResponse.json()
          if (perdidasData.success && perdidasData.data) {
            totalPerdidas = Number(perdidasData.data.total_perdidas_periodo || perdidasData.data.total || 0)
            valorPerdidas = Number(perdidasData.data.valor_perdidas_periodo || perdidasData.data.valor_perdidas || 0)
            perdidasCriadasNoPeriodo = Number(perdidasData.data.total_perdidas_dentro_createDate || 0)
          }
        }
        
        // Buscar oportunidades ganhas usando API /api/oportunidades/stats
        let totalGanhas = 0
        let valorGanhas = 0
        let ganhasCriadasNoPeriodo = 0
        
        const ganhasParams = new URLSearchParams()
        ganhasParams.append('status', 'gain')
        ganhasParams.append('unidade_id', unidadeId.toString())
        ganhasParams.append('gain_date_start', dataInicio)
        ganhasParams.append('gain_date_end', dataFim)
        ganhasParams.append('all', '1')
        if (funilId) {
          ganhasParams.append('funil_id', funilId)
        }
        
        const ganhasResponse = await fetch(`/api/oportunidades/stats?${ganhasParams.toString()}`)
        if (ganhasResponse.ok) {
          const ganhasData = await ganhasResponse.json()
          if (ganhasData.success && ganhasData.data) {
            totalGanhas = Number(ganhasData.data.total_ganhas_periodo || ganhasData.data.total || 0)
            valorGanhas = Number(ganhasData.data.valor_ganhas_periodo || ganhasData.data.valor_ganhas || 0)
            ganhasCriadasNoPeriodo = Number(ganhasData.data.total_ganhas_dentro || ganhasData.data.total_ganhas_dentro_createDate || 0)
          }
        }
        
        setData({
          oportunidades_ganhas: totalGanhas,
          valor_ganho: valorGanhas,
          ganhas_criadas_no_periodo: ganhasCriadasNoPeriodo,
          oportunidades_perdidas: totalPerdidas,
          valor_perdidas: valorPerdidas,
          perdidas_criadas_no_periodo: perdidasCriadasNoPeriodo
        })
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [unidadeId, dataInicio, dataFim, funilId])

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

  return (
    <>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 w-full h-full">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
              <span className="text-xs font-semibold text-red-700 uppercase">Perdidos</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-red-900 leading-tight whitespace-nowrap">
                {data.oportunidades_perdidas}
              </p>
              <p className="text-sm font-semibold text-red-800">
                {formatCurrency(data.valor_perdidas || 0)}
              </p>
            </div>
            <div className="pt-1.5 border-t border-red-200/50 space-y-0.5">
              <p className="text-xs text-red-700/70">
                Criadas no período: <span className="font-bold text-red-800">{data.perdidas_criadas_no_periodo || 0}</span>
              </p>
              <p className="text-xs text-red-700/70">
                Criadas antes: <span className="font-bold text-red-800">{(data.oportunidades_perdidas || 0) - (data.perdidas_criadas_no_periodo || 0)}</span>
              </p>
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
            <div className="pt-1.5 border-t border-green-200/50 space-y-0.5">
              <p className="text-xs text-green-700/70">
                Criadas no período: <span className="font-bold text-green-800">{data.ganhas_criadas_no_periodo || 0}</span>
              </p>
              <p className="text-xs text-green-700/70">
                Criadas antes: <span className="font-bold text-green-800">{(data.oportunidades_ganhas || 0) - (data.ganhas_criadas_no_periodo || 0)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
})

