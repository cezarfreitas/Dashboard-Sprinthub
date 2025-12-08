"use client"

import { useState, useEffect } from "react"
import { HeaderGestor } from "@/components/header_gestor"
import { AppFooter } from "@/components/app-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, TrendingUp, AlertTriangle, Filter, X } from "lucide-react"

interface DistribuicaoFaixa {
  faixa: string
  quantidade: number
  valor_total: number
  percentual: number
}

interface Unidade {
  id: number
  nome: string
}

interface Vendedor {
  id: number
  name: string
  lastName: string
}

interface Funil {
  id: number
  funil_nome: string
}

export default function GestorOportunidadesParadasPage() {
  const [loading, setLoading] = useState(true)
  const [distribuicao, setDistribuicao] = useState<DistribuicaoFaixa[]>([])
  const [resumo, setResumo] = useState<{
    total_oportunidades: number
    valor_total: number
    valor_medio: number
    media_dias_parados: number
  } | null>(null)

  // Filtros
  const [diasMinimo, setDiasMinimo] = useState('7')
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>('all')
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>('all')
  const [funilSelecionado, setFunilSelecionado] = useState<string>('all')

  // Listas para os selects
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [funis, setFunis] = useState<Funil[]>([])

  useEffect(() => {
    loadFilters()
  }, [])

  useEffect(() => {
    loadData()
  }, [diasMinimo, unidadeSelecionada, vendedorSelecionado, funilSelecionado])

  const loadFilters = async () => {
    try {
      const [unidadesRes, vendedoresRes, funisRes] = await Promise.all([
        fetch('/api/unidades'),
        fetch('/api/vendedores'),
        fetch('/api/funis')
      ])

      const [unidadesData, vendedoresData, funisData] = await Promise.all([
        unidadesRes.json(),
        vendedoresRes.json(),
        funisRes.json()
      ])

      if (unidadesData.success) setUnidades(unidadesData.unidades || [])
      if (vendedoresData.success) setVendedores(vendedoresData.vendedores || [])
      if (funisData.success) setFunis(funisData.funis || [])
    } catch (error) {
      console.error('Erro ao carregar filtros:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      params.append('dias', diasMinimo)
      if (unidadeSelecionada && unidadeSelecionada !== 'all') params.append('unidade_id', unidadeSelecionada)
      if (vendedorSelecionado && vendedorSelecionado !== 'all') params.append('vendedor', vendedorSelecionado)
      if (funilSelecionado && funilSelecionado !== 'all') params.append('funil_id', funilSelecionado)

      const response = await fetch(`/api/oportunidades-paradas?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setDistribuicao(data.distribuicao || [])
        setResumo(data.resumo)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const limparFiltros = () => {
    setDiasMinimo('7')
    setUnidadeSelecionada('all')
    setVendedorSelecionado('all')
    setFunilSelecionado('all')
  }

  const getFaixaColor = (faixa: string) => {
    switch (faixa) {
      case '0-7':
        return 'bg-green-100 text-green-800 border-green-300'
      case '8-15':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case '16-30':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case '30+':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getFaixaIcon = (faixa: string) => {
    switch (faixa) {
      case '0-7':
        return <Clock className="h-4 w-4" />
      case '8-15':
        return <TrendingUp className="h-4 w-4" />
      case '16-30':
      case '30+':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderGestor />
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-20 py-6 flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Oportunidades Paradas</h1>
          <p className="text-muted-foreground mt-1">
            Análise de oportunidades sem atualização nos últimos dias
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filtros</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={limparFiltros}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Dias Mínimo */}
              <div className="space-y-2">
                <Label htmlFor="dias">Dias Parado (mínimo)</Label>
                <Select value={diasMinimo} onValueChange={setDiasMinimo}>
                  <SelectTrigger id="dias">
                    <SelectValue placeholder="Selecione os dias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1+ dias</SelectItem>
                    <SelectItem value="3">3+ dias</SelectItem>
                    <SelectItem value="7">7+ dias</SelectItem>
                    <SelectItem value="15">15+ dias</SelectItem>
                    <SelectItem value="30">30+ dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Unidade */}
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select value={unidadeSelecionada} onValueChange={setUnidadeSelecionada}>
                  <SelectTrigger id="unidade">
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id.toString()}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendedor */}
              <div className="space-y-2">
                <Label htmlFor="vendedor">Vendedor</Label>
                <Select value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
                  <SelectTrigger id="vendedor">
                    <SelectValue placeholder="Todos os vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {vendedores.map((vendedor) => (
                      <SelectItem 
                        key={vendedor.id} 
                        value={`${vendedor.name} ${vendedor.lastName}`}
                      >
                        {vendedor.name} {vendedor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Funil */}
              <div className="space-y-2">
                <Label htmlFor="funil">Funil</Label>
                <Select value={funilSelecionado} onValueChange={setFunilSelecionado}>
                  <SelectTrigger id="funil">
                    <SelectValue placeholder="Todos os funis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {funis.map((funil) => (
                      <SelectItem key={funil.id} value={funil.id.toString()}>
                        {funil.funil_nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            {resumo && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Paradas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{resumo.total_oportunidades}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Oportunidades sem atualização
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Valor em Risco</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      R$ {(resumo.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor total das oportunidades
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Ticket Médio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      R$ {(resumo.valor_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor médio por oportunidade
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tempo Médio Parado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {resumo.media_dias_parados} dias
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Média de dias sem atualização
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Card de Distribuição por Faixas */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tempo Parado</CardTitle>
                <CardDescription>
                  Oportunidades agrupadas por quantidade de dias sem atualização
                </CardDescription>
              </CardHeader>
              <CardContent>
                {distribuicao.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma oportunidade parada encontrada
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {distribuicao.map((item) => (
                      <div
                        key={item.faixa}
                        className={`p-4 rounded-lg border-2 ${getFaixaColor(item.faixa)}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getFaixaIcon(item.faixa)}
                            <span className="font-semibold text-lg">
                              {item.faixa} dias
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {item.percentual}%
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm opacity-80">Quantidade:</span>
                            <span className="font-bold text-lg">{item.quantidade}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm opacity-80">Valor Total:</span>
                            <span className="font-semibold">
                              R$ {item.valor_total.toLocaleString('pt-BR', { 
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0 
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Barra de progresso */}
                        <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-current opacity-60"
                            style={{ width: `${item.percentual}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  )
}

