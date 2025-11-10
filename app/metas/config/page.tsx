'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Calendar,
  Building2,
  Users,
  RefreshCw,
  Target,
  TrendingUp,
  Plus,
  DollarSign,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react'

// Tipos
interface MetaMensal {
  id: number
  vendedor_id: number
  unidade_id: number
  mes: number
  ano: number
  meta_valor: number
  meta_descricao?: string
  status: string
  vendedor_nome: string
  vendedor_lastName: string
  vendedor_username: string
  unidade_nome: string
}

interface Vendedor {
  id: number
  name: string
  lastName: string
  username: string
  unidade_id: number
  unidade_nome: string
}

interface Unidade {
  id: number
  nome: string
}

export default function MetasConfigPage() {
  // Estados principais
  const [metas, setMetas] = useState<MetaMensal[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Estados para controle de período
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear()) // Ano atual
  
  // Estado para controlar visualização
  const [visualizacao, setVisualizacao] = useState<'unidade' | 'geral'>('unidade')
  
  // Estados para edição inline
  const [editingCell, setEditingCell] = useState<{
    vendedorId: number, 
    mesIndex: number, 
    unidadeId?: number
  } | null>(null)
  const [editValue, setEditValue] = useState('')
  
  
  // Estados para import/export
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)

  const { toast } = useToast()

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    if (!value || isNaN(value)) {
      return 'R$ 0,00'
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Função para buscar dados
  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      console.log('🔍 Buscando dados...')
      
      const response = await fetch(`/api/metas?ano=${selectedAno}`)
      const data = await response.json()
      
      console.log('📊 Dados recebidos:', data)
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar dados')
      }
      
      setMetas(data.metas || [])
      setVendedores(data.vendedores || [])
      setUnidades(data.unidades || [])
      
      console.log('✅ Dados carregados:', {
        metas: data.metas?.length || 0,
        vendedores: data.vendedores?.length || 0,
        unidades: data.unidades?.length || 0,
        totalMetas: data.metas?.reduce((sum: number, meta: any) => sum + parseFloat(meta.meta_valor.toString()), 0) || 0
      })
      
      
    } catch (err) {
      console.error('❌ Erro ao buscar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Função para iniciar edição inline
  const startInlineEdit = (vendedorId: number, mesIndex: number, unidadeId?: number) => {
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const mesNumero = meses[mesIndex]
    const vendedor = vendedores.find(v => v.id === vendedorId)
    const targetUnidadeId = unidadeId || vendedor?.unidade_id || 1
    
    // Buscar meta existente
    const metaExistente = metas.find(m => 
      m.vendedor_id === vendedorId && 
      m.mes === mesNumero &&
      m.unidade_id === targetUnidadeId &&
      m.ano === selectedAno &&
      m.status === 'ativa'
    )
    
    const currentValue = metaExistente ? parseFloat(metaExistente.meta_valor.toString()) : 0
    
    setEditingCell({ vendedorId, mesIndex, unidadeId: targetUnidadeId })
    setEditValue(currentValue === 0 ? '' : currentValue.toString())
  }

  // Função para salvar edição inline
  const saveInlineEdit = async () => {
    if (!editingCell) return
    
    if (!editValue || editValue.trim() === '') {
      cancelInlineEdit()
      return
    }

    const newValue = parseFloat(editValue)
    if (isNaN(newValue) || newValue < 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido",
        variant: "destructive"
      })
      return
    }
    
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const mesNumero = meses[editingCell.mesIndex]
    const unidadeId = editingCell.unidadeId || vendedores.find(v => v.id === editingCell.vendedorId)?.unidade_id || 1
    
    // Verificar se é nova meta ou atualização
    const metaExistente = metas.find(m => 
      m.vendedor_id === editingCell.vendedorId && 
      m.mes === mesNumero &&
      m.unidade_id === unidadeId &&
      m.ano === selectedAno &&
      m.status === 'ativa'
    )
    
    const isNewMeta = !metaExistente
    
    try {
      if (isNewMeta) {
        // Criar nova meta
        const response = await fetch('/api/metas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendedor_id: editingCell.vendedorId,
            unidade_id: unidadeId,
            mes: mesNumero,
            ano: selectedAno,
            meta_valor: newValue,
            meta_descricao: null
          })
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Erro ao criar meta')
        
        toast({ title: "Meta criada!", description: `Meta de ${formatCurrency(newValue)} criada` })
      } else {
        // Atualizar meta existente
        const response = await fetch('/api/metas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: metaExistente.id,
            meta_valor: newValue,
            meta_descricao: metaExistente.meta_descricao
          })
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Erro ao atualizar meta')
        
        toast({ title: "Meta atualizada!", description: `Meta atualizada para ${formatCurrency(newValue)}` })
      }

      // Atualizar estado local em vez de recarregar
      if (isNewMeta) {
        // Adicionar nova meta ao estado
        const vendedor = vendedores.find(v => v.id === editingCell.vendedorId)
        const unidade = unidades.find(u => u.id === unidadeId)
        
        if (vendedor && unidade) {
          const novaMeta: MetaMensal = {
            id: Date.now(), // ID temporário
            vendedor_id: editingCell.vendedorId,
            unidade_id: unidadeId,
            mes: mesNumero,
            ano: selectedAno,
            meta_valor: newValue,
            meta_descricao: undefined,
            status: 'ativa',
            vendedor_nome: vendedor.name,
            vendedor_lastName: vendedor.lastName,
            vendedor_username: vendedor.username,
            unidade_nome: unidade.nome
          }
          setMetas(prev => [...prev, novaMeta])
        }
      } else {
        // Atualizar meta existente no estado
        setMetas(prev => prev.map(meta => 
          meta.id === metaExistente.id 
            ? { ...meta, meta_valor: newValue }
            : meta
        ))
      }
      
    } catch (error) {
      console.error('Erro ao salvar meta:', error)
      toast({
        title: "Erro ao salvar meta",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    }
    
    setEditingCell(null)
    setEditValue('')
  }

  // Função para cancelar edição
  const cancelInlineEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Função para obter valor da meta
  const getMetaValue = (vendedorId: number, mesIndex: number, unidadeId?: number) => {
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const mesNumero = meses[mesIndex]
    const targetUnidadeId = unidadeId || vendedores.find(v => v.id === vendedorId)?.unidade_id || 1
    
    const meta = metas.find(m => 
      m.vendedor_id === vendedorId && 
      m.mes === mesNumero &&
      m.unidade_id === targetUnidadeId &&
      m.ano === selectedAno &&
      m.status === 'ativa'
    )
    
    const valor = meta ? parseFloat(meta.meta_valor.toString()) : 0
    
    
    return valor
  }


  // Função para gerar matriz geral
  const generateMatrizGeral = () => {
    const meses = [
      { numero: 1, nome: 'Jan' }, { numero: 2, nome: 'Fev' }, { numero: 3, nome: 'Mar' },
      { numero: 4, nome: 'Abr' }, { numero: 5, nome: 'Mai' }, { numero: 6, nome: 'Jun' },
      { numero: 7, nome: 'Jul' }, { numero: 8, nome: 'Ago' }, { numero: 9, nome: 'Set' },
      { numero: 10, nome: 'Out' }, { numero: 11, nome: 'Nov' }, { numero: 12, nome: 'Dez' }
    ]
    
    return { matrizVendedores: vendedores, meses }
  }

  // Função para gerar matriz por unidade (agrupada)
  const generateMatrizUnidade = () => {
    const meses = [
      { numero: 1, nome: 'Jan' }, { numero: 2, nome: 'Fev' }, { numero: 3, nome: 'Mar' },
      { numero: 4, nome: 'Abr' }, { numero: 5, nome: 'Mai' }, { numero: 6, nome: 'Jun' },
      { numero: 7, nome: 'Jul' }, { numero: 8, nome: 'Ago' }, { numero: 9, nome: 'Set' },
      { numero: 10, nome: 'Out' }, { numero: 11, nome: 'Nov' }, { numero: 12, nome: 'Dez' }
    ]
    
    // Agrupar vendedores por unidade
    const vendedoresPorUnidade = vendedores.reduce((acc, vendedor) => {
      const unidadeNome = vendedor.unidade_nome
      if (!acc[unidadeNome]) {
        acc[unidadeNome] = []
      }
      acc[unidadeNome].push(vendedor)
      return acc
    }, {} as Record<string, Vendedor[]>)
    
    return { vendedoresPorUnidade, meses }
  }

  // Função para exportar Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      
      const response = await fetch(`/api/metas/export-excel?ano=${selectedAno}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao exportar Excel')
      }

      // Criar blob e fazer download
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
      console.error('Erro ao exportar Excel:', error)
      toast({
        title: "Erro ao exportar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Função para importar Excel
  const handleImportExcel = async () => {
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

      // Recarregar dados
      await fetchData()
      setImportFile(null)

    } catch (error) {
      console.error('Erro ao importar Excel:', error)
      toast({
        title: "Erro ao importar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Função para lidar com seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  // Carregar dados ao montar componente
  useEffect(() => {
    fetchData()
  }, [selectedAno])

  // Renderizar célula da matriz
  const renderCell = (vendedor: Vendedor, mesIndex: number, unidadeId?: number) => {
    const targetUnidadeId = unidadeId || vendedor.unidade_id
    
    const isEditing = editingCell?.vendedorId === vendedor.id && 
                     editingCell?.mesIndex === mesIndex &&
                     editingCell?.unidadeId === targetUnidadeId
    
    const metaValue = getMetaValue(vendedor.id, mesIndex, targetUnidadeId)
    
    if (isEditing) {
      return (
        <div className="relative">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveInlineEdit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                saveInlineEdit()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                cancelInlineEdit()
              }
            }}
            className="w-20 h-7 text-center bg-white text-[0.675rem] font-medium [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
            autoFocus
            placeholder="0"
            type="number"
            step="0.01"
            min="0"
          />
        </div>
      )
    }
    
    // Verificar se há valor para exibir
    const hasValue = metaValue && metaValue > 0 && !isNaN(metaValue)
    const displayValue = hasValue ? formatCurrency(metaValue) : 'Meta'
    const displayClass = hasValue 
      ? 'text-green-700 font-semibold text-[0.675rem]' 
      : 'text-gray-400 text-[0.675rem]'
    
    const cellBgClass = hasValue 
      ? 'bg-green-50 border-green-200 hover:bg-green-100' 
      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    
    return (
      <div 
        className={`w-20 h-7 flex items-center justify-center text-xs border-2 cursor-pointer rounded-md transition-all duration-200 ${cellBgClass}`}
        onClick={(e) => {
          e.preventDefault()
          startInlineEdit(vendedor.id, mesIndex, targetUnidadeId)
        }}
        title={hasValue ? `Meta: ${displayValue}` : 'Clique para definir meta'}
      >
        <span className={displayClass}>
          {hasValue ? displayValue : <Plus className="h-3 w-3" />}
        </span>
      </div>
    )
  }

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

  const { matrizVendedores, meses } = generateMatrizGeral()

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Cabeçalho */}
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
      </div>


      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Estatísticas - Período:
            </CardTitle>
            
            {/* Controles em linha */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              {/* Ano */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Ano:</span>
                <Select value={selectedAno.toString()} onValueChange={(value) => setSelectedAno(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                    <SelectItem value="2028">2028</SelectItem>
                    <SelectItem value="2029">2029</SelectItem>
                    <SelectItem value="2030">2030</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Visualização */}
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Visualização:</span>
                <div className="flex items-center space-x-1">
                  <Button
                    variant={visualizacao === 'unidade' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVisualizacao('unidade')}
                    className="text-xs"
                  >
                    <Building2 className="h-3 w-3 mr-1" />
                    Por Unidade
                  </Button>
                  <Button
                    variant={visualizacao === 'geral' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVisualizacao('geral')}
                    className="text-xs"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Geral
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Metas Definidas */}
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <div className="text-xs text-blue-700 font-medium whitespace-nowrap">Metas Definidas</div>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {vendedores.length > 0 ? `${Math.round((metas.length / (vendedores.length * 12)) * 100)}%` : '0%'}
              </div>
            </div>

            {/* Vendedores */}
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-600" />
                <div className="text-xs text-green-700 font-medium whitespace-nowrap">Vendedores</div>
              </div>
              <div className="text-lg font-bold text-green-600">{vendedores.length}</div>
            </div>

            {/* Unidades */}
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <div className="text-xs text-purple-700 font-medium whitespace-nowrap">Unidades</div>
              </div>
              <div className="text-lg font-bold text-purple-600">{unidades.length}</div>
            </div>

            {/* Total em Metas */}
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <div className="text-xs text-orange-700 font-medium whitespace-nowrap">Total em Metas</div>
              </div>
              <div className="text-sm font-bold text-orange-600">
                {(() => {
                  const total = metas.reduce((sum, meta) => sum + parseFloat(meta.meta_valor.toString()), 0)
                  console.log('🔢 Calculando total:', { metas: metas.length, total })
                  return formatCurrency(total)
                })()}
              </div>
            </div>
          </div>


        </CardContent>
      </Card>

      {/* Matriz Geral - Cards por Vendedor */}
      {visualizacao === 'geral' && (
        <div className="space-y-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            <h2 className="text-2xl font-semibold">Matriz Geral - Ano {selectedAno}</h2>
          </div>
          
          <div className="space-y-4">
            {(() => {
              // Agrupar vendedores por ID
              const vendedoresAgrupados = matrizVendedores.reduce((acc, vendedor) => {
                if (!acc[vendedor.id]) {
                  acc[vendedor.id] = {
                    id: vendedor.id,
                    name: vendedor.name,
                    lastName: vendedor.lastName,
                    username: vendedor.username,
                    unidades: []
                  }
                }
                acc[vendedor.id].unidades.push({
                  unidade_id: vendedor.unidade_id,
                  unidade_nome: vendedor.unidade_nome
                })
                return acc
              }, {} as any)

              return Object.values(vendedoresAgrupados).map((vendedor: any) => (
                <Card key={vendedor.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/30 to-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900 text-sm" title={`${vendedor.name} ${vendedor.lastName}`}>
                            {vendedor.name}
                          </h3>
                          <div className="flex gap-1">
                            {vendedor.unidades.map((unidade: any, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 text-blue-700 bg-blue-100 border border-blue-200">
                                {unidade.unidade_nome}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-sm font-bold text-green-600">
                          {(() => {
                            const totalAnual = vendedor.unidades.reduce((total: number, unidade: any) => {
                              return total + meses.reduce((sum: number, mes: any, index: number) => 
                                sum + getMetaValue(vendedor.id, index, unidade.unidade_id), 0
                              )
                            }, 0)
                            return totalAnual > 0 ? formatCurrency(totalAnual) : 'R$ 0,00'
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {vendedor.unidades.length === 1 ? (
                      // Uma unidade - tabela horizontal
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                {meses.map(mes => (
                                  <th key={mes.numero} className="text-center px-2 py-2 font-semibold text-xs text-gray-600 min-w-[60px]">
                                    {mes.nome}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {meses.map((mes, index) => (
                                  <td key={mes.numero} className="px-1 py-2 text-center">
                                    {renderCell(vendedor, index, vendedor.unidades[0].unidade_id)}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      // Múltiplas unidades - separar por unidade
                      <div className="space-y-4">
                        {vendedor.unidades.map((unidade: any, unidadeIndex: number) => (
                          <div key={unidadeIndex} className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                              <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                              {unidade.unidade_nome}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    {meses.map(mes => (
                                      <th key={mes.numero} className="text-center px-2 py-2 font-semibold text-xs text-gray-600 min-w-[60px]">
                                        {mes.nome}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    {meses.map((mes, index) => (
                                      <td key={mes.numero} className="px-1 py-2 text-center">
                                        {renderCell(vendedor, index, unidade.unidade_id)}
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Matriz por Unidade */}
      {visualizacao === 'unidade' && (
        <div className="space-y-6">
          {(() => {
            const { vendedoresPorUnidade, meses } = generateMatrizUnidade()
            
            return Object.entries(vendedoresPorUnidade).map(([unidadeNome, vendedoresUnidade]) => (
              <Card key={unidadeNome}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    {unidadeNome} - Ano {selectedAno}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left px-2 py-1.5 font-semibold text-sm">Vendedor</th>
                          {meses.map(mes => (
                            <th key={mes.numero} className="text-center px-1 py-1.5 font-semibold text-xs min-w-[60px]">
                              {mes.nome}
                            </th>
                          ))}
                          <th className="text-center px-2 py-1.5 font-semibold text-sm">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendedoresUnidade.map(vendedor => {
                          const totalAnual = meses.reduce((sum, mes, index) => 
                            sum + getMetaValue(vendedor.id, index, vendedor.unidade_id), 0
                          )
                          
                          return (
                            <tr key={vendedor.id} className="border-b hover:bg-gray-50">
                              <td className="px-2 py-1">
                                <div>
                                  <div className="font-medium text-[10px] truncate" title={`${vendedor.name} ${vendedor.lastName}`}>
                                    {vendedor.name}
                                  </div>
                                </div>
                              </td>
                              {meses.map((mes, index) => (
                                <td key={mes.numero} className="px-1 py-1 text-center">
                                  {renderCell(vendedor, index, vendedor.unidade_id)}
                                </td>
                              ))}
                              <td className="px-2 py-1 text-center font-semibold text-sm">
                                {totalAnual > 0 ? formatCurrency(totalAnual) : 'Meta'}
                              </td>
                            </tr>
                          )
                        })}
                        
                        {/* Linha de resumo da unidade */}
                        <tr className="border-t-2 border-gray-300 bg-gray-50">
                          <td className="px-2 py-1">
                            <div className="font-semibold text-sm text-gray-700">
                              Total
                            </div>
                          </td>
                          {meses.map((mes, index) => {
                            const totalMes = vendedoresUnidade.reduce((sum, vendedor) => 
                              sum + getMetaValue(vendedor.id, index, vendedor.unidade_id), 0
                            )
                            return (
                              <td key={mes.numero} className="px-1 py-1 text-center">
                                <div className="w-20 h-6 flex items-center justify-center text-xs border border-gray-300 bg-gray-100 rounded font-semibold">
                                  {totalMes > 0 ? formatCurrency(totalMes) : 'Meta'}
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-2 py-1 text-center font-semibold text-sm">
                            {(() => {
                              const totalGeral = vendedoresUnidade.reduce((sum, vendedor) => 
                                sum + meses.reduce((sumMes, mes, index) => 
                                  sumMes + getMetaValue(vendedor.id, index, vendedor.unidade_id), 0
                                ), 0
                              )
                              return totalGeral > 0 ? formatCurrency(totalGeral) : 'Meta'
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          })()}
        </div>
      )}

    </div>
  )
}

