"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import CronControls from '@/components/cron-controls'
// import { Badge } from '@/components/ui/badge'

// Badge component inline temporário
const Badge = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode, 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline',
  className?: string 
}) => {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input bg-background'
  }
  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  User, 
  Phone, 
  Calendar, 
  Search, 
  RefreshCw,
  UserCheck,
  Users,
  Database,
  RotateCcw,
  Download,
  Trash2,
  Shield,
  Clock
} from 'lucide-react'

interface VendedorMySQL {
  id: number
  name: string
  lastName: string
  email: string
  cpf: string | null
  username: string
  birthDate: string
  telephone: string | null
  photo: string | null
  admin: number
  branch: string | null
  position_company: string | null
  skills: string | null
  state: string | null
  city: string | null
  whatsapp_automation: string | null
  ativo: boolean
  last_login: string | null
  last_action: string | null
  status: 'active' | 'inactive' | 'blocked'
  synced_at: string
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  active: number
  inactive: number
  blocked: number
  com_telefone: number
  com_cpf: number
  admins: number
  ultima_sincronizacao: string | null
}

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<VendedorMySQL[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  const fetchVendedores = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm })
      })
      
      const response = await fetch(`/api/vendedores/mysql?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar vendedores')
      }
      
      setVendedores(data.vendedores || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setVendedores([])
      setStats(null)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const syncVendedores = async () => {
    setSyncing(true)
    setError('')
    
    try {
      const response = await fetch('/api/vendedores/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro na sincronização')
      }
      
      // Recarregar dados após sincronização
      await fetchVendedores()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na sincronização')
    } finally {
      setSyncing(false)
    }
  }

  const toggleVendedorStatus = async (vendedorId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/vendedores/mysql?id=${vendedorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ativo: !currentStatus })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao alterar status do vendedor')
      }
      
      // Atualizar o vendedor na lista local
      setVendedores(prev => prev.map(v => 
        v.id === vendedorId 
          ? { ...v, ativo: !currentStatus }
          : v
      ))
      
    } catch (err) {
      // Erro silencioso
    }
  }

  useEffect(() => {
    fetchVendedores()
  }, [page])

  // Debounce para busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page === 1) {
        fetchVendedores(false) // Não mostrar loading para filtros
      } else {
        setPage(1) // Reset página quando filtrar
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    })
  }


  const formatPhone = (phone: string | null) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, text: 'Ativo' },
      inactive: { variant: 'secondary' as const, text: 'Inativo' },
      blocked: { variant: 'destructive' as const, text: 'Bloqueado' }
    }
    const config = variants[status as keyof typeof variants] || variants.active
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  // Loading apenas no carregamento inicial
  if (loading && vendedores.length === 0 && !stats) {
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
        
        <div className="animate-pulse">
          <div className="bg-white rounded-lg border">
            <div className="p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display">Vendedores</h1>
          <p className="text-muted-foreground font-body">
            Gerencie sua equipe de vendas sincronizada com SprintHub
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <UserCheck className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cron Controls - Apenas Vendedores */}
      <CronControls filterJobs={['vendedores-sync']} />

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Database className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Com Telefone</p>
                  <p className="text-2xl font-bold">{stats.com_telefone}</p>
                </div>
                <Phone className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                </div>
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Última Sync</p>
                  <p className="text-xs font-medium">
                    {stats.ultima_sincronizacao 
                      ? new Date(stats.ultima_sincronizacao).toLocaleString('pt-BR', {
                          timeZone: 'America/Sao_Paulo'
                        }).split(' ')[1]
                      : 'Nunca'
                    }
                  </p>
                </div>
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Vendedores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Vendedores Cadastrados</span>
              {vendedores.length > 0 && (
                <Badge variant="secondary">{vendedores.length}</Badge>
              )}
            </CardTitle>
            <div className="relative w-full max-w-sm">
              {loading && vendedores.length > 0 ? (
                <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                placeholder="Buscar por nome, username, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vendedores.length === 0 ? (
                <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum vendedor encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Tente ajustar sua busca' 
                  : 'Execute a sincronização para importar vendedores da SprintHub'
                }
              </p>
              {!searchTerm && (
                <Button onClick={syncVendedores} disabled={syncing}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Sincronizar Agora
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID SH</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedores.map((vendedor) => (
                    <TableRow key={vendedor.id}>
                      <TableCell>
                        <div className="font-mono text-sm font-medium">
                          {vendedor.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {vendedor.name} {vendedor.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            @{vendedor.username}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vendedor.telephone ? (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatPhone(vendedor.telephone)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(vendedor.status)}
                      </TableCell>
                      <TableCell>
                        {vendedor.admin ? (
                          <Badge variant="default" className="bg-orange-100 text-orange-800">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={vendedor.ativo}
                          onCheckedChange={(checked: boolean) => toggleVendedorStatus(vendedor.id, vendedor.ativo)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
