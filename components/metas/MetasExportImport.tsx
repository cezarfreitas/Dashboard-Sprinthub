'use client'

import { memo, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Upload, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MetasExportImportProps {
  selectedAno: number
  loading: boolean
  onDataRefresh: () => Promise<void>
}

export const MetasExportImport = memo(function MetasExportImport({
  selectedAno,
  loading,
  onDataRefresh
}: MetasExportImportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  
  const { toast } = useToast()

  const handleExportExcel = useCallback(async () => {
    try {
      setIsExporting(true)
      
      const response = await fetch(`/api/metas/export-excel?ano=${selectedAno}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao exportar Excel')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `matriz-metas-${selectedAno}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Excel exportado!",
        description: `Matriz de metas ${selectedAno} exportada com sucesso`,
      })
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }, [selectedAno, toast])

  const handleImportExcel = useCallback(async () => {
    if (!importFile) {
      toast({
        title: "Arquivo não selecionado",
        description: "Selecione um arquivo Excel para importar",
        variant: "destructive"
      })
      return
    }

    try {
      setIsImporting(true)
      
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('ano', selectedAno.toString())

      const response = await fetch('/api/metas/import-excel', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao importar Excel')
      }

      const totalProcessadas = data.stats.metas_inseridas + data.stats.metas_atualizadas
      toast({
        title: "Excel importado!",
        description: `${totalProcessadas} metas processadas (${data.stats.metas_inseridas} inseridas, ${data.stats.metas_atualizadas} atualizadas)`,
      })

      await onDataRefresh()
      setImportFile(null)
    } catch (error) {
      toast({
        title: "Erro ao importar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }, [importFile, selectedAno, toast, onDataRefresh])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }, [])

  return (
    <div className="flex items-center space-x-2 flex-shrink-0">
      <Button 
        onClick={handleExportExcel} 
        variant="outline" 
        size="sm" 
        disabled={isExporting || loading}
        className="text-green-600 border-green-200 hover:bg-green-50"
      >
        <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
        <span className="hidden sm:inline">Exportar Excel</span>
      </Button>
      
      <div className="relative">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="import-file"
        />
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isImporting || loading}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          asChild
        >
          <label htmlFor="import-file" className="cursor-pointer">
            <Upload className={`h-4 w-4 mr-2 ${isImporting ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Importar Excel</span>
          </label>
        </Button>
      </div>
      
      {importFile && (
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-600 truncate max-w-32">
            {importFile.name}
          </span>
          <Button 
            onClick={handleImportExcel} 
            size="sm" 
            disabled={isImporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isImporting ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Importando...
              </>
            ) : (
              'Importar'
            )}
          </Button>
        </div>
      )}
    </div>
  )
})

