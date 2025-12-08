"use client"

import { useState, useEffect, useCallback } from "react"
import { HeaderGestor } from "@/components/header_gestor"
import { AppFooter } from "@/components/app-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, TrendingUp, AlertTriangle, User, TrendingDown, DollarSign } from "lucide-react"

interface DistribuicaoFaixa {
  faixa: string
  quantidade: number
  valor_total: number
  percentual: number
}

interface DistribuicaoTempo {
  faixa: string
  quantidade: number
  quantidade_com_valor: number
  quantidade_sem_valor: number
  valor_total: number
  valor_medio: number
  dias_medio: number
}

interface Etapa {
  coluna_id: number
  etapa_nome: string
  sequencia: number
  total_quantidade: number
  total_quantidade_com_valor: number
  total_quantidade_sem_valor: number
  total_valor: number
  valor_medio: number
  dias_mais_recente: number
  dias_mais_antiga: number
  dias_medio: number
  distribuicao_tempo: DistribuicaoTempo[]
}

interface Funil {
  funil_id: number
  funil_nome: string
  total_oportunidades: number
  valor_total: number
  percentual_vendedor: number
  etapas: Etapa[]
}

interface VendedorGranularidade {
  vendedor_id: number
  vendedor_nome: string
  unidade_nome: string
  total_oportunidades: number
  oportunidades_com_valor: number
  oportunidades_sem_valor: number
  valor_total: number
  valor_medio: number
  percentual_total: number
  funis: Funil[]
}

interface ResumoAPI {
  total_oportunidades_abertas: number
  oportunidades_com_valor: number
  oportunidades_sem_valor: number
  valor_total: number
  valor_medio: number
  total_vendedores: number
}

interface Unidade {
  id: number
  nome: string
  grupo: {
    id: number
    nome: string
  } | null
  department_id: number | null
  vendedores: Array<{
    id: number
    nome: string
  }>
  gestores: Array<{
    id: number
    nome: string
  }>
}

interface OportunidadesParadasUnidade {
  unidade_id: number
  resumo: {
    total_oportunidades: number
    valor_total: number
    valor_medio: number
    media_dias_parados: number
  }
  distribuicao: Array<{
    faixa: string
    quantidade: number
    valor_total: number
    percentual: number
  }>
  alertas_vendedor: Array<{
    vendedor: string
    nome: string
    total_paradas: number
    valor_em_risco: number
    media_dias_parados: number
    pior_caso_dias: number
  }>
}

