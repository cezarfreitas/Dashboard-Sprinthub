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
    getPeriodoDatas,
    fetchCardsData
  } = useConsultorDashboard()

  // Calcular percentual da meta
  const valorVendido = cardsData?.ganhosValorTotalMes || 0
  const meta = cardsData?.ganhosMeta || 0
  const percentualMeta = meta > 0 ? (valorVendido / meta) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderConsultor 
        valorVendido={valorVendido}
        percentualMeta={percentualMeta}
      />
      <ConsultorPeriodoFilter
        periodoFiltro={periodoFiltro}
        setPeriodoFiltro={setPeriodoFiltro}
        dataInicioPersonalizada={dataInicioPersonalizada}
        setDataInicioPersonalizada={setDataInicioPersonalizada}
        dataFimPersonalizada={dataFimPersonalizada}
        setDataFimPersonalizada={setDataFimPersonalizada}
        funilSelecionado={funilSelecionado}
        setFunilSelecionado={setFunilSelecionado}
        vendedorId={consultor?.id}
        onSyncComplete={fetchCardsData}
      />
      <div className="max-w-[1800px] w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 space-y-3 sm:space-y-4">
        {loadingCards ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Carregando dados...</div>
          </div>
        ) : (
          <>
            {/* Barra de Meta com Cards integrados */}
            <ConsultorBarraProgressoMeta
              valorAtual={cardsData?.ganhosValorTotalMes || 0}
              meta={cardsData?.ganhosMeta || 0}
              vendedorId={consultor?.id}
              mes={getPeriodoDatas() ? new Date().getMonth() + 1 : undefined}
              ano={getPeriodoDatas() ? new Date().getFullYear() : undefined}
              criadasHoje={cardsData?.criadasHoje || 0}
              valorCriadasHoje={cardsData?.valorCriadasHoje || 0}
              abertasTotal={cardsData?.abertasTotal || 0}
              abertasValorTotal={cardsData?.abertasValorTotal || 0}
              ganhosTotalOportunidades={cardsData?.ganhosTotalOportunidades || 0}
              ganhosValorTotal={cardsData?.ganhosValorTotal || 0}
              perdidasTotal={cardsData?.perdidasTotal || 0}
              perdidasValorTotal={(cardsData?.perdidasValorCriadasDentro || 0) + (cardsData?.perdidasValorCriadasFora || 0)}
              ticketMedio={cardsData?.ganhosTotalOportunidades > 0 ? (cardsData?.ganhosValorTotal || 0) / cardsData.ganhosTotalOportunidades : 0}
            />
            {consultor && getPeriodoDatas() && (
              <>
                <ConsultorFunilEtapas
                  vendedorId={consultor.id}
                  dataInicio={getPeriodoDatas().dataInicio}
                  dataFim={getPeriodoDatas().dataFim}
                  funilSelecionado={funilSelecionado}
                />
                <ConsultorOportunidadesDiarias
                  unidadeId={consultor.unidade_id || 0}
                  vendedorId={consultor.id}
                  dataInicio={getPeriodoDatas().dataInicio}
                  dataFim={getPeriodoDatas().dataFim}
                  funilSelecionado={funilSelecionado}
                />
                <ConsultorMatrizMotivosPerda
                  unidadeId={consultor.unidade_id || 0}
                  vendedorId={consultor.id}
                  dataInicio={getPeriodoDatas().dataInicio}
                  dataFim={getPeriodoDatas().dataFim}
                  funilSelecionado={funilSelecionado}
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
