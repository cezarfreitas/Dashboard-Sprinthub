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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
      {/* Card: Criadas Hoje */}
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-md p-2 sm:p-3 md:p-4 border-2 border-blue-500 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-white leading-tight">Criadas Hoje</h3>
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white flex-shrink-0" />
        </div>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{props.criadasHoje}</p>
        <p className="text-[10px] sm:text-xs text-blue-100 mt-0.5 sm:mt-1 font-medium truncate">
          {formatCurrency(props.valorCriadasHoje)}
        </p>
      </div>

      {/* Card: Abertas */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-md p-2 sm:p-3 md:p-4 border-2 border-orange-500 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-white leading-tight">Abertas</h3>
          <CircleDot className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white flex-shrink-0" />
        </div>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{props.abertasTotal}</p>
        <p className="text-[10px] sm:text-xs text-orange-100 mt-0.5 sm:mt-1 font-medium truncate">
          {formatCurrency(props.abertasValorTotal)}
        </p>
      </div>

      {/* Card: Ganhas */}
      <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-md p-2 sm:p-3 md:p-4 border-2 border-green-600 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-white leading-tight">Ganhas</h3>
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white flex-shrink-0" />
        </div>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">{formatCurrency(props.ganhosValorTotal)}</p>
        <div className="flex items-center justify-between mt-0.5 sm:mt-1">
          <p className="text-[10px] sm:text-xs text-green-100 font-medium truncate">
            {props.ganhosTotalOportunidades} ops
          </p>
          <p className="text-[10px] sm:text-xs text-green-100 font-bold bg-green-800/30 px-1.5 py-0.5 rounded-full">
            {props.taxaGanhas.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Card: Perdidas */}
      <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-lg shadow-md p-2 sm:p-3 md:p-4 border-2 border-red-500 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-white leading-tight">Perdidas</h3>
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white flex-shrink-0" />
        </div>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{props.perdidasTotal}</p>
        <p className="text-[10px] sm:text-xs text-red-100 mt-0.5 sm:mt-1 font-medium truncate">
          {formatCurrency(props.perdidasValorCriadasDentro + props.perdidasValorCriadasFora)}
        </p>
      </div>

      {/* Card: Ticket Médio */}
      <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-md p-2 sm:p-3 md:p-4 border-2 border-purple-500 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-white leading-tight">Ticket Médio</h3>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white flex-shrink-0" />
        </div>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
          {formatCurrency(ticketMedio)}
        </p>
        <p className="text-[10px] sm:text-xs text-purple-100 mt-0.5 sm:mt-1 font-medium truncate">
          {props.ganhosTotalOportunidades} vendas
        </p>
      </div>

      {/* Card: Meta do Mês */}
      {props.meta !== undefined && props.meta > 0 ? (
        <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-md p-2 sm:p-3 md:p-4 border-2 border-amber-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-white leading-tight">Falta Atingir</h3>
            <Target className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white flex-shrink-0" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white truncate">
            {formatCurrency(Math.max(0, props.meta - props.ganhosValorTotal))}
          </p>
          <p className="text-[10px] sm:text-xs text-amber-100 mt-0.5 sm:mt-1 font-medium truncate">
            Meta: {formatCurrency(props.meta)}
          </p>
        </div>
      ) : props.meta !== undefined ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-md p-2 sm:p-3 md:p-4 border-2 border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800 leading-tight">Meta do Mês</h3>
            <Target className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-600 flex-shrink-0" />
          </div>
          <p className="text-base sm:text-lg md:text-xl font-bold text-gray-700">Sem meta</p>
          <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 font-medium">
            cadastrada
          </p>
        </div>
      ) : null}
    </div>
  )
})

