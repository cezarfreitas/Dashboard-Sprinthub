'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Target, TrendingUp } from 'lucide-react'
import { useMetasConfig } from '@/hooks/metas/useMetasConfig'
import { MetasFilters } from '@/components/metas/MetasFilters'
import { MetasStats } from '@/components/metas/MetasStats'
import { MetasMatrixUnidade } from '@/components/metas/MetasMatrixUnidade'
import { MetasMatrixGeral } from '@/components/metas/MetasMatrixGeral'
import { MetasExportImport } from '@/components/metas/MetasExportImport'

export default function MetasConfigPage() {
  const {
    metas,
    vendedores,
    unidades,
    loading,
    error,
    selectedAno,
    visualizacao,
    editingCell,
    editValue,
    setSelectedAno,
    setVisualizacao,
    fetchData,
    startInlineEdit,
    saveInlineEdit,
    cancelInlineEdit,
    setEditValue,
    getMetaValue
  } = useMetasConfig()

  if (loading) {
    return (
      <div className="w-full p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <span>Carregando dados...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">❌ Erro: {error}</p>
            <Button onClick={fetchData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
            <Target className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3 text-primary" />
            <span className="truncate">Configuração de Metas</span>
          </h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            Defina metas mensais para vendedores por unidade
          </p>
        </div>
        
        <MetasExportImport 
          selectedAno={selectedAno}
          loading={loading}
          onDataRefresh={fetchData}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Estatísticas - Período:
            </CardTitle>
            
            <MetasFilters
              selectedAno={selectedAno}
              visualizacao={visualizacao}
              onAnoChange={setSelectedAno}
              onVisualizacaoChange={setVisualizacao}
            />
          </div>
        </CardHeader>
        <CardContent>
          <MetasStats 
            metas={metas}
            vendedores={vendedores}
            unidades={unidades}
          />
        </CardContent>
      </Card>

      {visualizacao === 'geral' && (
        <MetasMatrixGeral
          vendedores={vendedores}
          selectedAno={selectedAno}
          getMetaValue={getMetaValue}
          editingCell={editingCell}
          editValue={editValue}
          startInlineEdit={startInlineEdit}
          saveInlineEdit={saveInlineEdit}
          cancelInlineEdit={cancelInlineEdit}
          setEditValue={setEditValue}
        />
      )}

      {visualizacao === 'unidade' && (
        <MetasMatrixUnidade
          vendedores={vendedores}
          selectedAno={selectedAno}
          getMetaValue={getMetaValue}
          editingCell={editingCell}
          editValue={editValue}
          startInlineEdit={startInlineEdit}
          saveInlineEdit={saveInlineEdit}
          cancelInlineEdit={cancelInlineEdit}
          setEditValue={setEditValue}
        />
      )}
    </div>
  )
}
