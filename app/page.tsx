"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import FunilDashboard from "@/components/funil-dashboard"
import MonthFilter from "@/components/month-filter"
import NovasOportunidadesCard from "@/components/novas-oportunidades-card"
import GanhosCard from "@/components/ganhos-card"
import PerdidosCard from "@/components/perdidos-card"
import AbertosCard from "@/components/abertos-card"
import CriacaoOportunidadesChart from "@/components/criacao-oportunidades-chart"
import OportunidadesChart from "@/components/oportunidades-chart"
import ResumoUnidades from "@/components/resumo-unidades"
import RankingMotivosPerda from "@/components/ranking-motivos-perda"

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  
  // Estado para os filtros
  const dataAtual = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(dataAtual.getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(dataAtual.getFullYear())
  const [vendedorSelecionado, setVendedorSelecionado] = useState<number | null>(null)
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<number | null>(null)

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <MonthFilter 
        mes={mesSelecionado}
        ano={anoSelecionado}
        vendedorId={vendedorSelecionado}
        unidadeId={unidadeSelecionada}
        onMesChange={setMesSelecionado}
        onAnoChange={setAnoSelecionado}
        onVendedorChange={setVendedorSelecionado}
        onUnidadeChange={setUnidadeSelecionada}
      />

      {/* Cards Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <NovasOportunidadesCard 
          mes={mesSelecionado}
          ano={anoSelecionado}
          vendedorId={vendedorSelecionado}
          unidadeId={unidadeSelecionada}
        />
        <GanhosCard 
          mes={mesSelecionado}
          ano={anoSelecionado}
          vendedorId={vendedorSelecionado}
          unidadeId={unidadeSelecionada}
        />
        <PerdidosCard 
          mes={mesSelecionado}
          ano={anoSelecionado}
          vendedorId={vendedorSelecionado}
          unidadeId={unidadeSelecionada}
        />
        <AbertosCard 
          mes={mesSelecionado}
          ano={anoSelecionado}
          vendedorId={vendedorSelecionado}
          unidadeId={unidadeSelecionada}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <CriacaoOportunidadesChart 
          mes={mesSelecionado}
          ano={anoSelecionado}
          vendedorId={vendedorSelecionado}
          unidadeId={unidadeSelecionada}
        />
        <OportunidadesChart 
          mes={mesSelecionado}
          ano={anoSelecionado}
          vendedorId={vendedorSelecionado}
          unidadeId={unidadeSelecionada}
        />
      </div>

      {/* Resumo por Unidade */}
      <ResumoUnidades 
        mes={mesSelecionado}
        ano={anoSelecionado}
        vendedorId={vendedorSelecionado}
        unidadeId={unidadeSelecionada}
      />

      {/* Ranking de Motivos de Perda */}
      <RankingMotivosPerda 
        mes={mesSelecionado}
        ano={anoSelecionado}
        vendedorId={vendedorSelecionado}
        unidadeId={unidadeSelecionada}
      />

      {/* Funil de Vendas */}
      <FunilDashboard 
        vendedorId={vendedorSelecionado}
        unidadeId={unidadeSelecionada}
      />
    </div>
  )
}
