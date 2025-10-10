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
  Download,
  Upload, 
  RefreshCw,
  Target,
  TrendingUp
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
        unidades: data.unidades?.length || 0
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
          className="w-20 h-6 text-center border-2 border-blue-500 focus:border-blue-600 focus:ring-2 bg-white text-xs"
          autoFocus
          placeholder="0"
          type="number"
          step="0.01"
          min="0"
        />
      )
    }
    
    // Verificar se há valor para exibir
    const hasValue = metaValue && metaValue > 0 && !isNaN(metaValue)
    const displayValue = hasValue ? formatCurrency(metaValue) : 'Meta'
    const displayClass = hasValue ? 'text-green-600 font-medium text-xs' : 'text-gray-500 text-xs'
    
    return (
      <div 
        className="w-20 h-6 flex items-center justify-center text-xs border border-gray-200 bg-white cursor-pointer hover:bg-gray-100 rounded"
        onClick={(e) => {
          e.preventDefault()
          startInlineEdit(vendedor.id, mesIndex, targetUnidadeId)
        }}
      >
        <span className={displayClass}>{displayValue}</span>
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
    <div className="w-full p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Target className="h-8 w-8 mr-3 text-primary" />
            Configuração de Metas
          </h1>
          <p className="text-muted-foreground mt-2">
            Defina metas mensais para vendedores por unidade
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Controles */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Período */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Período:</span>
            </div>
            
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
            </div>

            {/* Visualização */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Visualização:</span>
            </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={visualizacao === 'unidade' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizacao('unidade')}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Por Unidade
                </Button>
                <Button
                  variant={visualizacao === 'geral' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizacao('geral')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Geral
                </Button>
              </div>
              
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Matriz Geral */}
      {visualizacao === 'geral' && (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Matriz Geral - Ano {selectedAno}
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
                  {matrizVendedores.map(vendedor => {
                    const totalAnual = meses.reduce((sum, mes, index) => 
                      sum + getMetaValue(vendedor.id, index), 0
                    )
                  
                  return (
                      <tr key={vendedor.id} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-1">
                        <div>
                            <div className="font-medium text-xs">{vendedor.name} {vendedor.lastName}</div>
                            <Badge variant="secondary" className="text-xs px-0.5 py-0 h-3 text-gray-600 bg-gray-100 scale-75">
                              {vendedor.unidade_nome}
                            </Badge>
                            </div>
                        </td>
                        {meses.map((mes, index) => (
                          <td key={mes.numero} className="px-1 py-1 text-center">
                            {renderCell(vendedor, index)}
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center font-semibold text-sm">
                          {totalAnual > 0 ? formatCurrency(totalAnual) : 'Meta'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Matriz por Unidade */}
      {visualizacao === 'unidade' && (
        <div className="space-y-6">
          {(() => {
            const { vendedoresPorUnidade, meses } = generateMatrizUnidade()
            
            return Object.entries(vendedoresPorUnidade).map(([unidadeNome, vendedoresUnidade]) => (
              <Card key={unidadeNome}>
                <CardHeader>
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
                                  <div className="font-medium text-sm">{vendedor.name} {vendedor.lastName}</div>
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
                              Total {unidadeNome}
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

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metas.length}</div>
              <div className="text-sm text-gray-500">Metas Definidas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{vendedores.length}</div>
              <div className="text-sm text-gray-500">Vendedores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{unidades.length}</div>
              <div className="text-sm text-gray-500">Unidades</div>
          </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(metas.reduce((sum, meta) => sum + meta.meta_valor, 0))}
            </div>
              <div className="text-sm text-gray-500">Total em Metas</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
