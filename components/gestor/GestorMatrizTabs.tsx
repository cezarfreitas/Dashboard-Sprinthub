"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { GestorMatrizVendedores } from "./GestorMatrizVendedores"
import { FileText, TrendingUp, TrendingDown, FileDown } from "lucide-react"

interface VendedorInfo {
  id: number
  name: string
  lastName: string
}

interface GestorMatrizTabsProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
  vendedores: VendedorInfo[]
}

export function GestorMatrizTabs({
  unidadeId,
  dataInicio,
  dataFim,
  vendedores
}: GestorMatrizTabsProps) {
  const [activeTab, setActiveTab] = useState("criadas")
  const [exportando, setExportando] = useState(false)

  const handleExportar = useCallback(async () => {
    if (!unidadeId) return

    try {
      setExportando(true)
      
      const params = new URLSearchParams()
      params.append('unidade_id', unidadeId.toString())
      params.append('dataInicio', dataInicio)
      params.append('dataFim', dataFim)
      params.append('tipo', activeTab)
      
      const response = await fetch(`/api/oportunidades/exportar?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Erro ao exportar oportunidades')
      }

      const oportunidades = result.data
      
      if (oportunidades.length === 0) {
        alert('Nenhuma oportunidade encontrada para o período e tipo selecionados.')
        return
      }

      const escapeCsv = (value: string | number | null | undefined) => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (/[",\n]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const formatarData = (data: string | null) => {
        if (!data) return '-'
        const d = new Date(data)
        return d.toLocaleDateString('pt-BR')
      }

      const formatarValor = (valor: number) => {
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }

      const formatarStatus = (status: string) => {
        const statusMap: Record<string, string> = {
          'open': 'Aberta',
          'gain': 'Ganha',
          'lost': 'Perdida'
        }
        return statusMap[status] || status
      }

      const tipoLabel = 
        activeTab === 'ganhas' ? 'Ganhas' :
        activeTab === 'perdidas' ? 'Perdidas' :
        'Criadas'

      const csvHeaders = [
        'ID',
        'Título',
        'Valor',
        'Status',
        'Data Criação',
        'Data Ganho',
        'Data Perda',
        'Vendedor',
        'Unidade',
        'Coluna CRM',
        'Motivo Perda',
        'Motivo Ganho',
        'Canal Venda',
        'Campanha'
      ]

      const csvRows = oportunidades.map((opp: any) => [
        opp.id,
        escapeCsv(opp.title),
        formatarValor(opp.value || 0),
        formatarStatus(opp.status),
        formatarData(opp.createDate),
        formatarData(opp.gain_date),
        formatarData(opp.lost_date),
        escapeCsv(`${opp.vendedor_nome || ''} ${opp.vendedor_sobrenome || ''}`.trim()),
        escapeCsv(opp.unidade_nome || '-'),
        escapeCsv(opp.crm_column || '-'),
        escapeCsv(opp.loss_reason || '-'),
        escapeCsv(opp.gain_reason || '-'),
        escapeCsv(opp.sale_channel || '-'),
        escapeCsv(opp.campaign || '-')
      ])

      const csvContent = [
        csvHeaders.map(escapeCsv).join(','),
        ...csvRows.map((row: any[]) => row.join(','))
      ].join('\n')

      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const urlBlob = URL.createObjectURL(blob)
      
      const nomeArquivo = `oportunidades_${tipoLabel.toLowerCase()}_${dataInicio}_${dataFim}.csv`
      
      link.setAttribute('href', urlBlob)
      link.setAttribute('download', nomeArquivo)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(urlBlob)
      }, 100)

    } catch (error) {
      alert(`Erro ao exportar oportunidades: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setExportando(false)
    }
  }, [unidadeId, dataInicio, dataFim, activeTab])

  if (!unidadeId) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Matrizes de Oportunidades
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportar}
            disabled={exportando}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            {exportando ? 'Exportando...' : 'Exportar Excel'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9 p-1 mb-3">
            <TabsTrigger 
              value="criadas" 
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Criadas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ganhas" 
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Ganhas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="perdidas" 
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium"
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Perdidas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="criadas" className="mt-0">
            <GestorMatrizVendedores
              unidadeId={unidadeId}
              dataInicio={dataInicio}
              dataFim={dataFim}
              vendedores={vendedores}
              tipo="criadas"
            />
          </TabsContent>

          <TabsContent value="ganhas" className="mt-0">
            <GestorMatrizVendedores
              unidadeId={unidadeId}
              dataInicio={dataInicio}
              dataFim={dataFim}
              vendedores={vendedores}
              tipo="ganhas"
            />
          </TabsContent>

          <TabsContent value="perdidas" className="mt-0">
            <GestorMatrizVendedores
              unidadeId={unidadeId}
              dataInicio={dataInicio}
              dataFim={dataFim}
              vendedores={vendedores}
              tipo="perdidas"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

