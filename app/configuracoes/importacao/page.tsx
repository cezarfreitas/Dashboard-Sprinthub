"use client"

import { useState, useCallback, useRef } from 'react'
import { FileSpreadsheet, Upload, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Trash2, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import * as XLSX from 'xlsx'

// Campos do sistema que podem ser mapeados
const SYSTEM_FIELDS = [
  { key: 'id', label: 'ID', required: false, type: 'text' },
  { key: 'createDate', label: 'Data de Criação', required: false, type: 'date' },
  { key: 'gain_date', label: 'Data de Ganho', required: false, type: 'date' },
  { key: 'lost_date', label: 'Data de Perda', required: false, type: 'date' },
  { key: 'title', label: 'Título', required: true, type: 'text' },
  { key: 'value', label: 'Valor', required: false, type: 'number' },
  { key: 'status', label: 'Status', required: false, type: 'select', options: ['open', 'won', 'lost'] },
  { key: 'user', label: 'Responsável', required: false, type: 'text' },
  { key: 'unidade', label: 'Unidade', required: false, type: 'text' },
  { key: 'loss_reason', label: 'Motivo de Perda', required: false, type: 'text' },
  { key: 'gain_reason', label: 'Motivo de Ganho', required: false, type: 'text' },
] as const

// Palavras-chave para mapeamento inteligente
const FIELD_KEYWORDS: Record<string, string[]> = {
  id: ['id', 'código', 'codigo', 'code', 'identificador', 'chave', 'key', 'id_oportunidade', 'oportunidade_id'],
  createDate: ['criação', 'criacao', 'created', 'data criação', 'data criacao', 'dt criação', 'dt criacao', 'data_criacao', 'createdate', 'created_at', 'data de criação', 'data de criacao', 'data de criação', 'data de criacao'],
  gain_date: ['ganho', 'data ganho', 'dt ganho', 'gain', 'won', 'data_ganho', 'gain_date', 'data de ganho', 'fechamento', 'data fechamento'],
  lost_date: ['perda', 'data perda', 'dt perda', 'lost', 'data_perda', 'lost_date', 'data de perda'],
  title: ['título', 'titulo', 'title', 'nome', 'name', 'oportunidade', 'opportunity', 'negócio', 'negocio', 'deal'],
  value: ['valor', 'value', 'preço', 'preco', 'price', 'amount', 'total', 'montante', 'receita'],
  status: ['status', 'situação', 'situacao', 'estado', 'state', 'stage', 'etapa', 'fase'],
  user: ['responsável', 'responsavel', 'user', 'usuario', 'usuário', 'vendedor', 'consultor', 'atendente', 'dono', 'owner', 'assigned', 'assignee'],
  unidade: ['unidade', 'filial', 'loja', 'branch', 'unit', 'departamento', 'setor', 'regional', 'escritório', 'escritorio'],
  loss_reason: ['motivo perda', 'motivo de perda', 'loss_reason', 'loss reason', 'razão perda', 'razao perda', 'porque perdeu', 'motivo_perda'],
  gain_reason: ['motivo ganho', 'motivo de ganho', 'gain_reason', 'gain reason', 'razão ganho', 'razao ganho', 'porque ganhou', 'motivo_ganho'],
}

interface ColumnMapping {
  excelColumn: string
  systemField: string | null
  sampleValues: string[]
}

interface ImportRow {
  [key: string]: any
  _rowIndex: number
  _valid: boolean
  _errors: string[]
}

interface ImportResult {
  success: number
  failed: number
  errors: { row: number; message: string }[]
}

interface ImportProgress {
  current: number
  total: number
  percent: number
}

export default function ImportacaoPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Dados do Excel
  const [excelColumns, setExcelColumns] = useState<string[]>([])
  const [excelData, setExcelData] = useState<any[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  
  // Dados validados para importação
  const [validatedData, setValidatedData] = useState<ImportRow[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0, percent: 0 })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Função para normalizar texto para comparação
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  }

  // Mapeamento inteligente de colunas
  const autoMapColumns = useCallback((columns: string[]): ColumnMapping[] => {
    return columns.map(col => {
      const normalizedCol = normalizeText(col)
      
      // Procurar correspondência nas palavras-chave
      let matchedField: string | null = null
      let bestMatchScore = 0
      
      for (const [fieldKey, keywords] of Object.entries(FIELD_KEYWORDS)) {
        for (const keyword of keywords) {
          const normalizedKeyword = normalizeText(keyword)
          
          // Verificar se a coluna contém a palavra-chave ou vice-versa
          if (normalizedCol.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedCol)) {
            const score = normalizedKeyword.length
            if (score > bestMatchScore) {
              bestMatchScore = score
              matchedField = fieldKey
            }
          }
          
          // Verificar correspondência exata
          if (normalizedCol === normalizedKeyword) {
            matchedField = fieldKey
            bestMatchScore = 999 // Prioridade máxima para correspondência exata
          }
        }
      }
      
      return {
        excelColumn: col,
        systemField: matchedField,
        sampleValues: []
      }
    })
  }, [])

  // Processar arquivo Excel
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validar extensão
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
    if (!validExtensions.includes(fileExtension)) {
      setError('Formato inválido. Use arquivos .xlsx, .xls ou .csv')
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setError('')
    setSuccess('')
    setImportResult(null)
    setValidatedData([])

    try {
      const data = await selectedFile.arrayBuffer()
      // Usar raw: false para tentar manter datas como strings quando possível
      const workbook = XLSX.read(data, { type: 'array', cellDates: false, cellNF: false })
      
      // Pegar primeira planilha
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Converter para JSON - tentar manter datas como strings
      // Primeiro tentar com raw: false para ver se mantém como string
      let jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        raw: false, 
        defval: '',
        dateNF: 'dd/mm/yyyy' // Formato de data esperado
      })
      
      // Função para converter datas para formato DD/MM/YYYY
      const convertToDDMMYYYY = (cell: any): any => {
        if (cell === null || cell === undefined || cell === '') return cell
        
        // Se for número e estiver no range de datas do Excel (36526 a 45658 para 2000-2025)
        if (typeof cell === 'number' && cell > 36500 && cell < 50000) {
          // Converter número serial do Excel para data DD/MM/YYYY
          const excelEpoch = new Date(1899, 11, 30)
          const date = new Date(excelEpoch.getTime() + (cell - 1) * 86400000)
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          }
        }
        
        // Se for string, verificar se é uma data no formato M/D/YY ou M/D/YYYY (americano)
        if (typeof cell === 'string') {
          const dateStr = cell.trim()
          // Padrão para M/D/YY ou M/D/YYYY ou MM/DD/YY ou MM/DD/YYYY
          const americanDatePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
          const match = dateStr.match(americanDatePattern)
          
          if (match) {
            const month = parseInt(match[1], 10)
            const day = parseInt(match[2], 10)
            let year = parseInt(match[3], 10)
            
            // Se o ano tem apenas 2 dígitos, converter para 4 dígitos
            if (year < 100) {
              year = year <= 50 ? 2000 + year : 1900 + year
            }
            
            // Validar se é uma data válida (mês entre 1-12, dia entre 1-31)
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
              // Verificar se é formato americano (primeiro número <= 12 e segundo > 12) ou se ambos são <= 12
              // Se o primeiro número é <= 12 e o segundo é > 12, é formato americano
              // Se ambos são <= 12, assumir formato americano (M/D)
              if (month <= 12 && day <= 31) {
                // Converter para formato brasileiro DD/MM/YYYY
                const dayStr = String(day).padStart(2, '0')
                const monthStr = String(month).padStart(2, '0')
                return `${dayStr}/${monthStr}/${year}`
              }
            }
          }
        }
        
        return cell
      }
      
      // Processar todas as células e converter datas para DD/MM/YYYY
      jsonData = jsonData.map((row: any) => {
        return row.map((cell: any) => convertToDDMMYYYY(cell))
      })
      
      if (jsonData.length < 2) {
        setError('A planilha deve ter pelo menos um cabeçalho e uma linha de dados')
        setLoading(false)
        return
      }

      // Primeira linha são os cabeçalhos
      const headers = (jsonData[0] as string[]).map(h => String(h || '').trim()).filter(h => h)
      const rows = jsonData.slice(1) as any[][]

      // Converter para objetos
      const dataObjects = rows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map(row => {
          const obj: Record<string, any> = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] ?? ''
          })
          return obj
        })

      setExcelColumns(headers)
      setExcelData(dataObjects)

      // Auto-mapear colunas
      const mappings = autoMapColumns(headers)
      
      // Adicionar valores de amostra
      mappings.forEach(mapping => {
        mapping.sampleValues = dataObjects
          .slice(0, 3)
          .map(row => String(row[mapping.excelColumn] || ''))
          .filter(v => v)
      })

      setColumnMappings(mappings)
      setSuccess(`Arquivo carregado: ${dataObjects.length} linhas encontradas`)
    } catch (err) {
      setError('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.')
    } finally {
      setLoading(false)
    }
  }

  // Atualizar mapeamento de coluna
  const updateMapping = (excelColumn: string, systemField: string | null) => {
    setColumnMappings(prev => 
      prev.map(m => 
        m.excelColumn === excelColumn 
          ? { ...m, systemField: systemField === 'none' ? null : systemField }
          : m
      )
    )
  }

  // Validar dados antes de importar
  const validateData = useCallback(() => {
    const validated: ImportRow[] = excelData.map((row, index) => {
      const errors: string[] = []
      const mappedRow: ImportRow = { _rowIndex: index + 2, _valid: true, _errors: [] }

      // Mapear valores
      columnMappings.forEach(mapping => {
        if (mapping.systemField) {
          let value = row[mapping.excelColumn]
          
          // Converter tipos
          const fieldDef = SYSTEM_FIELDS.find(f => f.key === mapping.systemField)
          if (fieldDef) {
            if (fieldDef.type === 'date' && value) {
              // Tentar converter para data
              const date = new Date(value)
              if (!isNaN(date.getTime())) {
                value = date.toISOString()
              } else {
                // Tentar formato brasileiro dd/mm/yyyy
                const parts = String(value).split('/')
                if (parts.length === 3) {
                  const brDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                  if (!isNaN(brDate.getTime())) {
                    value = brDate.toISOString()
                  }
                }
              }
            } else if (fieldDef.type === 'number' && value) {
              // Converter para número
              const numValue = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'))
              value = isNaN(numValue) ? 0 : numValue
            }
          }
          
          mappedRow[mapping.systemField] = value
        }
      })

      // Validar campos obrigatórios
      const titleField = SYSTEM_FIELDS.find(f => f.key === 'title')
      if (titleField?.required && !mappedRow.title) {
        errors.push('Título é obrigatório')
      }

      // Determinar status baseado nas datas
      if (!mappedRow.status) {
        if (mappedRow.gain_date) {
          mappedRow.status = 'won'
        } else if (mappedRow.lost_date) {
          mappedRow.status = 'lost'
        } else {
          mappedRow.status = 'open'
        }
      }

      mappedRow._valid = errors.length === 0
      mappedRow._errors = errors
      
      return mappedRow
    })

    setValidatedData(validated)
    return validated
  }, [excelData, columnMappings])

  // Importar dados em lotes
  const handleImport = async () => {
    const dataToImport = validateData()
    const validRows = dataToImport.filter(r => r._valid)
    
    if (validRows.length === 0) {
      setError('Nenhuma linha válida para importar')
      return
    }

    setImporting(true)
    setError('')
    setImportProgress({ current: 0, total: validRows.length, percent: 0 })

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    // Tamanho do lote para processamento
    const BATCH_SIZE = 300
    const totalBatches = Math.ceil(validRows.length / BATCH_SIZE)
    
    try {
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, validRows.length)
        const batch = validRows.slice(start, end)
        
        // Atualizar progresso
        const progressPercent = Math.round((start / validRows.length) * 100)
        setImportProgress({ current: start, total: validRows.length, percent: progressPercent })

        try {
          const response = await fetch('/api/oportunidades/importar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              oportunidades: batch.map(({ _rowIndex, _valid, _errors, ...data }) => data)
            })
          })

          const responseData = await response.json()

          if (responseData.success) {
            result.success += responseData.imported || 0
            result.failed += responseData.failed || 0
            if (responseData.errors) {
              // Ajustar índice das linhas para o contexto global
              const adjustedErrors = responseData.errors.map((err: { row: number; message: string }) => ({
                row: start + err.row,
                message: err.message
              }))
              result.errors.push(...adjustedErrors)
            }
          } else {
            // Se o lote falhou completamente
            result.failed += batch.length
            result.errors.push({
              row: start + 1,
              message: `Lote ${batchIndex + 1} falhou: ${responseData.message || 'Erro desconhecido'}`
            })
          }
        } catch (batchErr) {
          // Erro de conexão no lote
          result.failed += batch.length
          result.errors.push({
            row: start + 1,
            message: `Erro de conexão no lote ${batchIndex + 1}`
          })
        }

        // Pequena pausa entre lotes para não sobrecarregar o servidor
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Finalizar
      setImportProgress({ current: validRows.length, total: validRows.length, percent: 100 })
      
      if (result.success > 0) {
        setSuccess(`Importação concluída! ${result.success} oportunidades importadas${result.failed > 0 ? `, ${result.failed} falharam` : ''}.`)
        
        // Limpar dados após sucesso total
        if (result.failed === 0) {
          setTimeout(() => {
            setFile(null)
            setExcelColumns([])
            setExcelData([])
            setColumnMappings([])
            setValidatedData([])
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }, 3000)
        }
      } else {
        setError('Nenhuma oportunidade foi importada. Verifique os erros.')
      }
    } catch (err) {
      setError('Erro geral ao importar')
    } finally {
      setImporting(false)
      setImportResult(result)
    }
  }

  // Limpar tudo
  const handleClear = () => {
    setFile(null)
    setExcelColumns([])
    setExcelData([])
    setColumnMappings([])
    setValidatedData([])
    setImportResult(null)
    setError('')
    setSuccess('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Download modelo
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'ID': '',
        'Data de Criação': '01/01/2024',
        'Título': 'Exemplo de Oportunidade',
        'Valor': '10000',
        'Status': 'open',
        'Responsável': 'joao.silva',
        'Unidade': 'Matriz',
        'Data de Ganho': '',
        'Data de Perda': '',
        'Motivo de Perda': '',
        'Motivo de Ganho': ''
      },
      {
        'ID': '20240115123456',
        'Data de Criação': '15/01/2024',
        'Título': 'Oportunidade Ganha',
        'Valor': '25000',
        'Status': 'won',
        'Responsável': 'maria.santos',
        'Unidade': 'Filial SP',
        'Data de Ganho': '20/01/2024',
        'Data de Perda': '',
        'Motivo de Perda': '',
        'Motivo de Ganho': 'Melhor preço'
      },
      {
        'ID': '',
        'Data de Criação': '10/01/2024',
        'Título': 'Oportunidade Perdida',
        'Valor': '15000',
        'Status': 'lost',
        'Responsável': 'pedro.oliveira',
        'Unidade': 'Filial RJ',
        'Data de Ganho': '',
        'Data de Perda': '25/01/2024',
        'Motivo de Perda': 'Preço alto',
        'Motivo de Ganho': ''
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Oportunidades')
    XLSX.writeFile(wb, 'modelo_importacao_oportunidades.xlsx')
  }

  const validCount = validatedData.filter(r => r._valid).length
  const invalidCount = validatedData.filter(r => !r._valid).length
  const mappedFieldsCount = columnMappings.filter(m => m.systemField).length

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Importação de Oportunidades</h1>
            <p className="text-muted-foreground">
              Importe oportunidades de uma planilha Excel com mapeamento inteligente
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Baixar Modelo
        </Button>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload de arquivo */}
      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar Arquivo</CardTitle>
          <CardDescription>
            Envie uma planilha Excel (.xlsx, .xls) ou CSV com os dados das oportunidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Arquivo
                  </>
                )}
              </Button>
              {file && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{file.name}</Badge>
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              O sistema irá identificar automaticamente as colunas da planilha e sugerir o mapeamento correto.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mapeamento de colunas */}
      {excelColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>2. Mapeamento de Colunas</span>
              <Badge variant={mappedFieldsCount > 0 ? "default" : "secondary"}>
                {mappedFieldsCount} de {excelColumns.length} mapeadas
              </Badge>
            </CardTitle>
            <CardDescription>
              Verifique e ajuste o mapeamento automático das colunas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {columnMappings.map((mapping) => (
                <div key={mapping.excelColumn} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <Label className="font-medium">{mapping.excelColumn}</Label>
                    {mapping.sampleValues.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        Ex: {mapping.sampleValues.join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  
                  <div className="w-48 flex-shrink-0">
                    <Select
                      value={mapping.systemField || 'none'}
                      onValueChange={(value) => updateMapping(mapping.excelColumn, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Não mapear" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não mapear</SelectItem>
                        {SYSTEM_FIELDS.map(field => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label} {field.required && '*'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {mapping.systemField && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview e Validação */}
      {excelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>3. Preview e Validação</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={validateData}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Validar Dados
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Visualize os dados que serão importados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">
                  Preview ({excelData.length} linhas)
                </TabsTrigger>
                {validatedData.length > 0 && (
                  <>
                    <TabsTrigger value="valid" className="text-green-600">
                      Válidas ({validCount})
                    </TabsTrigger>
                    {invalidCount > 0 && (
                      <TabsTrigger value="invalid" className="text-red-600">
                        Inválidas ({invalidCount})
                      </TabsTrigger>
                    )}
                  </>
                )}
              </TabsList>
              
              <TabsContent value="preview" className="mt-4">
                <div className="rounded-md border overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {columnMappings.filter(m => m.systemField).map(m => (
                          <TableHead key={m.excelColumn}>
                            {SYSTEM_FIELDS.find(f => f.key === m.systemField)?.label || m.systemField}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {excelData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{idx + 2}</TableCell>
                          {columnMappings.filter(m => m.systemField).map(m => (
                            <TableCell key={m.excelColumn} className="max-w-48 truncate">
                              {String(row[m.excelColumn] || '-')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {excelData.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Mostrando 10 de {excelData.length} linhas
                  </p>
                )}
              </TabsContent>

              <TabsContent value="valid" className="mt-4">
                <div className="rounded-md border overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Linha</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Criação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validatedData.filter(r => r._valid).slice(0, 20).map((row) => (
                        <TableRow key={row._rowIndex}>
                          <TableCell className="font-mono text-xs">{row._rowIndex}</TableCell>
                          <TableCell className="max-w-48 truncate">{row.title || '-'}</TableCell>
                          <TableCell>
                            {row.value ? `R$ ${Number(row.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'won' ? 'default' : row.status === 'lost' ? 'destructive' : 'secondary'}>
                              {row.status === 'won' ? 'Ganho' : row.status === 'lost' ? 'Perdido' : 'Aberto'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.createDate ? new Date(row.createDate).toLocaleDateString('pt-BR') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {invalidCount > 0 && (
                <TabsContent value="invalid" className="mt-4">
                  <div className="rounded-md border overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Linha</TableHead>
                          <TableHead>Dados</TableHead>
                          <TableHead>Erros</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validatedData.filter(r => !r._valid).map((row) => (
                          <TableRow key={row._rowIndex} className="bg-red-50 dark:bg-red-950/20">
                            <TableCell className="font-mono text-xs">{row._rowIndex}</TableCell>
                            <TableCell className="max-w-48 truncate">{row.title || '(sem título)'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row._errors.map((err, i) => (
                                  <Badge key={i} variant="destructive" className="text-xs">
                                    {err}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Botão de importação */}
      {validatedData.length > 0 && validCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>4. Importar</CardTitle>
            <CardDescription>
              Confirme a importação das oportunidades válidas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {importing && (
              <div className="space-y-2">
                <Progress value={importProgress.percent} />
                <p className="text-sm text-muted-foreground text-center">
                  Importando... {importProgress.current.toLocaleString('pt-BR')} de {importProgress.total.toLocaleString('pt-BR')} oportunidades ({importProgress.percent}%)
                </p>
              </div>
            )}

            {importResult && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{importResult.success} importadas</span>
                </div>
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">{importResult.failed} falharam</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {validCount} oportunidades serão importadas
                {invalidCount > 0 && (
                  <span className="text-orange-500 ml-2">
                    ({invalidCount} serão ignoradas por erros)
                  </span>
                )}
              </div>
              <Button 
                onClick={handleImport} 
                disabled={importing || validCount === 0}
                size="lg"
              >
                {importing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar {validCount} Oportunidades
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre o formato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campos disponíveis */}
          <div>
            <h4 className="font-semibold mb-3">Campos Disponíveis para Importação:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">ID</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Identificador único. Se não informado, será gerado automaticamente (YYYYMMDD + código)
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Título</span>
                  <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nome/título da oportunidade
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Valor</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor monetário (aceita vírgula ou ponto como decimal). Ex: 10000 ou 10.000,00
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Status</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valores aceitos: <code>open</code> (aberta), <code>won</code> (ganha), <code>lost</code> (perdida)
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Data de Criação</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Data de criação da oportunidade. Formato: DD/MM/YYYY ou YYYY-MM-DD
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Data de Ganho</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Data em que a oportunidade foi ganha. Formato: DD/MM/YYYY ou YYYY-MM-DD
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Data de Perda</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Data em que a oportunidade foi perdida. Formato: DD/MM/YYYY ou YYYY-MM-DD
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Responsável</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Username (user) do vendedor/consultor responsável pela oportunidade. O sistema buscará automaticamente o vendedor pelo username.
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Unidade</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nome da unidade/filial da oportunidade
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Motivo de Perda</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Texto descrevendo o motivo da perda (usado quando status = lost)
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Motivo de Ganho</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Texto descrevendo o motivo do ganho (usado quando status = won)
                </p>
              </div>
            </div>
          </div>

          {/* Regras gerais */}
          <div>
            <h4 className="font-semibold mb-3">Regras de Importação:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• O sistema identifica automaticamente as colunas baseado nos nomes - você pode ajustar manualmente se necessário</li>
              <li>• Se o <strong>Status</strong> não for informado, será determinado automaticamente pelas datas de ganho/perda</li>
              <li>• Se nenhuma data de ganho ou perda for informada, o status será <code>open</code> (aberta)</li>
              <li>• Formatos de arquivo aceitos: <strong>.xlsx</strong>, <strong>.xls</strong> e <strong>.csv</strong></li>
              <li>• <strong>Sem limite de quantidade</strong> - processamento em lotes de 100 oportunidades por vez</li>
              <li>• Baixe o modelo para ver um exemplo de planilha formatada corretamente</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

