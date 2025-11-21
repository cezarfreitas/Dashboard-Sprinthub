import { memo } from "react"
import { GestorCardHoje } from "./GestorCardHoje"
import { GestorCardAbertas } from "./GestorCardAbertas"
import { GestorCardPerdidas } from "./GestorCardPerdidas"
import { GestorCardGanhos } from "./GestorCardGanhos"
import { GestorCardTaxaConversao } from "./GestorCardTaxaConversao"
import { GestorCardTicketMedio } from "./GestorCardTicketMedio"

interface GestorEstatisticasCardsProps {
  // Dados do card HOJE
  criadasHoje?: number
  valorCriadasHoje?: number
  criadasOntem?: number
  valorCriadasOntem?: number
  ganhasHoje?: number
  valorGanhasHoje?: number

  // Dados do card ABERTAS
  abertasTotal?: number
  abertasValorTotal?: number
  abertasCriadasNoPeriodo?: number
  abertasValorCriadasNoPeriodo?: number
  abertasCriadasOutrosPeriodos?: number
  abertasValorCriadasOutrosPeriodos?: number

  // Dados do card PERDIDAS
  perdidasTotal?: number
  perdidasCriadasDentro?: number
  perdidasValorCriadasDentro?: number
  perdidasCriadasFora?: number
  perdidasValorCriadasFora?: number

  // Dados do card GANHOS
  ganhosValorTotal?: number
  ganhosTotalOportunidades?: number
  ganhosCriadasDentro?: number
  ganhosValorCriadasDentro?: number
  ganhosCriadasFora?: number
  ganhosValorCriadasFora?: number

  // Dados do card TAXA DE CONVERSÃO
  taxaCriadas?: number
  taxaGanhas?: number

  // Dados do card TICKET MÉDIO
  ticketTotalVendas?: number
  ticketValorTotal?: number
}

export const GestorEstatisticasCards = memo(function GestorEstatisticasCards({
  criadasHoje = 0,
  valorCriadasHoje = 0,
  criadasOntem = 0,
  valorCriadasOntem = 0,
  ganhasHoje = 0,
  valorGanhasHoje = 0,
  abertasTotal = 0,
  abertasValorTotal = 0,
  abertasCriadasNoPeriodo = 0,
  abertasValorCriadasNoPeriodo = 0,
  abertasCriadasOutrosPeriodos = 0,
  abertasValorCriadasOutrosPeriodos = 0,
  perdidasTotal = 0,
  perdidasCriadasDentro = 0,
  perdidasValorCriadasDentro = 0,
  perdidasCriadasFora = 0,
  perdidasValorCriadasFora = 0,
  ganhosValorTotal = 0,
  ganhosTotalOportunidades = 0,
  ganhosCriadasDentro = 0,
  ganhosValorCriadasDentro = 0,
  ganhosCriadasFora = 0,
  ganhosValorCriadasFora = 0,
  taxaCriadas = 0,
  taxaGanhas = 0,
  ticketTotalVendas = 0,
  ticketValorTotal = 0
}: GestorEstatisticasCardsProps) {
  return (
    <div className="flex gap-4 w-full overflow-x-auto pb-2 items-stretch">
      <div className="min-w-[220px] flex-shrink-0">
        <GestorCardGanhos
        valorTotal={ganhosValorTotal}
        totalOportunidades={ganhosTotalOportunidades}
        criadasDentro={ganhosCriadasDentro}
        valorCriadasDentro={ganhosValorCriadasDentro}
        criadasFora={ganhosCriadasFora}
        valorCriadasFora={ganhosValorCriadasFora}
        />
      </div>

      <div className="min-w-[200px] flex-shrink-0">
        <GestorCardHoje
        criadasHoje={criadasHoje}
        valorCriadasHoje={valorCriadasHoje}
        criadasOntem={criadasOntem}
        valorCriadasOntem={valorCriadasOntem}
        ganhasHoje={ganhasHoje}
        valorGanhasHoje={valorGanhasHoje}
        />
      </div>

      <div className="min-w-[280px] flex-shrink-0">
        <GestorCardAbertas
        total={abertasTotal}
        valorTotal={abertasValorTotal}
        criadasNoPeriodo={abertasCriadasNoPeriodo}
        valorCriadasNoPeriodo={abertasValorCriadasNoPeriodo}
        criadasOutrosPeriodos={abertasCriadasOutrosPeriodos}
        valorCriadasOutrosPeriodos={abertasValorCriadasOutrosPeriodos}
        />
      </div>

      <div className="min-w-[240px] flex-shrink-0">
        <GestorCardPerdidas
        total={perdidasTotal}
        criadasDentro={perdidasCriadasDentro}
        valorCriadasDentro={perdidasValorCriadasDentro}
        criadasFora={perdidasCriadasFora}
        valorCriadasFora={perdidasValorCriadasFora}
        />
      </div>

      <div className="min-w-[200px] flex-shrink-0">
        <GestorCardTaxaConversao
        criadas={taxaCriadas}
        ganhas={taxaGanhas}
        />
      </div>

      <div className="min-w-[200px] flex-shrink-0">
        <GestorCardTicketMedio
        totalVendas={ticketTotalVendas}
        valorTotal={ticketValorTotal}
        />
      </div>
    </div>
  )
})

