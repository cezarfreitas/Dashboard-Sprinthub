"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { 
  Building2, 
  Users, 
  UserCheck, 
  UserX, 
  LogOut, 
  RefreshCw,
  ArrowLeft,
  BarChart3
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  closestCorners,
  CollisionDetection,
  rectIntersection,
  pointerWithin,
  useDroppable
} from '@dnd-kit/core'
import { 
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from '@dnd-kit/sortable'
import { 
  CSS
} from '@dnd-kit/utilities'

interface GestorAuth {
  id: number
  name: string
  email: string
  unidade_id: number
  unidade_nome: string
  token: string
}

interface Vendedor {
  id: number
  name: string
  lastName: string
  email: string
  username: string
  sequencia?: number
  ativo?: boolean
  isGestor?: boolean
}

interface UnidadeData {
  id: number
  nome: string
  responsavel: string
  vendedores_na_fila: Vendedor[]
  vendedores_fora_fila: Vendedor[]
  total_vendedores: number
}

// Componente para item arrastável
function SortableVendedorItem({ 
  vendedor, 
  index, 
  isInQueue 
}: { 
  vendedor: Vendedor
  index: number
  isInQueue: boolean 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `vendedor-${vendedor.id}`,
    data: {
      type: 'vendedor',
      vendedorId: vendedor.id,
      isInQueue
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center space-x-3 p-3 rounded-lg cursor-grab active:cursor-grabbing select-none ${
        isInQueue 
          ? 'bg-green-50 border border-green-200 hover:bg-green-100' 
          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
      }`}
    >
      <div className="flex-shrink-0">
        <Badge variant="outline" className="text-xs">
          #{vendedor.sequencia || index + 1}
        </Badge>
      </div>
      <Avatar className="h-8 w-8">
        <AvatarFallback className={`text-xs ${
          isInQueue 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {vendedor.name.charAt(0)}{vendedor.lastName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {vendedor.name} {vendedor.lastName}
          {vendedor.isGestor ? (
            <Badge className="ml-2 text-[10px] h-5 px-1.5" variant="secondary">Gestor</Badge>
          ) : null}
        </p>
        <p className="text-xs text-gray-500">{vendedor.email}</p>
      </div>
    </div>
  )
}

// Componente para área de drop
function DroppableArea({ 
  id, 
  title, 
  vendedores, 
  isInQueue,
  icon: Icon,
  colorClass 
}: {
  id: string
  title: string
  vendedores: Vendedor[]
  isInQueue: boolean
  icon: any
  colorClass: string
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: {
      type: 'area',
      areaId: id
    }
  })

  return (
    <Card className={`h-full transition-all duration-200 ${
      isOver ? 'ring-2 ring-blue-500 ring-opacity-50 scale-[1.02]' : ''
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 ${colorClass}`} />
          <span>{title}</span>
          <Badge variant={isInQueue ? "secondary" : "outline"}>
            {vendedores.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef}>
        <SortableContext 
          items={vendedores.map(v => `vendedor-${v.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 min-h-[200px]">
            {isOver && (
              <div className="text-center py-4 text-blue-600 font-medium border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                Solte aqui para mover para {isInQueue ? 'a fila' : 'fora da fila'}
              </div>
            )}
            {vendedores.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Icon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{isInQueue ? 'Nenhum vendedor na fila' : 'Todos os vendedores estão na fila'}</p>
              </div>
            ) : (
              vendedores.map((vendedor, index) => (
                <SortableVendedorItem
                  key={vendedor.id}
                  vendedor={vendedor}
                  index={index}
                  isInQueue={isInQueue}
                />
              ))
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  )
}

export default function GestorDashboardPage() {
  const [gestorAuth, setGestorAuth] = useState<GestorAuth | null>(null)
  const [unidadeData, setUnidadeData] = useState<UnidadeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    // Verificar se gestor está autenticado
    const authData = localStorage.getItem('gestor_auth')
    if (!authData) {
      router.push('/gestor/login')
      return
    }

    try {
      const parsed = JSON.parse(authData)
      setGestorAuth(parsed)
      fetchUnidadeData(parsed.unidade_id)
    } catch (error) {
      console.error('Erro ao parsear dados de auth:', error)
      router.push('/gestor/login')
    }
  }, [router])

  const fetchUnidadeData = async (unidadeId: number) => {
    try {
      const response = await fetch(`/api/gestor/unidade/${unidadeId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar dados da unidade')
      }

      setUnidadeData(data.unidade)
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('gestor_auth')
    router.push('/gestor/login')
  }

  const handleRefresh = () => {
    if (gestorAuth) {
      setLoading(true)
      fetchUnidadeData(gestorAuth.unidade_id)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || !unidadeData || !gestorAuth) {
      setActiveId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Extrair IDs dos elementos
    const vendedorId = activeId.replace('vendedor-', '')
    const targetAreaId = overId.replace('area-', '')

    // Determinar se está movendo para fila ou para fora
    const isMovingToQueue = targetAreaId === 'fila'
    const isMovingFromQueue = targetAreaId === 'fora'

    // Verificar se realmente precisa mover
    const currentVendedor = [...unidadeData.vendedores_na_fila, ...unidadeData.vendedores_fora_fila]
      .find(v => v.id.toString() === vendedorId)

    if (!currentVendedor) {
      setActiveId(null)
      return
    }

    const currentlyInQueue = unidadeData.vendedores_na_fila.some(v => v.id.toString() === vendedorId)

    // Se não há mudança real, não fazer nada
    if ((isMovingToQueue && currentlyInQueue) || (isMovingFromQueue && !currentlyInQueue)) {
      setActiveId(null)
      return
    }

    try {
      // Fazer a requisição para a API
      const response = await fetch('/api/unidades/fila', {
        method: isMovingToQueue ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendedor_id: parseInt(vendedorId),
          unidade_id: gestorAuth.unidade_id
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar fila')
      }

      // Atualizar estado local
      setUnidadeData(prev => {
        if (!prev) return prev

        if (isMovingToQueue) {
          // Mover para fila
          const vendedor = prev.vendedores_fora_fila.find(v => v.id.toString() === vendedorId)
          if (!vendedor) return prev

          return {
            ...prev,
            vendedores_fora_fila: prev.vendedores_fora_fila.filter(v => v.id.toString() !== vendedorId),
            vendedores_na_fila: [...prev.vendedores_na_fila, vendedor]
          }
        } else {
          // Mover para fora da fila
          const vendedor = prev.vendedores_na_fila.find(v => v.id.toString() === vendedorId)
          if (!vendedor) return prev

          return {
            ...prev,
            vendedores_na_fila: prev.vendedores_na_fila.filter(v => v.id.toString() !== vendedorId),
            vendedores_fora_fila: [...prev.vendedores_fora_fila, vendedor]
          }
        }
      })

      toast({
        title: "Fila atualizada!",
        description: `Vendedor movido ${isMovingToQueue ? 'para' : 'de fora da'} fila de oportunidades`
      })

    } catch (error) {
      toast({
        title: "Erro ao atualizar fila",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    }

    setActiveId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando dados da unidade...</p>
        </div>
      </div>
    )
  }

  if (!gestorAuth || !unidadeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar dados</p>
          <Button onClick={() => router.push('/gestor/login')} className="mt-4">
            Voltar ao Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {unidadeData.nome}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Área do Gestor
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {gestorAuth.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium">{gestorAuth.name}</p>
                  <p className="text-gray-500">{gestorAuth.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Vendedores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unidadeData.total_vendedores}</div>
              <p className="text-xs text-muted-foreground">
                Vendedores cadastrados na unidade
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Na Fila de Oportunidades
              </CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {unidadeData.vendedores_na_fila.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Recebendo leads automaticamente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Fora da Fila
              </CardTitle>
              <UserX className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {unidadeData.vendedores_fora_fila.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Não recebendo leads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Vendedores com Drag and Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DroppableArea
              id="area-fila"
              title="Fila de Oportunidades"
              vendedores={unidadeData.vendedores_na_fila}
              isInQueue={true}
              icon={UserCheck}
              colorClass="text-green-600"
            />
            
            <DroppableArea
              id="area-fora"
              title="Fora da Fila"
              vendedores={unidadeData.vendedores_fora_fila}
              isInQueue={false}
              icon={UserX}
              colorClass="text-gray-600"
            />
          </div>
          
          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                {/* Renderizar o item sendo arrastado */}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
