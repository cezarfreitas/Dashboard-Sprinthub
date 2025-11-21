"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useAnalyticsUnidade } from "@/hooks/analytics/useAnalyticsUnidade"
import { VendedorStats } from "@/hooks/gestor/useGestorDashboard"
import { ProtectedRoute } from "@/components/protected-route"
import { Header } from "@/components/header"
import { GestorPeriodoFilter } from "@/components/gestor/GestorPeriodoFilter"
import { GestorUnidadesBadges } from "@/components/gestor/GestorUnidadesBadges"
import { GestorResumoUnidade } from "@/components/gestor/GestorResumoUnidade"
import { GestorMetaCard } from "@/components/gestor/GestorMetaCard"
import { GestorPerformanceTable } from "@/components/gestor/GestorPerformanceTable"
import { GestorFunilVendas } from "@/components/gestor/GestorFunilVendas"
import { GestorOportunidadesDialog } from "@/components/gestor/GestorOportunidadesDialog"

export default function AnaliseUnidadePage() {
  const {
    unidades,
    unidadeSelecionada,
    setUnidadeSelecionada,
    stats,
    loading,
    error,
    periodoFiltro,
    setPeriodoFiltro,
    dataInicioPersonalizada,
    setDataInicioPersonalizada,
    dataFimPersonalizada,
    setDataFimPersonalizada,
    funilSelecionado,
    setFunilSelecionado,
    getPeriodoDatas,
    fetchStats
  } = useAnalyticsUnidade()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [vendedorSelecionado, setVendedorSelecionado] = useState<VendedorStats | null>(null)

  const periodoDatas = useMemo(() => getPeriodoDatas(), [getPeriodoDatas])

  const handleVerOportunidades = useCallback((vendedor: VendedorStats) => {
    setVendedorSelecionado(vendedor)
    setDialogOpen(true)
  }, [])

  const unidadesFormatadas = useMemo(() => {
    return unidades.map(u => ({
      id: u.id,
      nome: u.nome,
      dpto_gestao: null
    }))
  }, [unidades])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-20 py-3">
          <div className="mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Análise Unidade</h1>
                <p className="text-gray-600 mt-1">Análise detalhada por unidade</p>
              </div>
            </div>
          </div>
          
          <GestorUnidadesBadges
            unidades={unidadesFormatadas}
            unidadeSelecionada={unidadeSelecionada}
            onSelectUnidade={setUnidadeSelecionada}
            funilSelecionado={funilSelecionado}
            setFunilSelecionado={setFunilSelecionado}
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
          />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">Carregando dados...</p>
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50 max-w-4xl mx-auto">
              <CardContent className="pt-6">
                <div className="text-center text-red-700">
                  <p className="font-medium">Erro ao carregar dados</p>
                  <p className="text-sm">{error}</p>
                  <Button onClick={fetchStats} className="mt-4">
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !stats ? (
            <Card className="max-w-4xl mx-auto">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12">
                  <p className="font-medium mb-2">Nenhum dado disponível</p>
                  <p className="text-sm">
                    Unidade: {unidadeSelecionada}
                  </p>
                  <Button onClick={fetchStats} className="mt-4" variant="outline">
                    Recarregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 w-full">
                <GestorResumoUnidade
                  unidadeId={unidadeSelecionada}
                  dataInicio={periodoDatas.dataInicio}
                  dataFim={periodoDatas.dataFim}
                  funilId={funilSelecionado}
                />

                <GestorMetaCard
                  metaTotal={stats.meta_total}
                  valorGanho={stats.valor_ganho}
                />
              </div>

              <GestorPerformanceTable
                vendedores={stats.vendedores}
                onVerOportunidades={handleVerOportunidades}
              />

              <GestorFunilVendas etapasFunil={stats.etapas_funil} />
            </div>
          )}
        </div>

        <GestorOportunidadesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          vendedor={vendedorSelecionado}
          dataInicio={periodoDatas.dataInicio}
          dataFim={periodoDatas.dataFim}
        />
      </div>
    </ProtectedRoute>
  )
}
