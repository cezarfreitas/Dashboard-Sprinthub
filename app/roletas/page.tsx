"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Building2, 
  Users, 
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  Copy,
  Link,
  History
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { RoletaLogDialog } from '@/components/roleta-log-dialog'

interface Vendedor {
  id: number
  name: string
  lastName: string
  email: string
  username: string
  telephone?: string
  unidade_id?: number
}

interface Unidade {
  id: number
  nome: string
  responsavel: string
  vendedores: Vendedor[]
}

interface FilaVendedor {
  id: number
  vendedor_id: number
  ordem: number
  name: string
  lastName: string
  email: string
  telephone?: string
}

interface RoletaUnidade {
  id: number
  unidade_id: number
  ativo: boolean
  unidade_nome: string
  responsavel: string
  total_vendedores: number
  fila: FilaVendedor[]
  created_at: string
  updated_at: string
}

export default function RoletasPage() {
  const [roletas, setRoletas] = useState<RoletaUnidade[]>([])
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUnidade, setSelectedUnidade] = useState<string>('')
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [selectedRoletaForLog, setSelectedRoletaForLog] = useState<RoletaUnidade | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Carregar roletas
      const roletasResponse = await fetch('/api/roleta')
      const roletasData = await roletasResponse.json()

      if (roletasData.success) {
        setRoletas(roletasData.roletas || [])
      }

      // Carregar unidades disponíveis
      const unidadesResponse = await fetch('/api/unidades')
      const unidadesData = await unidadesResponse.json()

      if (unidadesData.success) {
        setUnidadesDisponiveis(unidadesData.unidades || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const adicionarUnidadeRoleta = async () => {
    if (!selectedUnidade) {
      toast({
        title: "Erro",
        description: "Selecione uma unidade para adicionar à roleta",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/roleta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unidade_id: parseInt(selectedUnidade)
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Unidade adicionada à roleta com sucesso!",
        })
        setSelectedUnidade('')
        loadData()
      } else {
        throw new Error(data.error || 'Erro ao adicionar unidade')
      }
    } catch (error) {
      console.error('Erro ao adicionar unidade:', error)
      toast({
        title: "Erro",
        description: "Erro ao adicionar unidade à roleta",
        variant: "destructive"
      })
    }
  }

  const removerUnidadeRoleta = async (roletaId: number) => {
    try {
      const response = await fetch(`/api/roleta?id=${roletaId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Unidade removida da roleta com sucesso!",
        })
        loadData()
      } else {
        throw new Error(data.error || 'Erro ao remover unidade')
      }
    } catch (error) {
      console.error('Erro ao remover unidade:', error)
      toast({
        title: "Erro",
        description: "Erro ao remover unidade da roleta",
        variant: "destructive"
      })
    }
  }

  const atualizarOrdemFila = async (roletaId: number, novaOrdem: number[], registrarLog: boolean = false) => {
    try {
      const response = await fetch('/api/roleta', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleta_id: roletaId,
          vendedores_ordem: novaOrdem,
          registrar_log: registrarLog
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Ordem da fila atualizada com sucesso!",
        })
        loadData()
      } else {
        throw new Error(data.error || 'Erro ao atualizar ordem')
      }
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar ordem da fila",
        variant: "destructive"
      })
    }
  }


  const moverVendedorFila = (roletaId: number, vendedorId: number, direcao: 'up' | 'down') => {
    const roleta = roletas.find(r => r.id === roletaId)
    if (!roleta) return

    const fila = [...roleta.fila]
    const index = fila.findIndex(v => v.vendedor_id === vendedorId)
    
    if (index === -1) return

    if (direcao === 'up' && index > 0) {
      [fila[index], fila[index - 1]] = [fila[index - 1], fila[index]]
    } else if (direcao === 'down' && index < fila.length - 1) {
      [fila[index], fila[index + 1]] = [fila[index + 1], fila[index]]
    }

    const novaOrdem = fila.map(v => v.vendedor_id)
    atualizarOrdemFila(roletaId, novaOrdem)
  }

  const avancarProximoFila = async (roletaId: number) => {
    const roleta = roletas.find(r => r.id === roletaId)
    if (!roleta || roleta.fila.length === 0) {
      toast({
        title: "Erro",
        description: "Não há vendedores na fila para avançar",
        variant: "destructive"
      })
      return
    }

    // Selecionar o primeiro da fila (próximo a ser sorteado)
    const proximoVendedor = roleta.fila[0]
    
    // Criar nova fila: mover o primeiro para o final (loop infinito)
    const novaFila = [...roleta.fila.slice(1), roleta.fila[0]]

    // Atualizar a ordem na fila
    const novaOrdem = novaFila.map((v, index) => v.vendedor_id)
    
    try {
      await atualizarOrdemFila(roletaId, novaOrdem, true)
      
      toast({
        title: "🎯 Próximo Selecionado!",
        description: `${proximoVendedor.name} ${proximoVendedor.lastName} foi selecionado e voltou para o final da fila!`,
      })
    } catch (error) {
      console.error('Erro ao avançar fila:', error)
      toast({
        title: "Erro",
        description: "Erro ao avançar para o próximo da fila",
        variant: "destructive"
      })
    }
  }

  const getUnidadesDisponiveisParaAdicionar = () => {
    const unidadesNaRoleta = roletas.map(r => r.unidade_id)
    return unidadesDisponiveis.filter(u => !unidadesNaRoleta.includes(u.id))
  }

  const copiarWebhook = async (roletaId: number) => {
    try {
      const webhookUrl = `${window.location.origin}/api/roleta/webhook/${roletaId}`

      // Copiar apenas a URL, pois agora funciona com GET
      await navigator.clipboard.writeText(webhookUrl)
      
      toast({
        title: "Webhook copiado!",
        description: `URL do webhook da roleta ${roletaId} copiada para a área de transferência`,
      })
    } catch (error) {
      console.error('Erro ao copiar webhook:', error)
      toast({
        title: "Erro",
        description: "Erro ao copiar webhook",
        variant: "destructive"
      })
    }
  }

  const abrirLog = (roleta: RoletaUnidade) => {
    setSelectedRoletaForLog(roleta)
    setLogDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="text-muted-foreground text-sm">Carregando roletas...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-display">Roletas</h1>
          <p className="text-muted-foreground font-body">
            Sistema de sorteios e premiações
          </p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display flex items-center gap-3">
            <Building2 className="h-8 w-8 text-purple-500" />
            Roletas
          </h1>
          <p className="text-muted-foreground font-body">
            Sistema de sorteios e premiações por unidade
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>


      {/* Adicionar Unidade à Roleta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Unidade à Roleta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Selecionar Unidade</label>
              <Select value={selectedUnidade || "all"} onValueChange={setSelectedUnidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Selecionar unidade</SelectItem>
                  {getUnidadesDisponiveisParaAdicionar().map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id.toString()}>
                      {unidade.nome} ({unidade.vendedores.length} vendedores)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={adicionarUnidadeRoleta}
              disabled={!selectedUnidade || selectedUnidade === 'all'}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar à Roleta
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Cards das Roletas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {roletas.map((roleta) => (
          <Card key={roleta.id} className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span className="truncate">{roleta.unidade_nome}</span>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirLog(roleta)}
                    className="h-6 w-6 p-0 text-purple-500 hover:text-purple-700"
                    title="Ver log"
                  >
                    <History className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copiarWebhook(roleta.id)}
                    className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                    title="Copiar webhook"
                  >
                    <Link className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => avancarProximoFila(roleta.id)}
                    disabled={roleta.fila.length === 0}
                    className="h-6 w-6 p-0 text-green-500 hover:text-green-700 disabled:text-gray-400"
                    title="Avançar fila"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerUnidadeRoleta(roleta.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    title="Remover roleta"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Responsável: {roleta.responsavel}
              </p>
            </CardHeader>
            
            <CardContent className="px-3 pb-3 space-y-2">
              {/* Fila de Vendedores */}
              <div className="space-y-1">
                {roleta.fila.map((vendedor, index) => (
                  <div key={vendedor.id} className="flex items-center justify-between text-xs p-1 bg-muted/50 rounded">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                        #{vendedor.ordem}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{vendedor.name} {vendedor.lastName}</div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moverVendedorFila(roleta.id, vendedor.vendedor_id, 'up')}
                        disabled={index === 0}
                        className="h-5 w-5 p-0"
                      >
                        <ArrowUp className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moverVendedorFila(roleta.id, vendedor.vendedor_id, 'down')}
                        disabled={index === roleta.fila.length - 1}
                        className="h-5 w-5 p-0"
                      >
                        <ArrowDown className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Log */}
      {selectedRoletaForLog && (
        <RoletaLogDialog
          isOpen={logDialogOpen}
          onClose={() => setLogDialogOpen(false)}
          roletaId={selectedRoletaForLog.id}
          roletaNome={selectedRoletaForLog.unidade_nome}
        />
      )}

    </div>
  )
}