export default function GestorOportunidadesParadasPage() {
  const [loading, setLoading] = useState(true)
  const [distribuicao, setDistribuicao] = useState<DistribuicaoFaixa[]>([])
  const [resumo, setResumo] = useState<ResumoAPI | null>(null)
  const [granularidade, setGranularidade] = useState<VendedorGranularidade[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [oportunidadesPorUnidade, setOportunidadesPorUnidade] = useState<Map<number, OportunidadesParadasUnidade>>(new Map())

  // Gestor logado
  const [gestorUnidadeId, setGestorUnidadeId] = useState<number | null>(null)
  const [gestorUnidadesIds, setGestorUnidadesIds] = useState<number[]>([])

  useEffect(() => {
    // Carregar dados do gestor do localStorage
    const gestorData = localStorage.getItem('gestor')
    if (gestorData) {
      try {
        const gestor = JSON.parse(gestorData)
        const unidadeId = gestor.unidade_principal?.id
        const unidadesIds = gestor.unidades?.map((u: any) => u.id) || []
        
        if (unidadeId) {
          setGestorUnidadeId(unidadeId)
        }
        if (unidadesIds.length > 0) {
          setGestorUnidadesIds(unidadesIds)
        }
      } catch (error) {
        // Erro ao carregar dados do gestor
      }
    }
  }, [])

  const loadUnidades = useCallback(async () => {
    if (gestorUnidadesIds.length === 0) return
    
    try {
      const unidadesParam = gestorUnidadesIds.join(',')
      const response = await fetch(`/api/vendedores/lista?unidades=${unidadesParam}`)
      const data = await response.json()
      
      if (data.success) {
        setUnidades(data.unidades || [])
        
        // Carregar análise de oportunidades paradas para cada unidade
        const oportunidadesMap = new Map<number, OportunidadesParadasUnidade>()
        
        await Promise.all(
          (data.unidades || []).map(async (unidade: Unidade) => {
            try {
              const params = new URLSearchParams()
              params.append('dias', '7')
              params.append('unidade_id', unidade.id.toString())
              
              const oportunidadesResponse = await fetch(`/api/oportunidades-paradas?${params.toString()}`)
              const oportunidadesData = await oportunidadesResponse.json()
              
              if (oportunidadesData.success) {
                oportunidadesMap.set(unidade.id, {
                  unidade_id: unidade.id,
                  resumo: oportunidadesData.resumo || {
                    total_oportunidades: 0,
                    valor_total: 0,
                    valor_medio: 0,
                    media_dias_parados: 0
                  },
                  distribuicao: oportunidadesData.distribuicao || [],
                  alertas_vendedor: oportunidadesData.alertas_vendedor || []
                })
              }
            } catch (error) {
              // Erro ao carregar oportunidades da unidade
            }
          })
        )
        
        setOportunidadesPorUnidade(oportunidadesMap)
      }
    } catch (error) {
      // Erro ao carregar unidades
    }
  }, [gestorUnidadesIds])

  const loadData = useCallback(async () => {
    if (gestorUnidadesIds.length === 0) return
    
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      params.append('unidades', gestorUnidadesIds.join(','))

      const response = await fetch(`/api/oportunidades-paradas?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setDistribuicao(Array.isArray(data.distribuicao_por_tempo) ? data.distribuicao_por_tempo : [])
        setGranularidade(Array.isArray(data.granularidade) ? data.granularidade : [])
        setResumo(data.resumo || null)
      }
    } catch (error) {
      // Error silently handled
    } finally {
      setLoading(false)
    }
  }, [gestorUnidadesIds])

  useEffect(() => {
    if (gestorUnidadesIds.length > 0) {
      loadUnidades()
    }
  }, [gestorUnidadesIds, loadUnidades])

  useEffect(() => {
    if (gestorUnidadesIds.length > 0) {
      loadData()
    }
  }, [gestorUnidadesIds, loadData])

  const getFaixaColor = (faixa: string) => {
    switch (faixa) {
      case '0-7':
        return 'bg-green-100 text-green-800 border-green-300'
      case '8-15':
        return 'bg-lime-100 text-lime-800 border-lime-300'
      case '16-30':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case '31-45':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case '46-60':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case '61-90':
        return 'bg-red-100 text-red-800 border-red-300'
      case '91-120':
        return 'bg-red-200 text-red-900 border-red-400'
      case '121-180':
        return 'bg-red-300 text-red-900 border-red-500'
      case '181-365':
        return 'bg-purple-200 text-purple-900 border-purple-400'
      case '365+':
        return 'bg-purple-300 text-purple-900 border-purple-500'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getFaixaIcon = (faixa: string) => {
    switch (faixa) {
      case '0-7':
      case '8-15':
        return <Clock className="h-4 w-4" />
      case '16-30':
      case '31-45':
        return <TrendingUp className="h-4 w-4" />
      case '46-60':
      case '61-90':
      case '91-120':
        return <TrendingDown className="h-4 w-4" />
      case '121-180':
      case '181-365':
      case '365+':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderGestor />
      <div className="max-w-[1920px] mx-auto px-6 py-4 flex-1">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Oportunidades Abertas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise detalhada de oportunidades em andamento
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground text-sm">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Cards de Resumo + Distribuição por Tempo - Layout Horizontal */}
            {resumo && (
              <div className="grid grid-cols-12 gap-3">
                {/* Resumo Compacto */}
                <div className="col-span-12 lg:col-span-4">
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Resumo Geral</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between py-1.5 border-b">
                        <span className="text-xs text-muted-foreground">Total Abertas</span>
                        <span className="text-lg font-bold text-blue-600">{resumo.total_oportunidades_abertas}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 rounded p-2 border border-green-200">
                          <div className="text-[10px] text-green-700 mb-0.5">Com Valor</div>
                          <div className="text-xl font-bold text-green-900">{resumo.oportunidades_com_valor}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-2 border border-gray-200">
                          <div className="text-[10px] text-gray-700 mb-0.5">Sem Valor</div>
                          <div className="text-xl font-bold text-gray-900">{resumo.oportunidades_sem_valor}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b">
                        <span className="text-xs text-muted-foreground">Valor Total</span>
                        <span className="text-base font-bold text-purple-600">
                          R$ {((resumo.valor_total || 0) / 1000).toFixed(0)}k
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-muted-foreground">Ticket Médio</span>
                        <span className="text-base font-bold text-orange-600">
                          R$ {((resumo.valor_medio || 0) / 1000).toFixed(1)}k
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-t">
                        <span className="text-xs text-muted-foreground">Total Vendedores</span>
                        <Badge variant="outline">{resumo.total_vendedores}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Distribuição por Tempo - Compacta */}
                <div className="col-span-12 lg:col-span-8">
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Distribuição por Tempo de Criação</CardTitle>
                      <CardDescription className="text-[10px]">
                        Oportunidades agrupadas por dias desde a criação
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {distribuicao.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          Nenhuma oportunidade encontrada
                        </div>
                      ) : (
                        <div className="grid grid-cols-5 gap-2">
                          {distribuicao.map((item) => (
                            <div
                              key={item.faixa}
                              className={`rounded-lg border-2 p-2 ${getFaixaColor(item.faixa)}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                  {getFaixaIcon(item.faixa)}
                                  <span className="font-bold text-xs">{item.faixa}d</span>
                                </div>
                                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                  {item.percentual}%
                                </Badge>
                              </div>
                              <div className="text-2xl font-bold mb-0.5">{item.quantidade}</div>
                              <div className="text-[10px] opacity-80">
                                R$ {(item.valor_total / 1000).toFixed(0)}k
                              </div>
                              <div className="mt-1 bg-white/50 rounded-full h-1 overflow-hidden">
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
              </div>
            )}

            {/* Análise de Oportunidades Paradas por Unidade */}
            {unidades.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Análise por Unidade</CardTitle>
                  <CardDescription>
                    Oportunidades paradas e análise de vendedores por unidade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {unidades.map((unidade) => {
                      const oportunidades = oportunidadesPorUnidade.get(unidade.id)
                      const temOportunidadesParadas = oportunidades && oportunidades.resumo.total_oportunidades > 0
                      
                      return (
                        <Card key={unidade.id} className={`border-l-4 ${temOportunidadesParadas ? 'border-l-red-500' : 'border-l-green-500'}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg font-bold">
                                  {unidade.nome}
                                </CardTitle>
                                {unidade.grupo && (
                                  <CardDescription className="text-xs mt-1">
                                    Grupo: {unidade.grupo.nome}
                                  </CardDescription>
                                )}
                              </div>
                              {oportunidades && (
                                <Badge 
                                  variant={temOportunidadesParadas ? "destructive" : "default"}
                                  className="text-xs"
                                >
                                  {oportunidades.resumo.total_oportunidades} paradas
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Resumo de Oportunidades Paradas */}
                            {oportunidades && temOportunidadesParadas && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Total Paradas</div>
                                  <div className="text-2xl font-bold text-red-600">
                                    {oportunidades.resumo.total_oportunidades}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Valor em Risco</div>
                                  <div className="text-lg font-bold text-red-600">
                                    R$ {(oportunidades.resumo.valor_total || 0).toLocaleString('pt-BR', { 
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0 
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Ticket Médio</div>
                                  <div className="text-lg font-bold text-orange-600">
                                    R$ {(oportunidades.resumo.valor_medio || 0).toLocaleString('pt-BR', { 
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0 
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Média Dias</div>
                                  <div className="text-2xl font-bold text-orange-600">
                                    {Math.round(oportunidades.resumo.media_dias_parados)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Distribuição por Faixa */}
                            {oportunidades && oportunidades.distribuicao.length > 0 && (
                              <div>
                                <div className="text-sm font-semibold text-muted-foreground mb-2">
                                  Distribuição por Tempo Parado:
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {oportunidades.distribuicao.map((dist) => (
                                    <div 
                                      key={dist.faixa}
                                      className={`p-2 rounded-lg border ${getFaixaColor(dist.faixa)}`}
                                    >
                                      <div className="flex items-center gap-1 mb-1">
                                        {getFaixaIcon(dist.faixa)}
                                        <span className="text-xs font-semibold">{dist.faixa}d</span>
                                      </div>
                                      <div className="text-lg font-bold">{dist.quantidade}</div>
                                      <div className="text-xs opacity-80">
                                        R$ {(dist.valor_total || 0).toLocaleString('pt-BR', { 
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 0 
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Vendedores com Oportunidades Paradas */}
                            {oportunidades && oportunidades.alertas_vendedor.length > 0 && (
                              <div>
                                <div className="text-sm font-semibold text-muted-foreground mb-2">
                                  Vendedores com Alertas:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {oportunidades.alertas_vendedor.map((alerta, index) => (
                                    <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">{alerta.nome}</span>
                                        <Badge variant="destructive" className="text-xs">
                                          {alerta.total_paradas}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="text-muted-foreground">Risco:</span>
                                          <div className="font-semibold text-red-600">
                                            R$ {(alerta.valor_em_risco || 0).toLocaleString('pt-BR', { 
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 0 
                                            })}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Pior caso:</span>
                                          <div className="font-semibold">{alerta.pior_caso_dias}d</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Vendedores e Gestores da Unidade */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t">
                              {unidade.vendedores.length > 0 && (
                                <div>
                                  <div className="text-sm font-semibold text-muted-foreground mb-2">
                                    Vendedores ({unidade.vendedores.length}):
                                  </div>
                                  <div className="space-y-1">
                                    {unidade.vendedores.map((vendedor) => (
                                      <div key={vendedor.id} className="flex items-center gap-2 text-sm">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        <span>{vendedor.nome}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {unidade.gestores.length > 0 && (
                                <div>
                                  <div className="text-sm font-semibold text-muted-foreground mb-2">
                                    Gestores ({unidade.gestores.length}):
                                  </div>
                                  <div className="space-y-1">
                                    {unidade.gestores.map((gestor) => (
                                      <div key={gestor.id} className="flex items-center gap-2 text-sm">
                                        <User className="h-3 w-3 text-blue-600" />
                                        <span className="text-blue-600 font-medium">{gestor.nome}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Mensagem quando não há oportunidades paradas */}
                            {oportunidades && !temOportunidadesParadas && (
                              <div className="text-center py-4 text-green-600 font-medium">
                                ✅ Nenhuma oportunidade parada nesta unidade
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Granularidade: Vendedor → Funil → Etapa - Layout em Grid */}
            {granularidade.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Análise Detalhada por Vendedor</CardTitle>
                  <CardDescription className="text-[10px]">
                    Detalhamento por vendedor, funil e etapa com distribuição temporal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {granularidade.map((vendedor) => (
                      <div key={vendedor.vendedor_id} className="border border-gray-200 rounded-lg bg-gradient-to-br from-white to-gray-50">
                        {/* Header do Vendedor - Compacto */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5" />
                              <div>
                                <div className="font-bold text-xs">{vendedor.vendedor_nome}</div>
                                <div className="text-[10px] opacity-90">{vendedor.unidade_nome}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">{vendedor.total_oportunidades}</div>
                              <div className="text-[10px] opacity-90">
                                R$ {((vendedor.valor_total || 0) / 1000).toFixed(0)}k
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Funis do Vendedor */}
                        <div className="p-2 space-y-2">
                          {vendedor.funis.map((funil) => (
                            <div key={funil.funil_id} className="border border-gray-200 rounded bg-white">
                              <div className="bg-gray-100 px-2 py-1 flex items-center justify-between rounded-t">
                                <span className="font-semibold text-[11px] text-gray-700">
                                  📊 {funil.funil_nome}
                                </span>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  {funil.total_oportunidades} oprt.
                                </Badge>
                              </div>
                              
                              {/* Etapas do Funil - Lista Compacta */}
                              <div className="p-1.5 space-y-1">
                                {funil.etapas.map((etapa) => (
                                  <div key={etapa.coluna_id} className="bg-gray-50 rounded border border-gray-200">
                                    <div className="px-2 py-1 flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[11px] truncate text-gray-900">
                                          {etapa.etapa_nome}
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] text-gray-600 mt-0.5">
                                          <span className="flex items-center gap-0.5">
                                            <DollarSign className="h-2.5 w-2.5" />
                                            {((etapa.total_valor || 0) / 1000).toFixed(0)}k
                                          </span>
                                          <span className="flex items-center gap-0.5">
                                            <Clock className="h-2.5 w-2.5" />
                                            {etapa.dias_medio}d
                                          </span>
                                          <span className="flex items-center gap-0.5 text-red-600">
                                            <AlertTriangle className="h-2.5 w-2.5" />
                                            {etapa.dias_mais_antiga}d
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <Badge className="text-[10px] h-4 px-1.5 bg-blue-600">
                                          {etapa.total_quantidade}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    {/* Distribuição por Tempo - Barras Coloridas */}
                                    {etapa.distribuicao_tempo.length > 0 && (
                                      <div className="px-2 pb-1">
                                        <div className="flex gap-[2px] h-3 rounded overflow-hidden">
                                          {etapa.distribuicao_tempo.map((dist) => {
                                            const percentual = etapa.total_quantidade > 0 
                                              ? (dist.quantidade / etapa.total_quantidade) * 100 
                                              : 0
                                            return (
                                              <div
                                                key={dist.faixa}
                                                className={`${getFaixaColor(dist.faixa)} flex items-center justify-center`}
                                                style={{ width: `${percentual}%` }}
                                                title={`${dist.faixa}d: ${dist.quantidade} (${percentual.toFixed(0)}%)`}
                                              >
                                                {dist.quantidade > 0 && (
                                                  <span className="text-[8px] font-bold leading-none">
                                                    {dist.quantidade}
                                                  </span>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </div>
      <AppFooter />
    </div>
  )
}

