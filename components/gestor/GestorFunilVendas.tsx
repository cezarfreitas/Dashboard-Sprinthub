import { memo, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EtapaFunil {
  id: number
  nome_coluna: string
  sequencia: number
  total_oportunidades: number
  valor_total: number
}

interface GestorFunilVendasProps {
  etapasFunil: EtapaFunil[]
}

export const GestorFunilVendas = memo(function GestorFunilVendas({
  etapasFunil
}: GestorFunilVendasProps) {
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  const maxValue = useMemo(() => 
    Math.max(...etapasFunil.map(e => e.total_oportunidades))
  , [etapasFunil])

  if (!etapasFunil || etapasFunil.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Vendas da Equipe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              <tr>
                {etapasFunil.map((etapa) => {
                  const intensity = maxValue > 0 ? etapa.total_oportunidades / maxValue : 0
                  
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
      </CardContent>
    </Card>
  )
})


