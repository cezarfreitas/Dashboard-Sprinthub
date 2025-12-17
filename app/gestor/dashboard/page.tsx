"use client"

import { HeaderGestor } from "@/components/header_gestor"
import { useGestorDashboard } from "@/hooks/gestor/useGestorDashboard"
import { GestorEstatisticasCards } from "@/components/gestor/GestorEstatisticasCards"
import { GestorPeriodoFilter } from "@/components/gestor/GestorPeriodoFilter"
import { GestorBarraProgressoMeta } from "@/components/gestor/GestorBarraProgressoMeta"
import { GestorMatrizMotivosPerda } from "@/components/gestor/GestorMatrizMotivosPerda"
import { GestorOportunidadesDiarias } from "@/components/gestor/GestorOportunidadesDiarias"
import { GestorGanhosDiarios } from "@/components/gestor/GestorGanhosDiarios"
import { AppFooter } from "@/components/app-footer"

export default function GestorDashboard() {
  const { 
    unidadeSelecionada, 
    setUnidadeSelecionada,
    periodoFiltro,
    setPeriodoFiltro,
    dataInicioPersonalizada,
    setDataInicioPersonalizada,
    dataFimPersonalizada,
    setDataFimPersonalizada,
    funilSelecionado,
    setFunilSelecionado,
    cardsData,
    loadingCards,
    getPeriodoDatas,
    exportarOportunidades,
    exportando
  } = useGestorDashboard()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderGestor 
        unidadeSelecionada={unidadeSelecionada}
        setUnidadeSelecionada={setUnidadeSelecionada}
      />
      <GestorPeriodoFilter
        periodoFiltro={periodoFiltro}
        setPeriodoFiltro={setPeriodoFiltro}
        dataInicioPersonalizada={dataInicioPersonalizada}
        setDataInicioPersonalizada={setDataInicioPersonalizada}
        dataFimPersonalizada={dataFimPersonalizada}
        setDataFimPersonalizada={setDataFimPersonalizada}
        funilSelecionado={funilSelecionado}
        setFunilSelecionado={setFunilSelecionado}
        onExportar={exportarOportunidades}
        exportando={exportando}
      />
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-4">
        {loadingCards ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Carregando dados...</div>
          </div>
        ) : (
          <>
            {cardsData?.ganhosMeta > 0 && (
              <GestorBarraProgressoMeta
                valorAtual={cardsData?.ganhosValorTotalMes || 0}
                meta={cardsData?.ganhosMeta || 0}
                unidadeId={unidadeSelecionada}
                mes={getPeriodoDatas() ? new Date().getMonth() + 1 : undefined}
                ano={getPeriodoDatas() ? new Date().getFullYear() : undefined}
              />
            )}
            <GestorEstatisticasCards
            unidadeId={unidadeSelecionada}
            dataInicio={getPeriodoDatas() ? getPeriodoDatas().dataInicio : null}
            dataFim={getPeriodoDatas() ? getPeriodoDatas().dataFim : null}
            funilId={funilSelecionado ? Number(funilSelecionado) : null}
            criadasHoje={cardsData?.criadasHoje || 0}
            valorCriadasHoje={cardsData?.valorCriadasHoje || 0}
            criadasOntem={cardsData?.criadasOntem || 0}
            valorCriadasOntem={cardsData?.valorCriadasOntem || 0}
            ganhasHoje={cardsData?.ganhasHoje || 0}
            valorGanhasHoje={cardsData?.valorGanhasHoje || 0}
            abertasTotal={cardsData?.abertasTotal || 0}
            abertasValorTotal={cardsData?.abertasValorTotal || 0}
            abertasCriadasNoPeriodo={cardsData?.abertasCriadasNoPeriodo || 0}
            abertasValorCriadasNoPeriodo={cardsData?.abertasValorCriadasNoPeriodo || 0}
            abertasCriadasOutrosPeriodos={cardsData?.abertasCriadasOutrosPeriodos || 0}
            abertasValorCriadasOutrosPeriodos={cardsData?.abertasValorCriadasOutrosPeriodos || 0}
            perdidasTotal={cardsData?.perdidasTotal || 0}
            perdidasCriadasDentro={cardsData?.perdidasCriadasDentro || 0}
            perdidasValorCriadasDentro={cardsData?.perdidasValorCriadasDentro || 0}
            perdidasCriadasFora={cardsData?.perdidasCriadasFora || 0}
            perdidasValorCriadasFora={cardsData?.perdidasValorCriadasFora || 0}
            ganhosValorTotal={cardsData?.ganhosValorTotal || 0}
            ganhosTotalOportunidades={cardsData?.ganhosTotalOportunidades || 0}
            ganhosCriadasDentro={cardsData?.ganhosCriadasDentro || 0}
            ganhosValorCriadasDentro={cardsData?.ganhosValorCriadasDentro || 0}
            ganhosCriadasFora={cardsData?.ganhosCriadasFora || 0}
            ganhosValorCriadasFora={cardsData?.ganhosValorCriadasFora || 0}
            taxaCriadas={cardsData?.taxaCriadas || 0}
            taxaGanhas={cardsData?.taxaGanhas || 0}
            ticketTotalVendas={cardsData?.ticketTotalVendas || 0}
            ticketValorTotal={cardsData?.ticketValorTotal || 0}
            />
            {unidadeSelecionada && getPeriodoDatas() && (
              <>
                <GestorOportunidadesDiarias
                  unidadeId={unidadeSelecionada}
                  dataInicio={getPeriodoDatas().dataInicio}
                  dataFim={getPeriodoDatas().dataFim}
                />
                <GestorGanhosDiarios
                  unidadeId={unidadeSelecionada}
                  dataInicio={getPeriodoDatas().dataInicio}
                  dataFim={getPeriodoDatas().dataFim}
                />
                <GestorMatrizMotivosPerda
                  unidadeId={unidadeSelecionada}
                  dataInicio={getPeriodoDatas().dataInicio}
                  dataFim={getPeriodoDatas().dataFim}
                />
              </>
            )}
          </>
        )}
      </div>
      <AppFooter />
    </div>
  )
}
