import { memo } from "react"
import { TrendingUp, CircleDot, TrendingDown, Target, DollarSign, CheckCircle2 } from "lucide-react"

interface ConsultorEstatisticasCardsProps {
  criadasHoje: number
  valorCriadasHoje: number
  criadasOntem: number
  valorCriadasOntem: number
  ganhasHoje: number
  valorGanhasHoje: number
  abertasTotal: number
  abertasValorTotal: number
  abertasCriadasNoPeriodo: number
  abertasValorCriadasNoPeriodo: number
  abertasCriadasOutrosPeriodos: number
  abertasValorCriadasOutrosPeriodos: number
  perdidasTotal: number
  perdidasCriadasDentro: number
  perdidasValorCriadasDentro: number
  perdidasCriadasFora: number
  perdidasValorCriadasFora: number
  ganhosValorTotal: number
  ganhosTotalOportunidades: number
  ganhosCriadasDentro: number
  ganhosValorCriadasDentro: number
  ganhosCriadasFora: number
  ganhosValorCriadasFora: number
  taxaCriadas: number
  taxaGanhas: number
  ticketTotalVendas: number
  ticketValorTotal: number
  meta?: number
  percentualMeta?: number
}

export const ConsultorEstatisticasCards = memo(function ConsultorEstatisticasCards(props: ConsultorEstatisticasCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const ticketMedio = props.ganhosTotalOportunidades > 0 
    ? props.ganhosValorTotal / props.ganhosTotalOportunidades 
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Card: Criadas Hoje */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-4 border-2 border-blue-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-blue-800">Criadas Hoje</h3>
          <TrendingUp className="h-5 w-5 text-blue-600" />
        </div>
        <p className="text-3xl font-bold text-blue-700">{props.criadasHoje}</p>
        <p className="text-xs text-blue-600 mt-1 font-medium">
          {formatCurrency(props.valorCriadasHoje)}
        </p>
      </div>

      {/* Card: Abertas */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-4 border-2 border-orange-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-orange-800">Abertas</h3>
          <CircleDot className="h-5 w-5 text-orange-600" />
        </div>
        <p className="text-3xl font-bold text-orange-700">{props.abertasTotal}</p>
        <p className="text-xs text-orange-600 mt-1 font-medium">
          {formatCurrency(props.abertasValorTotal)}
        </p>
      </div>

      {/* Card: Ganhas */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-4 border-2 border-green-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-green-800">Ganhas</h3>
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </div>
        <p className="text-3xl font-bold text-green-700">{formatCurrency(props.ganhosValorTotal)}</p>
        <p className="text-xs text-green-600 mt-1 font-medium">
          {props.ganhosTotalOportunidades} oportunidades
        </p>
      </div>

      {/* Card: Perdidas */}
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-md p-4 border-2 border-red-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-red-800">Perdidas</h3>
          <TrendingDown className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-3xl font-bold text-red-700">{props.perdidasTotal}</p>
        <p className="text-xs text-red-600 mt-1 font-medium">
          {formatCurrency(props.perdidasValorCriadasDentro + props.perdidasValorCriadasFora)}
        </p>
      </div>

      {/* Card: Ticket Médio */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-md p-4 border-2 border-purple-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-purple-800">Ticket Médio</h3>
          <DollarSign className="h-5 w-5 text-purple-600" />
        </div>
        <p className="text-3xl font-bold text-purple-700">
          {formatCurrency(ticketMedio)}
        </p>
        <p className="text-xs text-purple-600 mt-1 font-medium">
          {props.ganhosTotalOportunidades} vendas
        </p>
      </div>

      {/* Card: Meta do Mês */}
      {props.meta !== undefined && props.meta > 0 ? (
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-md p-4 border-2 border-yellow-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-yellow-800">Falta Atingir</h3>
            <Target className="h-5 w-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-700">
            {formatCurrency(Math.max(0, props.meta - props.ganhosValorTotal))}
          </p>
          <p className="text-xs text-yellow-600 mt-1 font-medium">
            Meta: {formatCurrency(props.meta)} ({(100 - (props.percentualMeta || 0)).toFixed(1)}%)
          </p>
        </div>
      ) : props.meta !== undefined ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-md p-4 border-2 border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Meta do Mês</h3>
            <Target className="h-5 w-5 text-gray-600" />
          </div>
          <p className="text-xl font-bold text-gray-700">Sem meta</p>
          <p className="text-xs text-gray-600 mt-1 font-medium">
            cadastrada
          </p>
        </div>
      ) : null}
    </div>
  )
})

