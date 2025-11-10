"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import CronControls from '@/components/cron-controls'
import {
  Building2, 
  Search, 
  RefreshCw,
  Database,
  Users,
  UserCircle,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  MapPin,
  MessageCircle
} from 'lucide-react'

interface Vendedor {
  id: number
  name: string
  lastName: string
  sequencia: number
  isGestor?: boolean
}

interface VendedorFila {
  id: number
  nome: string
  sequencia: number
  total_distribuicoes?: number
}

interface Unidade {
  id: number
  name: string
  department_id: number | null
  show_sac360: number
  show_crm: number
  create_date: string | null
  update_date: string | null
  total_vendedores: number
  vendedores: string[]
  vendedores_detalhes: Vendedor[]
  user_gestao: number | null  // ID do user_gestao (responsável)
  nome_user_gestao: string | null  // Nome do user_gestao
  dpto_gestao: number | null  // ID do departamento de gestão
  accs: any[]
  branches: any[]
  subs: any[]
  subs_id: number | null
  fila_leads: VendedorFila[]
  ativo: boolean
  synced_at: string
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  ativas: number
  inativas: number
  ultima_sincronizacao: string | null
}

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [editingFila, setEditingFila] = useState<Unidade | null>(null)
  const [filaAtual, setFilaAtual] = useState<VendedorFila[]>([])
  const [dialogFilaOpen, setDialogFilaOpen] = useState(false)

  const fetchUnidades = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm })
      })
      
      const response = await fetch(`/api/unidades/list?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar unidades')
      }
      
      setUnidades(data.unidades || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setUnidades([])
      setStats(null)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const toggleUnidadeStatus = async (unidadeId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/unidades/list?id=${unidadeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: !currentStatus })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao alterar status da unidade')
      }
      
      // Atualizar a unidade na lista local
      setUnidades(prev => prev.map(u => 
        u.id === unidadeId 
          ? { ...u, ativo: !currentStatus }
          : u
      ))
      
    } catch (err) {
      console.error('Erro ao atualizar unidade:', err)
    }
  }

  const abrirGerenciarFila = (unidade: Unidade) => {
    setEditingFila(unidade)
    // Inicializar fila com vendedores existentes ou vazia
    const filaInicial = unidade.fila_leads || []
    setFilaAtual(filaInicial)
    setDialogFilaOpen(true)
  }

  const moverVendedorNaFila = (index: number, direcao: 'up' | 'down') => {
    const novaFila = [...filaAtual]
    const novoIndex = direcao === 'up' ? index - 1 : index + 1
    
    if (novoIndex >= 0 && novoIndex < novaFila.length) {
      [novaFila[index], novaFila[novoIndex]] = [novaFila[novoIndex], novaFila[index]]
      // Atualizar sequências
      novaFila.forEach((v, i) => v.sequencia = i + 1)
      setFilaAtual(novaFila)
    }
  }

  const removerDaFila = (index: number) => {
    const novaFila = filaAtual.filter((_, i) => i !== index)
    // Atualizar sequências
    novaFila.forEach((v, i) => v.sequencia = i + 1)
    setFilaAtual(novaFila)
  }

  const adicionarNaFila = (vendedor: Vendedor) => {
    // Permitir adicionar o mesmo vendedor múltiplas vezes
    const novoVendedor: VendedorFila = {
      id: vendedor.id,
      nome: `${vendedor.name} ${vendedor.lastName}`,
      sequencia: filaAtual.length + 1
    }
    setFilaAtual([...filaAtual, novoVendedor])
  }

  const salvarFila = async () => {
    if (!editingFila) return
    
    try {
      const response = await fetch(`/api/unidades/list?id=${editingFila.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fila_leads: filaAtual })
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar fila')
      }
      
      // Atualizar a unidade na lista local
      setUnidades(prev => prev.map(u => 
        u.id === editingFila.id 
          ? { ...u, fila_leads: filaAtual }
          : u
      ))
      
      setDialogFilaOpen(false)
      setEditingFila(null)
      setFilaAtual([])
      
    } catch (err) {
      console.error('Erro ao salvar fila:', err)
      setError('Erro ao salvar fila de leads')
    }
  }

  useEffect(() => {
    fetchUnidades()
  }, [page])

  // Debounce para busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page === 1) {
        fetchUnidades(false)
      } else {
        setPage(1)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (loading && unidades.length === 0 && !stats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg border p-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display">Unidades</h1>
          <p className="text-muted-foreground font-body">
            Unidades sincronizadas do departamento 85 (SprintHub)
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cron Controls - Apenas Unidades */}
      <CronControls 
        filterJobs={['unidades-sync']} 
        onSyncComplete={() => fetchUnidades(false)}
      />

      {/* Cards de Unidades */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Unidades Cadastradas</h2>
            {unidades.length > 0 && (
              <Badge variant="secondary">{unidades.length}</Badge>
            )}
          </div>
          
          <div className="relative flex-1 max-w-md">
            {loading && unidades.length > 0 ? (
              <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {unidades.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma unidade encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Tente ajustar sua busca' 
                    : 'Use o agendamento automático ou execute a sincronização manualmente via CronControls'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unidades.map((unidade) => (
              <Card key={unidade.id} className={`${unidade.ativo ? 'border-primary/20 hover:border-primary/40' : 'border-gray-200 opacity-60'} transition-all duration-200`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Nome */}
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <h3 className="text-base font-semibold truncate">
                          {unidade.name}
                          <span className="text-sm text-muted-foreground font-normal ml-1">
                            #{unidade.id}
                          </span>
                        </h3>
                      </div>
                      
                      {/* Branches */}
                      {unidade.branches && unidade.branches.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          {unidade.branches.map((branch: any, index: number) => {
                            const nome = typeof branch === 'object' ? branch.name || branch.id : branch
                            return (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs h-6 px-2"
                              >
                                {nome}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    
                    <Switch
                      checked={unidade.ativo}
                      onCheckedChange={() => toggleUnidadeStatus(unidade.id, unidade.ativo)}
                      className="flex-shrink-0"
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-0">
                  {/* Vendedores */}
                  {unidade.vendedores && unidade.vendedores.length > 0 && (
                    <div className="py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Equipe
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {unidade.vendedores.map((vendedor, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="text-xs h-6 px-2"
                            >
                              {vendedor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gestor */}
                  <div className="py-1.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        Gestor
                      </span>
                      <Badge 
                        variant={unidade.nome_user_gestao || unidade.user_gestao ? "default" : "outline"}
                        className="text-xs h-6 px-2"
                      >
                        {unidade.nome_user_gestao || (unidade.user_gestao ? `ID: ${unidade.user_gestao}` : "Não definido")}
                      </Badge>
                    </div>
                  </div>

                  {/* ACCs */}
                  {unidade.accs && unidade.accs.length > 0 && (
                    <div className="py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1.5">
                          {unidade.accs.map((acc: any, index: number) => {
                            const numero = typeof acc === 'object' ? acc.id : acc
                            return (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="text-xs h-6 px-2 font-mono border-green-500 text-green-700 bg-green-50"
                                title={acc.type}
                              >
                                {numero}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fila de Leads */}
                  <div className="py-1.5">
                    <div className="flex items-center gap-2 mb-2">
                      <ListOrdered className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Fila de Atendimento
                      </span>
                      {unidade.fila_leads && unidade.fila_leads.length > 0 && (
                        <Badge variant="outline" className="text-xs h-6 px-2">
                          {unidade.fila_leads.length}
                        </Badge>
                      )}
                    </div>
                    
                    <Card 
                      className="cursor-pointer hover:bg-accent/30 transition-colors border-gray-200"
                      onClick={() => abrirGerenciarFila(unidade)}
                    >
                      <CardContent className="p-3">
                        {unidade.fila_leads && unidade.fila_leads.length > 0 ? (
                          <div className="space-y-1.5">
                            {unidade.fila_leads.map((vendedor, idx) => (
                              <div 
                                key={`${vendedor.id}-${idx}`}
                                className="flex items-center gap-2 text-xs"
                              >
                                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-600 font-semibold text-xs">
                                  {vendedor.sequencia}
                                </div>
                                <span className="truncate">{vendedor.nome}</span>
                                {vendedor.total_distribuicoes !== undefined && vendedor.total_distribuicoes > 0 && (
                                  <Badge 
                                    variant="secondary" 
                                    className="h-4 px-1.5 text-[10px] font-semibold"
                                    title={`${vendedor.total_distribuicoes} distribuições`}
                                  >
                                    {vendedor.total_distribuicoes}x
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-2">
                            Clique para configurar a fila
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Gerenciar Fila de Leads */}
      <Dialog open={dialogFilaOpen} onOpenChange={setDialogFilaOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              Gerenciar Fila de Leads - {editingFila?.name}
            </DialogTitle>
            <DialogDescription>
              Adicione vendedores e organize a ordem de atendimento. Você pode adicionar o mesmo vendedor múltiplas vezes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Coluna 1: Fila Atual */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Ordem da Fila ({filaAtual.length})
                </h3>
                <div className="flex-1 overflow-y-auto">
                  {filaAtual.length > 0 ? (
                    <div className="space-y-2">
                      {filaAtual.map((vendedor, index) => (
                        <div
                          key={`${vendedor.id}-${index}`}
                          className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                            {vendedor.sequencia}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{vendedor.nome}</p>
                            {vendedor.total_distribuicoes !== undefined && vendedor.total_distribuicoes > 0 && (
                              <Badge 
                                variant="secondary" 
                                className="h-5 px-2 text-xs font-semibold"
                                title={`${vendedor.total_distribuicoes} distribuições nesta unidade`}
                              >
                                {vendedor.total_distribuicoes}x
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moverVendedorNaFila(index, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moverVendedorNaFila(index, 'down')}
                              disabled={index === filaAtual.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => removerDaFila(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <ListOrdered className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum vendedor na fila. Adicione vendedores ao lado.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 2: Vendedores Disponíveis */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Disponíveis
                </h3>
                <div className="flex-1 overflow-y-auto">
                  {editingFila?.vendedores_detalhes && editingFila.vendedores_detalhes.length > 0 ? (
                    <div className="space-y-2">
                      {editingFila.vendedores_detalhes.map((vendedor) => (
                        <button
                          key={vendedor.id}
                          className="w-full flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                          onClick={() => adicionarNaFila(vendedor)}
                        >
                          <Plus className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm truncate flex items-center gap-2">
                            {vendedor.name} {vendedor.lastName}
                            {vendedor.isGestor ? (
                              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">Gestor</Badge>
                            ) : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum vendedor disponível
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogFilaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarFila}>
              Salvar Fila
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
