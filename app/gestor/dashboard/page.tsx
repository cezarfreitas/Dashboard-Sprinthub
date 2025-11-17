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
    handleLogout,
    exportarOportunidades,
    exportando
  } = useGestorDashboard()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [vendedorSelecionado, setVendedorSelecionado] = useState<VendedorStats | null>(null)

  const periodoDatas = useMemo(() => getPeriodoDatas(), [getPeriodoDatas])

  const getInicioMesAtual = useCallback(() => {
    const dataInicioObj = new Date(periodoDatas.dataInicio)
    return {
      ano: dataInicioObj.getFullYear(),
      mes: dataInicioObj.getMonth() + 1,
      primeiraDataMes: periodoDatas.dataInicio,
    }
  }, [periodoDatas])

  const escapeCsv = useCallback((value: string | number | null | undefined) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }, [])

  const handleVerOportunidades = useCallback((vendedor: VendedorStats) => {
    setVendedorSelecionado(vendedor)
    setDialogOpen(true)
  }, [])

  const handleExportarOportunidades = useCallback(async (vendedor: VendedorStats) => {
    try {
      const { mes, ano } = getInicioMesAtual()

      const response = await fetch(
        `/api/oportunidades/vendedor?vendedor_id=${vendedor.id}&data_inicio=${periodoDatas.dataInicio}&data_fim=${periodoDatas.dataFim}`
      )

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.oportunidades) {
        const headers = ['ID', 'Título', 'Valor', 'Status', 'Etapa', 'Data Criação', 'Motivo Perda']
        const csvContent = [
          headers.map(escapeCsv).join(','),
          ...data.oportunidades.map((op: any) => [
            escapeCsv(op.id),
            escapeCsv(op.titulo),
            escapeCsv(op.valor),
            escapeCsv(op.ganho === 1 ? 'Ganha' : op.perda === 1 ? 'Perdida' : 'Aberta'),
            escapeCsv(op.coluna_nome || ''),
            escapeCsv(new Date(op.created_date).toLocaleDateString('pt-BR')),
            escapeCsv(op.motivo_perda || '')
          ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `oportunidades_${vendedor.name}_${vendedor.lastName}_${mes}_${ano}.csv`
        link.click()
      }
    } catch (err) {
      // Erro silencioso - pode adicionar toast notification aqui
    }
  }, [getInicioMesAtual, periodoDatas, escapeCsv])

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
        onExportar={exportarOportunidades}
        exportando={exportando}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">Carregando dados...</p>
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
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
          <Card>
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
          <div className="space-y-6">
            <GestorResumoUnidade
              unidadeId={unidadeSelecionada}
              dataInicio={periodoDatas.dataInicio}
              dataFim={periodoDatas.dataFim}
            />

            <GestorMetaCard
              metaTotal={stats.meta_total}
              valorGanho={stats.valor_ganho}
            />

            <GestorPerformanceTable
              vendedores={stats.vendedores}
              onVerOportunidades={handleVerOportunidades}
              onExportarOportunidades={handleExportarOportunidades}
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
