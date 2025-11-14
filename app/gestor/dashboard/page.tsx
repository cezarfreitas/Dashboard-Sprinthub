"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  UserCircle, 
  Building2, 
  LogOut,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  DollarSign
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import ResumoUnidades from "@/components/resumo-unidades"

interface GestorData {
  id: number
  name: string
  lastName: string
  email: string
  unidades: Array<{
    id: number
    nome: string
    dpto_gestao: number | null
  }>
  unidade_principal: {
    id: number
    nome: string
    dpto_gestao: number | null
  }
}

interface VendedorStats {
  id: number
  name: string
  lastName: string
  oportunidades_criadas: number
  oportunidades_ganhas: number
  valor_ganho: number
  oportunidades_perdidas: number
  oportunidades_abertas: number
  meta: number
}

interface GestorStats {
  total_vendedores: number
  oportunidades_criadas: number
  oportunidades_ganhas: number
  valor_ganho: number
  oportunidades_perdidas: number
  oportunidades_abertas: number
  vendedores: VendedorStats[]
  meta_total: number
  etapas_funil: Array<{
    id: number
    nome_coluna: string
    sequencia: number
    total_oportunidades: number
    valor_total: number
  }>
}

interface Oportunidade {
  id: number
  titulo: string
  valor: number
  coluna_nome: string
  ganho: number
  perda: number
  created_date: string
  motivo_perda?: string
}

