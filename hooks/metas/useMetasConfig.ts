'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface MetaMensal {
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

export interface Vendedor {
  id: number
  name: string
  lastName: string
  username: string
  unidade_id: number
  unidade_nome: string
}

export interface Unidade {
  id: number
  nome: string
}

interface EditingCell {
  vendedorId: number
  mesIndex: number
  unidadeId?: number
}

interface UseMetasConfigReturn {
  metas: MetaMensal[]
  vendedores: Vendedor[]
  unidades: Unidade[]
  loading: boolean
  error: string
  selectedAno: number
  visualizacao: 'unidade' | 'geral'
  editingCell: EditingCell | null
  editValue: string
  setSelectedAno: (ano: number) => void
  setVisualizacao: (viz: 'unidade' | 'geral') => void
  fetchData: () => Promise<void>
  startInlineEdit: (vendedorId: number, mesIndex: number, unidadeId?: number) => void
  saveInlineEdit: () => Promise<void>
  cancelInlineEdit: () => void
  setEditValue: (value: string) => void
  getMetaValue: (vendedorId: number, mesIndex: number, unidadeId?: number) => number
}

export function useMetasConfig(): UseMetasConfigReturn {
  const [metas, setMetas] = useState<MetaMensal[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear())
  const [visualizacao, setVisualizacao] = useState<'unidade' | 'geral'>('unidade')
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')

  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/metas?ano=${selectedAno}`, {
        signal: abortControllerRef.current.signal
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar dados')
      }
      
      setMetas(data.metas || [])
      setVendedores(data.vendedores || [])
      setUnidades(data.unidades || [])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [selectedAno])

  const getMetaValue = useCallback((vendedorId: number, mesIndex: number, unidadeId?: number) => {
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
    
    return meta ? parseFloat(meta.meta_valor.toString()) : 0
  }, [metas, vendedores, selectedAno])

  const startInlineEdit = useCallback((vendedorId: number, mesIndex: number, unidadeId?: number) => {
    const currentValue = getMetaValue(vendedorId, mesIndex, unidadeId)
    const vendedor = vendedores.find(v => v.id === vendedorId)
    const targetUnidadeId = unidadeId || vendedor?.unidade_id || 1
    
    setEditingCell({ vendedorId, mesIndex, unidadeId: targetUnidadeId })
    setEditValue(currentValue === 0 ? '' : currentValue.toString())
  }, [getMetaValue, vendedores])

  const saveInlineEdit = useCallback(async () => {
    if (!editingCell) return
    
    if (!editValue || editValue.trim() === '') {
      setEditingCell(null)
      setEditValue('')
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
        
        toast({ 
          title: "Meta criada!", 
          description: `Meta de R$ ${newValue.toLocaleString('pt-BR')} criada` 
        })
      } else {
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
        
        toast({ 
          title: "Meta atualizada!", 
          description: `Meta atualizada para R$ ${newValue.toLocaleString('pt-BR')}` 
        })
      }

      if (isNewMeta) {
        const vendedor = vendedores.find(v => v.id === editingCell.vendedorId)
        const unidade = unidades.find(u => u.id === unidadeId)
        
        if (vendedor && unidade) {
          const novaMeta: MetaMensal = {
            id: Date.now(),
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
        setMetas(prev => prev.map(meta => 
          meta.id === metaExistente.id 
            ? { ...meta, meta_valor: newValue }
            : meta
        ))
      }
      
    } catch (error) {
      toast({
        title: "Erro ao salvar meta",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    }
    
    setEditingCell(null)
    setEditValue('')
  }, [editingCell, editValue, metas, vendedores, unidades, selectedAno, toast])

  const cancelInlineEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
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
  }
}

