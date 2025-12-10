"use client"

import { HeaderConsultor } from "@/components/header_consultor"
import { useConsultorDashboard } from "@/hooks/consultor/useConsultorDashboard"
import { ConsultorEstatisticasCards } from "@/components/consultor/ConsultorEstatisticasCards"
import { ConsultorPeriodoFilter } from "@/components/consultor/ConsultorPeriodoFilter"
import { ConsultorBarraProgressoMeta } from "@/components/consultor/ConsultorBarraProgressoMeta"
import { ConsultorMatrizMotivosPerda } from "@/components/consultor/ConsultorMatrizMotivosPerda"
import { ConsultorOportunidadesDiarias } from "@/components/consultor/ConsultorOportunidadesDiarias"
import { ConsultorFunilEtapas } from "@/components/consultor/ConsultorFunilEtapas"
import { AppFooter } from "@/components/app-footer"

export default function ConsultorDashboard() {
  const { 
    consultor,
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
    getPeriodoDatas
  } = useConsultorDashboard()

  console.log('🏠 ConsultorDashboard:', { 
    consultor: consultor?.id, 
    periodo: getPeriodoDatas(),
    temPeriodo: !!getPeriodoDatas()
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderConsultor />
      <ConsultorPeriodoFilter
        periodoFiltro={periodoFiltro}
        setPeriodoFiltro={setPeriodoFiltro}
        dataInicioPersonalizada={dataInicioPersonalizada}
        setDataInicioPersonalizada={setDataInicioPersonalizada}
        dataFimPersonalizada={dataFimPersonalizada}
        setDataFimPersonalizada={setDataFimPersonalizada}
        funilSelecionado={funilSelecionado}
        setFunilSelecionado={setFunilSelecionado}
      />
      <div className="max-w-[1800px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-4">
        {loadingCards ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Carregando dados...</div>
          </div>
        ) : (
          <>
            {/* Barra de Meta - sempre mostra, mesmo sem meta cadastrada */}
            <ConsultorBarraProgressoMeta
              valorAtual={cardsData?.ganhosValorTotalMes || 0}
              meta={cardsData?.ganhosMeta || 0}
              vendedorId={consultor?.id}
              mes={getPeriodoDatas() ? new Date().getMonth() + 1 : undefined}
              ano={getPeriodoDatas() ? new Date().getFullYear() : undefined}
            />
            <ConsultorEstatisticasCards
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
            meta={cardsData?.ganhosMeta || 0}
            percentualMeta={cardsData?.ganhosMeta > 0 ? ((cardsData?.ganhosValorTotalMes || 0) / cardsData.ganhosMeta) * 100 : 0}
            />
            {consultor && getPeriodoDatas() && (
              <>
                <ConsultorFunilEtapas
                  vendedorId={consultor.id}
                  dataInicio={getPeriodoDatas().dataInicio}
                  dataFim={getPeriodoDatas().dataFim}
                />
                <ConsultorOportunidadesDiarias
                  unidadeId={consultor.unidade_id || 0}
                  vendedorId={consultor.id}
                  dataInicio={getPeriodoDatas().dataInicio}
                  dataFim={getPeriodoDatas().dataFim}
                />
                <ConsultorMatrizMotivosPerda
                  unidadeId={consultor.unidade_id || 0}
                  vendedorId={consultor.id}
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
