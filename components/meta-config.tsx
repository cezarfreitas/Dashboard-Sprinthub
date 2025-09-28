"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target, 
  Users, 
  Calendar, 
  Save, 
  RefreshCw,
  Building2,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Vendedor {
  id: number
  name: string
  lastName: string
  email: string
  unidade_id?: number
}

interface Unidade {
  id: number
  nome: string
  gerente: string
}

interface MetaConfig {
  id?: number
  vendedor_id: number
  mes: number
  ano: number
  meta_valor: number
  meta_quantidade: number
  created_at?: string
  updated_at?: string
}

interface MetaConfigProps {
  onClose?: () => void
}

export function MetaConfig({ onClose }: MetaConfigProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [metas, setMetas] = useState<MetaConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedUnidade, setSelectedUnidade] = useState<string>('all')
  const [selectedMes, setSelectedMes] = useState<string>('')
  const [selectedAno, setSelectedAno] = useState<string>(new Date().getFullYear().toString())

  // Carregar dados iniciais
  useEffect(() => {
    loadData()
  }, [])

  // Carregar metas quando filtros mudarem
  useEffect(() => {
    if (selectedMes && selectedAno) {
      loadMetas()
    }
  }, [selectedMes, selectedAno, selectedUnidade])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Carregar vendedores
      const vendedoresResponse = await fetch('/api/vendedores')
      const vendedoresData = await vendedoresResponse.json()
      if (vendedoresData.success) {
        setVendedores(vendedoresData.vendedores || [])
      }

      // Carregar unidades
      const unidadesResponse = await fetch('/api/unidades')
      const unidadesData = await unidadesResponse.json()
      if (unidadesData.success) {
        setUnidades(unidadesData.unidades || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados iniciais",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMetas = async () => {
    try {
      const params = new URLSearchParams()
      params.append('mes', selectedMes)
      params.append('ano', selectedAno)
      if (selectedUnidade && selectedUnidade !== 'all') {
        params.append('unidade_id', selectedUnidade)
      }

      const response = await fetch(`/api/goal?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setMetas(data.metas || [])
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
    }
  }

  const saveMetas = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metas: metas,
          mes: parseInt(selectedMes),
          ano: parseInt(selectedAno)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Metas salvas com sucesso!",
        })
        loadMetas() // Recarregar dados
      } else {
        throw new Error(data.message || 'Erro ao salvar metas')
      }
    } catch (error) {
      console.error('Erro ao salvar metas:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar metas",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const updateMeta = (vendedorId: number, field: 'meta_valor' | 'meta_quantidade', value: number) => {
    setMetas(prev => {
      const existing = prev.find(m => m.vendedor_id === vendedorId)
      if (existing) {
        return prev.map(m => 
          m.vendedor_id === vendedorId 
            ? { ...m, [field]: value }
            : m
        )
      } else {
        return [...prev, {
          vendedor_id: vendedorId,
          mes: parseInt(selectedMes),
          ano: parseInt(selectedAno),
          meta_valor: field === 'meta_valor' ? value : 0,
          meta_quantidade: field === 'meta_quantidade' ? value : 0
        }]
      }
    })
  }

  const getVendedoresFiltrados = () => {
    if (selectedUnidade && selectedUnidade !== 'all') {
      return vendedores.filter(v => v.unidade_id === parseInt(selectedUnidade))
    }
    return vendedores
  }

  const getMeta = (vendedorId: number, field: 'meta_valor' | 'meta_quantidade') => {
    const meta = metas.find(m => m.vendedor_id === vendedorId)
    return meta ? meta[field] : 0
  }

  const getUnidadeNome = (unidadeId?: number) => {
    if (!unidadeId) return 'Sem unidade'
    const unidade = unidades.find(u => u.id === unidadeId)
    return unidade?.nome || 'Unidade não encontrada'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="text-muted-foreground text-sm">Carregando configurações...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Configuração de Metas
          </h2>
          <p className="text-muted-foreground">
            Configure as metas mensais por vendedor
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Unidade</label>
              <Select value={selectedUnidade || "all"} onValueChange={setSelectedUnidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id.toString()}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mês</label>
              <Select value={selectedMes} onValueChange={setSelectedMes}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const mes = i + 1
                    const nomeMes = new Date(2024, i).toLocaleString('pt-BR', { month: 'long' })
                    return (
                      <SelectItem key={mes} value={mes.toString()}>
                        {nomeMes}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select value={selectedAno} onValueChange={setSelectedAno}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar ano" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const ano = new Date().getFullYear() - 2 + i
                    return (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadMetas} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Carregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Metas */}
      {selectedMes && selectedAno && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Metas dos Vendedores
                <Badge variant="secondary">
                  {getVendedoresFiltrados().length} vendedores
                </Badge>
              </CardTitle>
              <Button onClick={saveMetas} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Metas
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-4 w-4" />
                        Meta Valor (R$)
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-4 w-4" />
                        Meta Quantidade
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getVendedoresFiltrados().map((vendedor) => (
                    <TableRow key={vendedor.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {vendedor.name} {vendedor.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {vendedor.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Building2 className="h-3 w-3 mr-1" />
                          {getUnidadeNome(vendedor.unidade_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={getMeta(vendedor.id, 'meta_valor')}
                          onChange={(e) => updateMeta(vendedor.id, 'meta_valor', parseFloat(e.target.value) || 0)}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={getMeta(vendedor.id, 'meta_quantidade')}
                          onChange={(e) => updateMeta(vendedor.id, 'meta_quantidade', parseInt(e.target.value) || 0)}
                          className="text-right"
                          placeholder="0"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