export default function GestorDashboard() {
  const [gestor, setGestor] = useState<GestorData | null>(null)
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<number | null>(null)
  const [stats, setStats] = useState<GestorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [vendedorSelecionado, setVendedorSelecionado] = useState<VendedorStats | null>(null)
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [loadingOportunidades, setLoadingOportunidades] = useState(false)
  const router = useRouter()

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const fetchStats = async () => {
    if (!gestor || !unidadeSelecionada) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/gestor/stats?gestorId=${gestor.id}&unidadeId=${unidadeSelecionada}`
      )
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
        setError("")
      } else {
        setError(data.message || 'Erro ao carregar estatísticas')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('gestor')
    router.push('/gestor')
  }

  const handleVerOportunidades = async (vendedor: VendedorStats) => {
    console.log('=== handleVerOportunidades chamada ===')
    console.log('Vendedor:', vendedor)
    
    setVendedorSelecionado(vendedor)
    console.log('Abrindo dialog...')
    setDialogOpen(true)
    setLoadingOportunidades(true)

    try {
      const dataAtual = new Date()
      const mes = dataAtual.getMonth() + 1
      const ano = dataAtual.getFullYear()
      const primeiraDataMes = `${ano}-${String(mes).padStart(2, '0')}-01`

      console.log('Buscando oportunidades:', `/api/oportunidades/vendedor?vendedor_id=${vendedor.id}&data_inicio=${primeiraDataMes}`)
      
      const response = await fetch(
        `/api/oportunidades/vendedor?vendedor_id=${vendedor.id}&data_inicio=${primeiraDataMes}`
      )
      const data = await response.json()

      console.log('Resposta da API:', data)

      if (data.success) {
        setOportunidades(data.oportunidades || [])
        console.log('Oportunidades carregadas:', data.oportunidades?.length || 0)
      } else {
        setOportunidades([])
        console.log('Nenhuma oportunidade encontrada')
      }
    } catch (err) {
      console.error('Erro ao buscar oportunidades:', err)
      setOportunidades([])
    } finally {
      setLoadingOportunidades(false)
      console.log('Dialog aberto:', true)
    }
  }

  useEffect(() => {
    // Verificar se gestor está logado
    const gestorData = localStorage.getItem('gestor')
    if (!gestorData) {
      router.push('/gestor')
      return
    }

    try {
      const parsedGestor = JSON.parse(gestorData)
      setGestor(parsedGestor)
      // Definir unidade principal como padrão
      setUnidadeSelecionada(parsedGestor.unidade_principal.id)
    } catch (err) {
      router.push('/gestor')
    }
  }, [router])

  useEffect(() => {
    if (gestor && unidadeSelecionada) {
      fetchStats()
    }
  }, [gestor, unidadeSelecionada])

  useEffect(() => {
    console.log('Estado do dialog mudou:', dialogOpen)
  }, [dialogOpen])

  if (!gestor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">
                  {gestor.name} {gestor.lastName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestor de {gestor.unidades.length} {gestor.unidades.length === 1 ? 'unidade' : 'unidades'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Unidades e Badges */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Minhas Unidades:</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Visualizando:</span>
                <Select
                  value={unidadeSelecionada?.toString()}
                  onValueChange={(value) => setUnidadeSelecionada(Number(value))}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gestor.unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id.toString()}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {gestor.unidades.map((unidade) => (
                <Badge 
                  key={unidade.id}
                  variant={unidade.id === unidadeSelecionada ? "default" : "outline"}
                  className={`flex items-center gap-1 cursor-pointer transition-all ${
                    unidade.id === unidadeSelecionada 
                      ? "bg-purple-600 text-white border-purple-600" 
                      : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  }`}
                  onClick={() => setUnidadeSelecionada(unidade.id)}
                >
                  <Building2 className="h-3 w-3" />
                  {unidade.nome}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center text-red-700">
                <p className="font-medium">Erro ao carregar dados</p>
                <p className="text-sm">{error}</p>
                <Button onClick={fetchStats} className="mt-4">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : stats ? (
          <div className="space-y-6">
            {/* Resumo da Unidade */}
            <ResumoUnidades 
              mes={new Date().getMonth() + 1}
              ano={new Date().getFullYear()}
              vendedorId={null}
              unidadeId={unidadeSelecionada}
            />

            {/* Meta Total */}
            {stats.meta_total > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Meta da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(stats.meta_total)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Meta estabelecida
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-purple-600">
                        {stats.meta_total > 0 
                          ? ((stats.valor_ganho / stats.meta_total) * 100).toFixed(1)
                          : '0.0'}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Atingida
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance por Vendedor */}
            {stats.vendedores && stats.vendedores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Vendedor</th>
                          <th className="text-center py-3 px-2">Criadas</th>
                          <th className="text-center py-3 px-2">Ganhas</th>
                          <th className="text-right py-3 px-2">Valor Ganho</th>
                          <th className="text-center py-3 px-2">Perdidas</th>
                          <th className="text-center py-3 px-2">Abertas</th>
                          <th className="text-right py-3 px-2">Meta</th>
                          <th className="text-center py-3 px-2">% Meta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.vendedores.map((vendedor) => {
                          const percentMeta = vendedor.meta > 0 
                            ? (vendedor.valor_ganho / vendedor.meta) * 100 
                            : 0
                          
                          return (
                            <tr key={vendedor.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2 font-medium">
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    console.log('Clicou no vendedor:', vendedor.name)
                                    handleVerOportunidades(vendedor)
                                  }}
                                  className="flex items-center gap-1 text-purple-600 hover:text-purple-800 hover:underline transition-colors cursor-pointer"
                                >
                                  {vendedor.name} {vendedor.lastName}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </td>
                              <td className="text-center py-3 px-2">
                                {vendedor.oportunidades_criadas}
                              </td>
                              <td className="text-center py-3 px-2 text-emerald-600 font-semibold">
                                {vendedor.oportunidades_ganhas}
                              </td>
                              <td className="text-right py-3 px-2 text-emerald-600">
                                {formatCurrency(vendedor.valor_ganho)}
                              </td>
                              <td className="text-center py-3 px-2 text-red-600">
                                {vendedor.oportunidades_perdidas}
                              </td>
                              <td className="text-center py-3 px-2 text-yellow-600">
                                {vendedor.oportunidades_abertas}
                              </td>
                              <td className="text-right py-3 px-2">
                                {vendedor.meta > 0 ? formatCurrency(vendedor.meta) : '-'}
                              </td>
                              <td className="text-center py-3 px-2">
                                {vendedor.meta > 0 ? (
                                  <Badge 
                                    variant={percentMeta >= 100 ? "default" : "outline"}
                                    className={
                                      percentMeta >= 100 
                                        ? "bg-emerald-600" 
                                        : percentMeta >= 75 
                                        ? "bg-yellow-500 text-white border-yellow-500" 
                                        : "text-gray-600"
                                    }
                                  >
                                    {percentMeta.toFixed(0)}%
                                  </Badge>
                                ) : '-'}
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

            {/* Funil de Vendas */}
            {stats.etapas_funil && stats.etapas_funil.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Funil de Vendas da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          {stats.etapas_funil.map((etapa) => {
                            const maxValue = Math.max(...stats.etapas_funil.map(e => e.total_oportunidades))
                            const intensity = maxValue > 0 ? etapa.total_oportunidades / maxValue : 0
                            
                            let bgColor = 'bg-gray-50'
                            let textColor = 'text-gray-500'
                            
                            if (intensity > 0.9) {
                              bgColor = 'bg-red-600'
                              textColor = 'text-white'
                            } else if (intensity > 0.8) {
                              bgColor = 'bg-red-500'
                              textColor = 'text-white'
                            } else if (intensity > 0.7) {
                              bgColor = 'bg-orange-500'
                              textColor = 'text-white'
                            } else if (intensity > 0.6) {
                              bgColor = 'bg-orange-400'
                              textColor = 'text-white'
                            } else if (intensity > 0.5) {
                              bgColor = 'bg-yellow-500'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.4) {
                              bgColor = 'bg-yellow-400'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.3) {
                              bgColor = 'bg-green-400'
                              textColor = 'text-white'
                            } else if (intensity > 0.2) {
                              bgColor = 'bg-green-300'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0.1) {
                              bgColor = 'bg-blue-300'
                              textColor = 'text-gray-800'
                            } else if (intensity > 0) {
                              bgColor = 'bg-blue-200'
                              textColor = 'text-gray-800'
                            }
                            
                            return (
                              <td 
                                key={etapa.id} 
                                className={`text-center px-1 py-2 border border-gray-200 ${bgColor}`}
                                title={`${etapa.nome_coluna}\nNegócios: ${etapa.total_oportunidades}\nValor: ${formatCurrency(etapa.valor_total)}`}
                              >
                                <div className={`font-bold ${textColor} text-xs`}>
                                  {etapa.total_oportunidades}
                                </div>
                                <div className={`text-[8px] ${textColor} opacity-80 truncate`} title={etapa.nome_coluna}>
                                  {etapa.nome_coluna.replace(/^\d+\.\s*/, '').substring(0, 4)}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>

      {/* Dialog de Oportunidades */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        console.log('Dialog onOpenChange:', open)
        setDialogOpen(open)
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Oportunidades de {vendedorSelecionado?.name} {vendedorSelecionado?.lastName}
            </DialogTitle>
          </DialogHeader>
          
          {loadingOportunidades ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : oportunidades.length > 0 ? (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold">{oportunidades.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Ganhas</p>
                          <p className="text-lg font-bold text-emerald-600">
                            {oportunidades.filter(o => o.ganho === 1).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="h-4 w-4" />
                        <div>
                          <p className="text-xs text-muted-foreground">Perdidas</p>
                          <p className="text-lg font-bold text-red-600">
                            {oportunidades.filter(o => o.perda === 1).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de Oportunidades */}
                <div className="space-y-2">
                  {oportunidades.map((oportunidade) => (
                    <Card key={oportunidade.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-sm">{oportunidade.titulo}</h4>
                              {oportunidade.ganho === 1 && (
                                <Badge className="bg-emerald-600">Ganha</Badge>
                              )}
                              {oportunidade.perda === 1 && (
                                <Badge variant="destructive">Perdida</Badge>
                              )}
                              {oportunidade.ganho === 0 && oportunidade.perda === 0 && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Aberta
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(oportunidade.valor)}
                              </span>
                              <span>Etapa: {oportunidade.coluna_nome}</span>
                              <span>
                                Criada: {new Date(oportunidade.created_date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {oportunidade.motivo_perda && (
                              <p className="text-xs text-red-600 mt-1">
                                Motivo: {oportunidade.motivo_perda}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma oportunidade encontrada para este vendedor no mês atual.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
