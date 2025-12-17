import { memo, useMemo, useState } from "react"
import { List } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GestorCardHoje } from "./GestorCardHoje"
import { GestorCardAbertas } from "./GestorCardAbertas"
import { GestorCardPerdidas } from "./GestorCardPerdidas"
import { GestorCardGanhos } from "./GestorCardGanhos"
import { GestorCardTaxaConversao } from "./GestorCardTaxaConversao"
import { GestorCardTicketMedio } from "./GestorCardTicketMedio"
import { GestorOportunidadesListaDialog } from "./GestorOportunidadesListaDialog"

interface GestorEstatisticasCardsProps {
  unidadeId?: number | null
  dataInicio?: string | null
  dataFim?: string | null
  funilId?: number | null
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
  unidadeId = null,
  dataInicio = null,
  dataFim = null,
  funilId = null,
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
  const [listaOpen, setListaOpen] = useState(false)
  const [listaTipo, setListaTipo] = useState<"ganhas" | "perdidas" | "abertas">("ganhas")
  const [listaTitulo, setListaTitulo] = useState("Oportunidades")

  const canOpenLista = Boolean(unidadeId)

  const periodoLabel = useMemo(() => {
    if (!dataInicio || !dataFim) return ""
    return `${dataInicio} → ${dataFim}`
  }, [dataInicio, dataFim])

  const openLista = (tipo: "ganhas" | "perdidas" | "abertas", titulo: string) => {
    setListaTipo(tipo)
    setListaTitulo(periodoLabel ? `${titulo} (${periodoLabel})` : titulo)
    setListaOpen(true)
  }

  return (
    <div className="flex w-full items-stretch gap-3 overflow-x-scroll pb-2 scrollbar-gutter-stable snap-x snap-mandatory">
      <div className="relative w-[240px] flex-shrink-0 snap-start">
        <GestorCardGanhos
        valorTotal={ganhosValorTotal}
        totalOportunidades={ganhosTotalOportunidades}
        criadasDentro={ganhosCriadasDentro}
        valorCriadasDentro={ganhosValorCriadasDentro}
        criadasFora={ganhosCriadasFora}
        valorCriadasFora={ganhosValorCriadasFora}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white"
          aria-label="Abrir lista de oportunidades ganhas"
          disabled={!canOpenLista}
          onClick={() => openLista("ganhas", "Oportunidades ganhas")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-[240px] flex-shrink-0 snap-start">
        <GestorCardHoje
        criadasHoje={criadasHoje}
        valorCriadasHoje={valorCriadasHoje}
        criadasOntem={criadasOntem}
        valorCriadasOntem={valorCriadasOntem}
        ganhasHoje={ganhasHoje}
        valorGanhasHoje={valorGanhasHoje}
        />
      </div>

      <div className="relative w-[240px] flex-shrink-0 snap-start">
        <GestorCardAbertas
        total={abertasTotal}
        valorTotal={abertasValorTotal}
        criadasNoPeriodo={abertasCriadasNoPeriodo}
        valorCriadasNoPeriodo={abertasValorCriadasNoPeriodo}
        criadasOutrosPeriodos={abertasCriadasOutrosPeriodos}
        valorCriadasOutrosPeriodos={abertasValorCriadasOutrosPeriodos}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white"
          aria-label="Abrir lista de oportunidades abertas"
          disabled={!canOpenLista}
          onClick={() => openLista("abertas", "Oportunidades abertas")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative w-[240px] flex-shrink-0 snap-start">
        <GestorCardPerdidas
        total={perdidasTotal}
        criadasDentro={perdidasCriadasDentro}
        valorCriadasDentro={perdidasValorCriadasDentro}
        criadasFora={perdidasCriadasFora}
        valorCriadasFora={perdidasValorCriadasFora}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0 text-white/90 hover:bg-white/10 hover:text-white"
          aria-label="Abrir lista de oportunidades perdidas"
          disabled={!canOpenLista}
          onClick={() => openLista("perdidas", "Oportunidades perdidas")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-[240px] flex-shrink-0 snap-start">
        <GestorCardTaxaConversao
        criadas={taxaCriadas}
        ganhas={taxaGanhas}
        />
      </div>

      <div className="w-[240px] flex-shrink-0 snap-start">
        <GestorCardTicketMedio
        totalVendas={ticketTotalVendas}
        valorTotal={ticketValorTotal}
        />
      </div>

      <GestorOportunidadesListaDialog
        open={listaOpen}
        onOpenChange={setListaOpen}
        tipo={listaTipo}
        titulo={listaTitulo}
        unidadeId={unidadeId}
        dataInicio={dataInicio}
        dataFim={dataFim}
        funilId={funilId}
      />
    </div>
  )
})

