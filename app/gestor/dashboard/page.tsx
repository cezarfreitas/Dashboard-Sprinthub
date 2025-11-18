"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useGestorDashboard, VendedorStats } from "@/hooks/gestor/useGestorDashboard"
import { GestorHeader } from "@/components/gestor/GestorHeader"
import { GestorUnidadesBadges } from "@/components/gestor/GestorUnidadesBadges"
import { GestorPeriodoFilter } from "@/components/gestor/GestorPeriodoFilter"
import { GestorResumoUnidade } from "@/components/gestor/GestorResumoUnidade"
import { GestorMetaCard } from "@/components/gestor/GestorMetaCard"
import { GestorPerformanceTable } from "@/components/gestor/GestorPerformanceTable"
import { GestorFunilVendas } from "@/components/gestor/GestorFunilVendas"
import { GestorOportunidadesDialog } from "@/components/gestor/GestorOportunidadesDialog"
import { GestorMatrizTabs } from "@/components/gestor/GestorMatrizTabs"
import { GestorPerformanceVendedores } from "@/components/gestor/GestorPerformanceVendedores"
import { GestorAtendimentosWhatsapp } from "@/components/gestor/GestorAtendimentosWhatsapp"
import { GestorFunilColunas } from "@/components/gestor/GestorFunilColunas"
import { GestorMatrizPerdasVendedor } from "@/components/gestor/GestorMatrizPerdasVendedor"
import { GestorNegociosGanhos } from "@/components/gestor/GestorNegociosGanhos"

export default function GestorDashboard() {
  const {
    gestor,
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
    getPeriodoDatas,
    fetchStats,
    handleLogout
  } = useGestorDashboard()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [vendedorSelecionado, setVendedorSelecionado] = useState<VendedorStats | null>(null)

  const periodoDatas = useMemo(() => getPeriodoDatas(), [getPeriodoDatas])

  const handleVerOportunidades = useCallback((vendedor: VendedorStats) => {
    setVendedorSelecionado(vendedor)
    setDialogOpen(true)
  }, [])

  if (!gestor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GestorHeader
        gestorName={gestor.name}
        gestorLastName={gestor.lastName}
        totalUnidades={gestor.unidades.length}
        onLogout={handleLogout}
      />

      <GestorUnidadesBadges
        unidades={gestor.unidades}
        unidadeSelecionada={unidadeSelecionada}
        onSelectUnidade={setUnidadeSelecionada}
      />

      <GestorPeriodoFilter
        periodoFiltro={periodoFiltro}
        setPeriodoFiltro={setPeriodoFiltro}
        dataInicioPersonalizada={dataInicioPersonalizada}
        setDataInicioPersonalizada={setDataInicioPersonalizada}
        dataFimPersonalizada={dataFimPersonalizada}
        setDataFimPersonalizada={setDataFimPersonalizada}
      />

      <div className="max-w-[1900px] mx-auto px-20 py-3">
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
                  Gestor ID: {gestor?.id} | Unidade: {unidadeSelecionada}
                </p>
                <Button onClick={fetchStats} className="mt-4" variant="outline">
                  Recarregar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-3 w-full">
              <GestorResumoUnidade
                unidadeId={unidadeSelecionada}
                dataInicio={periodoDatas.dataInicio}
                dataFim={periodoDatas.dataFim}
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

            <GestorMatrizTabs
              unidadeId={unidadeSelecionada}
              dataInicio={periodoDatas.dataInicio}
              dataFim={periodoDatas.dataFim}
              vendedores={stats.vendedores.map(v => ({
                id: v.id,
                name: v.name,
                lastName: v.lastName
              }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <GestorPerformanceVendedores
                unidadeId={unidadeSelecionada}
                dataInicio={periodoDatas.dataInicio}
                dataFim={periodoDatas.dataFim}
              />

              <GestorAtendimentosWhatsapp
                unidadeId={unidadeSelecionada}
                dataInicio={periodoDatas.dataInicio}
                dataFim={periodoDatas.dataFim}
              />
            </div>

            <GestorMatrizPerdasVendedor
              unidadeId={unidadeSelecionada}
              dataInicio={periodoDatas.dataInicio}
              dataFim={periodoDatas.dataFim}
            />

            <GestorNegociosGanhos
              unidadeId={unidadeSelecionada}
              dataInicio={periodoDatas.dataInicio}
              dataFim={periodoDatas.dataFim}
            />
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
  )
}
