"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import OportunidadesChart from "@/components/oportunidades-chart"
import MonthFilter from "@/components/month-filter"

export default function AnalyticsPage() {
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
      <div>
        <h1 className="text-4xl font-display">Analytics</h1>
        <p className="text-muted-foreground font-body">
          Análise detalhada de receitas e metas
        </p>
      </div>

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

      {/* Gráfico de Oportunidades Ganhas */}
      <OportunidadesChart 
        mes={mesSelecionado}
        ano={anoSelecionado}
        vendedorId={vendedorSelecionado}
        unidadeId={unidadeSelecionada}
      />
    </div>
  )
}

