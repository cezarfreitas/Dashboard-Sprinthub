"use client"

import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Componente para item arrastável dos vendedores
function SortableVendedorItem({ vendedor, index, unidadeId }: { 
  vendedor: Vendedor, 
  index: number,
  unidadeId: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vendedor.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-2 p-2 rounded border transition-colors bg-muted/50 border-transparent hover:border-primary/20"
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="flex items-center space-x-2 flex-1 cursor-grab active:cursor-grabbing"
      >
        <BadgeComponent 
          variant="outline" 
          className="text-xs px-1 py-0 h-4 flex-shrink-0"
        >
          #{vendedor.sequencia || index + 1}
        </BadgeComponent>
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {vendedor.name.charAt(0)}{vendedor.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {vendedor.name} {vendedor.lastName}
          </div>
        </div>
        <div className="text-muted-foreground text-xs">
          ⋮⋮
        </div>
      </div>
      
    </div>
  )
}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Building2, 
  Plus, 
  Users,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  RefreshCw,
  Search,
  Building,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'

interface Unidade {
  id: number
  nome: string
  endereco: string
  cidade: string
  estado: string
  telefone: string
  email: string
  responsavel: string
  vendedores: Vendedor[]
  created_at: string
  updated_at: string
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

interface Vendedor {
  id: number
  name: string
  lastName: string
  email: string
  username: string
  telephone: string
  unidade_id?: number
  sequencia?: number
  ativo?: boolean
}

// Badge component inline temporário
const BadgeComponent = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode, 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success',
  className?: string 
}) => {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input bg-background',
    success: 'bg-green-100 text-green-800 border-green-200'
  }
  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null)
  const [isManageVendedoresOpen, setIsManageVendedoresOpen] = useState(false)
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState<Vendedor[]>([])
  const [loadingVendedores, setLoadingVendedores] = useState(false)
  const [searchVendedores, setSearchVendedores] = useState('')

  const { toast } = useToast()

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filtrar vendedores disponíveis baseado na busca
  const vendedoresFiltrados = vendedoresDisponiveis.filter(vendedor =>
    vendedor.name.toLowerCase().includes(searchVendedores.toLowerCase()) ||
    vendedor.lastName.toLowerCase().includes(searchVendedores.toLowerCase()) ||
    vendedor.username.toLowerCase().includes(searchVendedores.toLowerCase()) ||
    vendedor.email.toLowerCase().includes(searchVendedores.toLowerCase())
  )

  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    responsavel: ''
  })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Buscar unidades e vendedores da API real
      const unidadesResponse = await fetch('/api/unidades')
      const unidadesData = await unidadesResponse.json()
      
      if (!unidadesResponse.ok) {
        throw new Error(unidadesData.message || 'Erro ao carregar unidades')
      }
      
      setUnidades(unidadesData.unidades || [])
      
      // Buscar todos os vendedores para o select de gerente
      const vendedoresResponse = await fetch('/api/vendedores/mysql')
      const vendedoresData = await vendedoresResponse.json()
      
      if (vendedoresResponse.ok) {
        setVendedores(vendedoresData.vendedores || [])
      }

      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setUnidades([])
      setVendedores([])
    } finally {
      setLoading(false)
    }
  }


  const handleCreateUnidade = async () => {
    if (!formData.nome || !formData.responsavel) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/unidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar unidade')
      }

      setIsCreateDialogOpen(false)
      resetForm()
      await fetchData() // Recarregar dados
      
      toast({
        title: "Unidade criada!",
        description: `A unidade "${formData.nome}" foi criada com sucesso.`
      })
      
    } catch (err) {
      toast({
        title: "Erro ao criar unidade",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      })
    }
  }

  const handleEditUnidade = async () => {
    if (!selectedUnidade || !formData.nome || !formData.responsavel) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/unidades', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedUnidade.id,
          ...formData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar unidade')
      }

      setIsEditDialogOpen(false)
      setSelectedUnidade(null)
      resetForm()
      await fetchData() // Recarregar dados
      
      toast({
        title: "Unidade atualizada!",
        description: `A unidade "${formData.nome}" foi atualizada com sucesso.`
      })
      
    } catch (err) {
      toast({
        title: "Erro ao atualizar unidade",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      })
    }
  }

  const handleDeleteUnidade = async (unidade: Unidade) => {
    if (confirm(`Tem certeza que deseja excluir a unidade "${unidade.nome}"?`)) {
      try {
        const response = await fetch(`/api/unidades?id=${unidade.id}`, {
          method: 'DELETE'
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao excluir unidade')
        }

        await fetchData() // Recarregar dados
        
        toast({
          title: "Unidade excluída!",
          description: `A unidade "${unidade.nome}" foi excluída com sucesso.`
        })
        
      } catch (err) {
        toast({
          title: "Erro ao excluir unidade",
          description: err instanceof Error ? err.message : 'Erro desconhecido',
          variant: "destructive"
        })
      }
    }
  }

  const openManageVendedores = async (unidade: Unidade) => {
    setSelectedUnidade(unidade)
    setLoadingVendedores(true)
    setIsManageVendedoresOpen(true)
    setSearchVendedores('') // Limpar busca ao abrir
    
    try {
      // Buscar vendedores disponíveis para esta unidade específica
      const response = await fetch(`/api/unidades/vendedores?unidade_id=${unidade.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setVendedoresDisponiveis(data.vendedores_disponiveis || [])
      }
    } catch (err) {
      console.error('Erro ao buscar vendedores disponíveis:', err)
    } finally {
      setLoadingVendedores(false)
    }
  }

  const handleAddVendedor = async (vendedorId: number) => {
    if (!selectedUnidade) return

    try {
      const response = await fetch('/api/unidades/vendedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unidade_id: selectedUnidade.id,
          vendedor_id: vendedorId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao adicionar vendedor')
      }

      // Atualizar apenas a unidade selecionada localmente
      if (selectedUnidade) {
        const vendedorAdicionado = vendedoresDisponiveis.find(v => v.id === vendedorId)
        if (vendedorAdicionado) {
          // Adicionar à unidade atual
          const unidadeAtualizada = {
            ...selectedUnidade,
            vendedores: [...selectedUnidade.vendedores, vendedorAdicionado]
          }
          setSelectedUnidade(unidadeAtualizada)
          
          // Atualizar lista de unidades
          setUnidades(prev => prev.map(u => 
            u.id === selectedUnidade.id ? unidadeAtualizada : u
          ))
          
          // Remover da lista de disponíveis
          setVendedoresDisponiveis(prev => prev.filter(v => v.id !== vendedorId))
        }
      }
      
      toast({
        title: "Vendedor adicionado!",
        description: data.message
      })
      
    } catch (err) {
      toast({
        title: "Erro ao adicionar vendedor",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      })
    }
  }

  const handleRemoveVendedor = async (vendedorId: number) => {
    if (!selectedUnidade) return

    try {
      const response = await fetch(`/api/unidades/vendedores?vendedor_id=${vendedorId}&unidade_id=${selectedUnidade.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao remover vendedor')
      }

      // Atualizar apenas a unidade selecionada localmente
      if (selectedUnidade) {
        const vendedorRemovido = selectedUnidade.vendedores.find(v => v.id === vendedorId)
        if (vendedorRemovido) {
          // Remover da unidade atual
          const unidadeAtualizada = {
            ...selectedUnidade,
            vendedores: selectedUnidade.vendedores.filter(v => v.id !== vendedorId)
          }
          setSelectedUnidade(unidadeAtualizada)
          
          // Atualizar lista de unidades
          setUnidades(prev => prev.map(u => 
            u.id === selectedUnidade.id ? unidadeAtualizada : u
          ))
          
          // Adicionar à lista de disponíveis
          setVendedoresDisponiveis(prev => [...prev, vendedorRemovido])
        }
      }
      
      toast({
        title: "Vendedor removido!",
        description: data.message
      })
      
    } catch (err) {
      toast({
        title: "Erro ao remover vendedor",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      responsavel: ''
    })
  }



  // Função para lidar com drag end dos vendedores
  const handleDragEnd = async (event: DragEndEvent, unidadeId: number) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const unidade = unidades.find(u => u.id === unidadeId)
    if (!unidade) return

    const oldIndex = unidade.vendedores.findIndex(item => item.id === active.id)
    const newIndex = unidade.vendedores.findIndex(item => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Criar nova ordem
    const newVendedores = arrayMove(unidade.vendedores, oldIndex, newIndex)
    const novaSequencia = newVendedores.map(v => v.id)
    
    try {
      const response = await fetch('/api/unidades/sequencia', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unidade_id: unidadeId,
          vendedores_sequencia: novaSequencia
        })
      })

      const data = await response.json()

      if (data.success) {
        // Atualizar estado local imediatamente para feedback visual
        setUnidades(prev => prev.map(u => 
          u.id === unidadeId 
            ? { ...u, vendedores: newVendedores.map((v, index) => ({ ...v, sequencia: index + 1 })) }
            : u
        ))
        
        toast({
          title: "Ordem atualizada!",
          description: "A ordem dos vendedores foi atualizada com sucesso.",
        })
      } else {
        throw new Error(data.error || 'Erro ao atualizar ordem')
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar ordem dos vendedores",
        variant: "destructive"
      })
      // Recarregar dados em caso de erro
      await fetchData()
    }
  }

  const openEditDialog = (unidade: Unidade) => {
    setSelectedUnidade(unidade)
    setFormData({
      nome: unidade.nome,
      responsavel: unidade.responsavel
    })
    setIsEditDialogOpen(true)
  }

  const filteredUnidades = unidades.filter(unidade =>
    unidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg border p-6">
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
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
            Gerencie unidades e organize vendedores por localização
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Unidade</DialogTitle>
                <DialogDescription>
                  Preencha as informações da nova unidade.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nome" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="col-span-3"
                    placeholder="Ex: Unidade Centro"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="gerente" className="text-right">
                    Responsável
                  </Label>
                  <div className="col-span-3">
                    <Select value={formData.responsavel} onValueChange={(value) => setFormData({...formData, responsavel: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendedores.map((vendedor) => (
                          <SelectItem key={vendedor.id} value={`${vendedor.name} ${vendedor.lastName}`}>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {vendedor.name.charAt(0)}{vendedor.lastName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{vendedor.name} {vendedor.lastName}</span>
                              <span className="text-muted-foreground">({vendedor.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateUnidade}>
                  Criar Unidade
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar unidades..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>


      {/* Unidades Grid */}
      {filteredUnidades.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-semibold">Nenhuma unidade encontrada</p>
                <p className="text-sm">
                  {searchTerm ? 'Tente ajustar sua busca' : 'Crie sua primeira unidade'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {filteredUnidades.map((unidade) => (
            <Card key={unidade.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{unidade.nome}</span>
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openManageVendedores(unidade)}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      title="Gerenciar vendedores"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(unidade)}
                      title="Editar unidade"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUnidade(unidade)}
                      className="text-red-600 hover:text-red-700"
                      title="Excluir unidade"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <BadgeComponent variant="secondary">
                  {unidade.vendedores.length} vendedores
                </BadgeComponent>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Responsável: {unidade.responsavel}</span>
                  </div>
                </div>

                {/* Vendedores com Drag and Drop */}
                {unidade.vendedores.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-1 text-blue-600" />
                      Vendedores ({unidade.vendedores.length})
                    </h4>
                    
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, unidade.id)}
                    >
                      <SortableContext
                        items={unidade.vendedores.map(v => v.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          {unidade.vendedores.map((vendedor, index) => (
                            <SortableVendedorItem
                              key={vendedor.id}
                              vendedor={vendedor}
                              index={index}
                              unidadeId={unidade.id}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
            <DialogDescription>
              Atualize as informações da unidade.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-nome" className="text-right">
                Nome
              </Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-gerente" className="text-right">
                Responsável
              </Label>
              <div className="col-span-3">
                <Select value={formData.responsavel} onValueChange={(value) => setFormData({...formData, responsavel: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={`${vendedor.name} ${vendedor.lastName}`}>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {vendedor.name.charAt(0)}{vendedor.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{vendedor.name} {vendedor.lastName}</span>
                          <span className="text-muted-foreground">({vendedor.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleEditUnidade}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Gerenciar Vendedores */}
      <Dialog open={isManageVendedoresOpen} onOpenChange={setIsManageVendedoresOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Vendedores</DialogTitle>
            <DialogDescription>
              {selectedUnidade?.nome} - Adicione ou remova vendedores desta unidade
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendedores da Unidade */}
            <div className="border-r pr-6">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2 text-emerald-600" />
                Vendedores da Unidade ({selectedUnidade?.vendedores.length || 0})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                {selectedUnidade?.vendedores.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm">Nenhum vendedor nesta unidade</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                      {selectedUnidade?.vendedores.map((vendedor) => (
                        <div key={vendedor.id} className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50/50 hover:bg-emerald-50">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                {vendedor.name.charAt(0)}{vendedor.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium">{vendedor.name} {vendedor.lastName}</p>
                                <BadgeComponent variant="outline" className="text-xs">
                                  Multi-unidade
                                </BadgeComponent>
                              </div>
                              <p className="text-xs text-muted-foreground">{vendedor.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVendedor(vendedor.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Remover desta unidade"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vendedores Disponíveis */}
            <div className="pl-6">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <UserPlus className="h-4 w-4 mr-2 text-blue-600" />
                Vendedores Disponíveis ({vendedoresFiltrados.length})
              </h3>
              
              {/* Caixa de Busca */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vendedores..."
                  value={searchVendedores}
                  onChange={(e) => setSearchVendedores(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {loadingVendedores ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Carregando vendedores...</p>
                  </div>
                ) : vendedoresFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm">
                      {searchVendedores 
                        ? "Nenhum vendedor encontrado" 
                        : "Todos os vendedores já estão em unidades"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vendedoresFiltrados.map((vendedor) => (
                      <div key={vendedor.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50 hover:bg-blue-50">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {vendedor.name.charAt(0)}{vendedor.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{vendedor.name} {vendedor.lastName}</p>
                            <p className="text-xs text-muted-foreground">{vendedor.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddVendedor(vendedor.id)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Adicionar à unidade"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
