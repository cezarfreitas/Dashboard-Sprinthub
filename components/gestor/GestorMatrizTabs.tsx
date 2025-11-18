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

      const formatarData = (data: string | null) => {
        if (!data) return '-'
        const d = new Date(data)
        return d.toLocaleDateString('pt-BR')
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

      // Processar campos JSON (fields e dataLead) para extrair todas as chaves
      const allFieldsKeys = new Set<string>()
      const allDataLeadKeys = new Set<string>()
      
      oportunidades.forEach((opp: any) => {
        // Processar fields
        if (opp.fields) {
          try {
            const fields = typeof opp.fields === 'string' ? JSON.parse(opp.fields) : opp.fields
            if (fields && typeof fields === 'object') {
              Object.keys(fields).forEach(key => allFieldsKeys.add(key))
            }
          } catch (e) {
            // Ignorar erro ao parsear
          }
        }
        
        // Processar dataLead
        if (opp.dataLead) {
          try {
            const dataLead = typeof opp.dataLead === 'string' ? JSON.parse(opp.dataLead) : opp.dataLead
            if (dataLead && typeof dataLead === 'object') {
              Object.keys(dataLead).forEach(key => allDataLeadKeys.add(key))
            }
          } catch (e) {
            // Ignorar erro ao parsear
          }
        }
      })

      const excelHeaders = [
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

      // Adicionar headers dos campos fields (com prefixo "Fields - ")
      Array.from(allFieldsKeys).sort().forEach(key => {
        excelHeaders.push(`Fields - ${key}`)
      })

      // Adicionar headers dos campos dataLead (com prefixo "DataLead - ")
      Array.from(allDataLeadKeys).sort().forEach(key => {
        excelHeaders.push(`DataLead - ${key}`)
      })

      // Converter Sets para Arrays ordenados para manter consistência
      const fieldsKeysArray = Array.from(allFieldsKeys).sort()
      const dataLeadKeysArray = Array.from(allDataLeadKeys).sort()

      const excelRows = oportunidades.map((opp: any) => {
        // Parsear fields
        let fieldsObj: any = {}
        if (opp.fields) {
          try {
            fieldsObj = typeof opp.fields === 'string' ? JSON.parse(opp.fields) : opp.fields
            if (!fieldsObj || typeof fieldsObj !== 'object') {
              fieldsObj = {}
            }
          } catch (e) {
            fieldsObj = {}
          }
        }

        // Parsear dataLead
        let dataLeadObj: any = {}
        if (opp.dataLead) {
          try {
            dataLeadObj = typeof opp.dataLead === 'string' ? JSON.parse(opp.dataLead) : opp.dataLead
            if (!dataLeadObj || typeof dataLeadObj !== 'object') {
              dataLeadObj = {}
            }
          } catch (e) {
            dataLeadObj = {}
          }
        }

        // Criar linha base
        const row: any[] = [
          opp.id,
          opp.title || '-',
          opp.value || 0, // Valor numérico para Excel
          formatarStatus(opp.status),
          formatarData(opp.createDate),
          formatarData(opp.gain_date),
          formatarData(opp.lost_date),
          `${opp.vendedor_nome || ''} ${opp.vendedor_sobrenome || ''}`.trim() || '-',
          opp.unidade_nome || '-',
          opp.crm_column || '-',
          opp.loss_reason || '-',
          opp.gain_reason || '-',
          opp.sale_channel || '-',
          opp.campaign || '-'
        ]

        // Adicionar valores dos campos fields
        fieldsKeysArray.forEach(key => {
          const value = fieldsObj[key]
          if (value === null || value === undefined) {
            row.push('-')
          } else if (typeof value === 'object') {
            row.push(JSON.stringify(value))
          } else {
            row.push(String(value))
          }
        })

        // Adicionar valores dos campos dataLead
        dataLeadKeysArray.forEach(key => {
          const value = dataLeadObj[key]
          if (value === null || value === undefined) {
            row.push('-')
          } else if (typeof value === 'object') {
            row.push(JSON.stringify(value))
          } else {
            row.push(String(value))
          }
        })

        return row
      })

      // Importar xlsx dinamicamente (client-side)
      const XLSX = await import('xlsx')
      
      // Preparar dados para Excel (headers + rows)
      const excelData = [
        excelHeaders,
        ...excelRows
      ]

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      
      // Ajustar largura das colunas
      const colWidths = excelHeaders.map((header: string, idx: number) => {
        const maxLength = Math.max(
          header.length,
          ...excelData.slice(1).map((row: any[]) => {
            const cell = row[idx]
            return cell ? String(cell).length : 0
          })
        )
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
      })
      ws['!cols'] = colWidths
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Oportunidades')
      
      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const link = document.createElement('a')
      const urlBlob = URL.createObjectURL(blob)
      
      const nomeArquivo = `oportunidades_${tipoLabel.toLowerCase()}_${dataInicio}_${dataFim}.xlsx`
      
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 bg-purple-600 rounded-full" />
            <div>
              <CardTitle className="text-base font-bold text-gray-900">
                Matrizes de Oportunidades
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Visualização detalhada por vendedor e status
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportar}
            disabled={exportando}
            className="gap-2 h-8 px-3 text-xs font-medium hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
          >
            <FileDown className="h-3.5 w-3.5" />
            {exportando ? 'Exportando...' : 'Exportar Excel'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9 p-1 mb-3 bg-gray-100/50">
            <TabsTrigger 
              value="criadas" 
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 hover:bg-blue-50 data-[state=inactive]:text-gray-600"
            >
              <FileText className="h-4 w-4" />
              <span>Criadas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ganhas" 
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 hover:bg-green-50 data-[state=inactive]:text-gray-600"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Ganhas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="perdidas" 
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 hover:bg-red-50 data-[state=inactive]:text-gray-600"
            >
              <TrendingDown className="h-4 w-4" />
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

