import { Button } from '@/components/ui/button'
import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface ExportToExcelButtonProps {
  data: any[]
  filename: string
  sheetName?: string
  columns?: {
    key: string
    label: string
    format?: (value: any, item?: any) => string
  }[]
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  colorScheme?: 'emerald' | 'blue' | 'purple' | 'default'
}

export function ExportToExcelButton({
  data,
  filename,
  sheetName = 'Dados',
  columns,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  className = '',
  colorScheme = 'emerald'
}: ExportToExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Não há dados disponíveis para exportação',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsExporting(true)

      const XLSX = await import('xlsx')

      // Função para expandir campos JSON
      const expandJSONFields = (obj: any): any => {
        const expanded: any = {}
        
        for (const [key, value] of Object.entries(obj)) {
          // Se for um campo JSON (fields, dataLead, conf_installment, etc)
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
              const parsed = JSON.parse(value)
              if (typeof parsed === 'object' && parsed !== null) {
                if (Array.isArray(parsed)) {
                  // Se for array, adicionar como JSON string
                  expanded[key] = JSON.stringify(parsed)
                } else {
                  // Se for objeto, expandir cada propriedade
                  for (const [subKey, subValue] of Object.entries(parsed)) {
                    const prefixedKey = `${key}_${subKey}`
                    expanded[prefixedKey] = subValue === null || subValue === undefined 
                      ? '-' 
                      : typeof subValue === 'object' 
                        ? JSON.stringify(subValue)
                        : String(subValue)
                  }
                }
              } else {
                expanded[key] = value
              }
            } catch {
              expanded[key] = value
            }
          } else {
            expanded[key] = value
          }
        }
        
        return expanded
      }

      // Expandir todos os dados
      const expandedData = data.map(item => expandJSONFields(item))

      let headers: string[]
      let rows: any[][]

      if (columns) {
        headers = columns.map(col => col.label)
        
        rows = expandedData.map(item => 
          columns.map(col => {
            const value = item[col.key]
            if (col.format) {
              return col.format(value, item)
            }
            if (value === null || value === undefined) {
              return '-'
            }
            if (typeof value === 'object') {
              return JSON.stringify(value)
            }
            return String(value)
          })
        )
      } else {
        const firstItem = expandedData[0]
        headers = Object.keys(firstItem).map(key => 
          key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        )
        
        rows = expandedData.map(item => 
          Object.keys(firstItem).map(key => {
            const value = item[key]
            if (value === null || value === undefined) {
              return '-'
            }
            if (typeof value === 'object') {
              return JSON.stringify(value)
            }
            return String(value)
          })
        )
      }

      const excelData = [headers, ...rows]

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)

      const colWidths = headers.map((header, idx) => {
        const maxLength = Math.max(
          header.length,
          ...rows.map(row => {
            const cell = row[idx]
            return cell ? String(cell).length : 0
          })
        )
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
      })
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const link = document.createElement('a')
      const urlBlob = URL.createObjectURL(blob)

      const timestamp = new Date().toISOString().split('T')[0]
      const filenameWithTimestamp = filename.endsWith('.xlsx') 
        ? filename.replace('.xlsx', `_${timestamp}.xlsx`)
        : `${filename}_${timestamp}.xlsx`

      link.setAttribute('href', urlBlob)
      link.setAttribute('download', filenameWithTimestamp)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(urlBlob)

      toast({
        title: 'Excel exportado!',
        description: `${data.length} registro(s) exportado(s) com sucesso`,
      })
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Define cores baseado no colorScheme
  const colorClasses = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-700',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700',
    default: '' // Usa as cores padrão do variant
  }

  const disabledClasses = 'disabled:bg-gray-700 disabled:text-gray-400 disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || !data || data.length === 0}
      variant={variant}
      size={size}
      className={`${className} ${colorScheme !== 'default' ? colorClasses[colorScheme] : ''} ${disabledClasses}`}
    >
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      {isExporting ? 'Exportando...' : 'Exportar Excel'}
    </Button>
  )
}

