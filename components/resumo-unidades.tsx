"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Building2, TrendingUp, DollarSign, XCircle, Clock, Target, Users } from "lucide-react"

interface VendedorMatriz {
  id: number
  nome: string
  criadas: number
  ganhas: number
  perdidas: number
  abertas: number
  valor: number
  meta: number
  won_time_dias: number | null
  taxa_conversao?: number
  ticket_medio?: number
  isGestor?: boolean
  // Métricas de interação
  interacao?: {
    iniciados: number
    finalizados: number
    ignorados: number
    enviadas: number
    recebidas: number
    transferidos: number
  }
}

interface UnidadeResumo {
  id: number
  nome: string
  total_vendedores: number
  vendedores_na_fila: number
  nome_gestor: string | null
  oportunidades_criadas: number
  oportunidades_ganhas: number
  valor_ganho: number
  oportunidades_perdidas: number
  oportunidades_abertas: number
  meta_mes: number
  vendedores: VendedorMatriz[]
  comparacao_mes_anterior?: number
  comparacao_ano_anterior?: number
}

interface ApiResponse {
  success: boolean
  mes: number
  ano: number
  unidades: UnidadeResumo[]
}

interface ResumoUnidadesProps {
  mes?: number
  ano?: number
  vendedorId?: number | null
  unidadeId?: number | null
}

export default function ResumoUnidades({ mes, ano, vendedorId, unidadeId }: ResumoUnidadesProps) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getMesNome = (mes: number): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1] || ''
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (mes) params.append('mes', mes.toString())
      if (ano) params.append('ano', ano.toString())
      if (vendedorId) params.append('vendedorId', vendedorId.toString())
      if (unidadeId) params.append('unidadeId', unidadeId.toString())
      
      const url = `/api/unidades/resumo${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao buscar dados')
      }
      
      setData(result)

    } catch (err) {
      console.error('Erro ao buscar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [mes, ano, vendedorId, unidadeId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Resumo por Unidade</h2>
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <div className="grid gap-4 grid-cols-1">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Resumo por Unidade</h2>
          <button 
            onClick={fetchData}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4 inline mr-1" />
            Tentar novamente
          </button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center text-red-700">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Erro ao carregar dados</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || data.unidades.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Resumo por Unidade</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhuma unidade encontrada</p>
              <p className="text-sm">Não há unidades cadastradas no sistema</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resumo por Unidade</h2>
          <p className="text-sm text-muted-foreground">
            {getMesNome(data.mes)} {data.ano}
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
        Atualizar
      </button>
      </div>

      <div className="grid gap-4 grid-cols-1">
        {data.unidades.map((unidade) => {
          const percentualMeta = unidade.meta_mes > 0 
            ? (unidade.valor_ganho / unidade.meta_mes) * 100 
            : 0

          return (
            <Card key={unidade.id} className="hover:shadow-xl transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">{unidade.nome}</CardTitle>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className="font-medium">{unidade.total_vendedores} vendedor{unidade.total_vendedores !== 1 ? 'es' : ''}</span>
                        </div>
                        <span className="text-green-600 font-semibold">• {unidade.vendedores_na_fila} na fila</span>
                        {unidade.nome_gestor && (
                          <span className="text-blue-600 font-semibold">• Gestor: {unidade.nome_gestor}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Meta do Mês */}
                {unidade.meta_mes > 0 && (
                  <div className="p-4 rounded-xl border-2 border-purple-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <span className="text-purple-700 font-medium">Meta: </span>
                            <span className="font-bold text-purple-900 text-base">{formatCurrency(unidade.meta_mes)}</span>
                          </div>
                          <div>
                            <span className="text-purple-700 font-medium">Realizado: </span>
                            <span className="font-bold text-purple-900 text-base">{formatCurrency(unidade.valor_ganho)}</span>
                            <span className={`ml-2 text-sm font-semibold ${
                              percentualMeta >= 100 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              ({percentualMeta.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Comparação com mês anterior */}
                        {unidade.comparacao_mes_anterior !== undefined && (
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            unidade.comparacao_mes_anterior >= 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {unidade.comparacao_mes_anterior >= 0 ? '↑' : '↓'} {Math.abs(unidade.comparacao_mes_anterior).toFixed(1)}%
                            <div className="text-[10px] font-normal opacity-75">vs mês ant.</div>
                          </div>
                        )}
                        {/* Comparação com ano anterior */}
                        {unidade.comparacao_ano_anterior !== undefined && (
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            unidade.comparacao_ano_anterior >= 0 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {unidade.comparacao_ano_anterior >= 0 ? '↑' : '↓'} {Math.abs(unidade.comparacao_ano_anterior).toFixed(1)}%
                            <div className="text-[10px] font-normal opacity-75">vs ano ant.</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  {/* COLUNA 1: Performance */}
                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 text-base font-bold text-gray-800 pb-3 border-b-2 border-blue-500">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Performance por Vendedor
                    </div>

                {/* Matriz de Vendedores */}
                {unidade.vendedores && unidade.vendedores.length > 0 && (
                  <div>
                    <div className="bg-white rounded-lg shadow-sm">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-700">
                            <th className="text-left px-2 py-2.5 font-semibold text-[11px]">Vendedor</th>
                            <th className="text-center px-1.5 py-2.5 font-semibold text-[11px]">Criados</th>
                            <th className="text-center px-1.5 py-2.5 font-semibold text-[11px]">Per.</th>
                            <th className="text-center px-1.5 py-2.5 font-semibold text-[11px]">Gan.</th>
                            <th className="text-center px-1.5 py-2.5 font-semibold text-[11px]">Abe.</th>
                            <th className="text-right px-1.5 py-2.5 font-semibold text-[11px]">Valor / %</th>
                            <th className="text-right px-1.5 py-2.5 font-semibold text-[11px]">Meta</th>
                            <th className="text-center px-1.5 py-2.5 font-semibold text-[11px]">W.T</th>
                            <th className="text-center px-1.5 py-2.5 font-semibold text-[11px]">T.C%</th>
                            <th className="text-right px-1.5 py-2.5 font-semibold text-[11px]">T.Méd</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unidade.vendedores.map((vendedor, index) => (
                            <tr 
                              key={vendedor.id} 
                              className={`border-b border-gray-100 hover:bg-gray-50 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}
                            >
                              <td className="px-2 py-2 font-medium text-gray-900 truncate max-w-[80px]">
                                <div className="flex items-center gap-1">
                                  {vendedor.nome}
                                  {vendedor.isGestor && (
                                    <span className="text-[8px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                                      G
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center px-1.5 py-2 text-green-600 font-semibold">
                                {vendedor.criadas}
                              </td>
                              <td className="text-center px-1.5 py-2 text-red-600 font-semibold">
                                {vendedor.perdidas}
                              </td>
                              <td className="text-center px-1.5 py-2 text-emerald-600 font-semibold">
                                {vendedor.ganhas}
                              </td>
                              <td className="text-center px-1.5 py-2 text-yellow-600 font-semibold">
                                {vendedor.abertas}
                              </td>
                              <td className="text-right px-1.5 py-2 text-blue-600 font-semibold text-[11px]">
                                <div className="flex items-center justify-end gap-1">
                                  <span>{formatCurrency(vendedor.valor).replace('R$', '').trim()}</span>
                                  {vendedor.meta > 0 && (
                                    <span className={`text-[9px] ${
                                      (vendedor.valor / vendedor.meta) * 100 >= 100 
                                        ? 'text-green-600' 
                                        : 'text-orange-600'
                                    }`}>
                                      ({((vendedor.valor / vendedor.meta) * 100).toFixed(0)}%)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-right px-1.5 py-2 text-purple-600 font-semibold text-[11px]">
                                {formatCurrency(vendedor.meta).replace('R$', '').trim()}
                              </td>
                              <td className="text-center px-1.5 py-2 text-indigo-600 font-semibold">
                                {vendedor.won_time_dias !== null 
                                  ? `${vendedor.won_time_dias}d` 
                                  : '-'}
                              </td>
                              <td className="text-center px-1.5 py-2 text-emerald-600 font-semibold">
                                {vendedor.taxa_conversao !== undefined 
                                  ? `${vendedor.taxa_conversao.toFixed(0)}%` 
                                  : vendedor.criadas > 0 
                                    ? `${((vendedor.ganhas / vendedor.criadas) * 100).toFixed(0)}%`
                                    : '-'}
                              </td>
                              <td className="text-right px-1.5 py-2 text-teal-600 font-semibold text-[11px]">
                                {vendedor.ticket_medio !== undefined 
                                  ? formatCurrency(vendedor.ticket_medio).replace('R$', '').trim()
                                  : vendedor.ganhas > 0
                                    ? formatCurrency(vendedor.valor / vendedor.ganhas).replace('R$', '').trim()
                                    : '-'}
                              </td>
                            </tr>
                          ))}
                          {/* Linha de Resumo/Total */}
                          <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                            <td className="px-2 py-2 text-gray-900">TOTAL</td>
                            <td className="text-center px-1.5 py-2 text-green-700">
                              {unidade.vendedores.reduce((sum, v) => sum + (v.criadas || 0), 0)}
                            </td>
                            <td className="text-center px-1.5 py-2 text-red-700">
                              {unidade.vendedores.reduce((sum, v) => sum + (v.perdidas || 0), 0)}
                            </td>
                            <td className="text-center px-1.5 py-2 text-emerald-700">
                              {unidade.vendedores.reduce((sum, v) => sum + (v.ganhas || 0), 0)}
                            </td>
                            <td className="text-center px-1.5 py-2 text-yellow-700">
                              {unidade.vendedores.reduce((sum, v) => sum + (v.abertas || 0), 0)}
                            </td>
                            <td className="text-right px-1.5 py-2 text-blue-700 text-[11px]">
                              {(() => {
                                const totalValor = unidade.vendedores.reduce((sum, v) => sum + (Number(v.valor) || 0), 0)
                                const totalMeta = unidade.vendedores.reduce((sum, v) => sum + (Number(v.meta) || 0), 0)
                                return (
                                  <div className="flex items-center justify-end gap-1">
                                    <span>{formatCurrency(totalValor).replace('R$', '').trim()}</span>
                                    {totalMeta > 0 && (
                                      <span className={`text-[9px] ${
                                        (totalValor / totalMeta) * 100 >= 100 
                                          ? 'text-green-700' 
                                          : 'text-orange-700'
                                      }`}>
                                        ({((totalValor / totalMeta) * 100).toFixed(0)}%)
                                      </span>
                                    )}
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="text-right px-1.5 py-2 text-purple-700 text-[11px]">
                              {formatCurrency(unidade.vendedores.reduce((sum, v) => sum + (Number(v.meta) || 0), 0)).replace('R$', '').trim()}
                            </td>
                            <td className="text-center px-1.5 py-2 text-indigo-700">
                              {(() => {
                                const vendedoresComWonTime = unidade.vendedores.filter(v => v.won_time_dias !== null && v.won_time_dias > 0)
                                if (vendedoresComWonTime.length === 0) return '-'
                                const mediaWonTime = vendedoresComWonTime.reduce((sum, v) => sum + (v.won_time_dias || 0), 0) / vendedoresComWonTime.length
                                return `${Math.round(mediaWonTime)}d`
                              })()}
                            </td>
                            <td className="text-center px-1.5 py-2 text-emerald-700">
                              {(() => {
                                const totalCriadas = unidade.vendedores.reduce((sum, v) => sum + (v.criadas || 0), 0)
                                const totalGanhas = unidade.vendedores.reduce((sum, v) => sum + (v.ganhas || 0), 0)
                                if (totalCriadas === 0) return '-'
                                return `${((totalGanhas / totalCriadas) * 100).toFixed(0)}%`
                              })()}
                            </td>
                            <td className="text-right px-1.5 py-2 text-teal-700 text-[11px]">
                              {(() => {
                                const totalValor = unidade.vendedores.reduce((sum, v) => sum + (Number(v.valor) || 0), 0)
                                const totalGanhas = unidade.vendedores.reduce((sum, v) => sum + (v.ganhas || 0), 0)
                                if (totalGanhas === 0) return '-'
                                return formatCurrency(totalValor / totalGanhas).replace('R$', '').trim()
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                  </div>

                  {/* COLUNA 2: Atendimentos Whatsapp */}
                  <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 text-base font-bold text-gray-800 pb-3 border-b-2 border-green-500">
                      <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      Atendimentos Whatsapp
                    </div>
                    
                    {unidade.vendedores && unidade.vendedores.length > 0 && (
                      <div className="bg-white rounded-lg shadow-sm">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 text-gray-700">
                              <th className="text-left p-2.5 font-semibold text-[11px]">Vendedor</th>
                              <th className="text-center p-2.5 font-semibold text-[11px]">Iniciados</th>
                              <th className="text-center p-2.5 font-semibold text-[11px]">Finalizados</th>
                              <th className="text-center p-2.5 font-semibold text-[11px]">Ignorados</th>
                              <th className="text-center p-2.5 font-semibold text-[11px]">Enviadas</th>
                              <th className="text-center p-2.5 font-semibold text-[11px]">Recebidas</th>
                              <th className="text-center p-2.5 font-semibold text-[11px]">Transferidos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unidade.vendedores.map((vendedor, index) => {
                              // Dados mockados (serão substituídos pela API)
                              const interacao = vendedor.interacao || {
                                iniciados: 112,
                                finalizados: 110,
                                ignorados: 24,
                                enviadas: 1856,
                                recebidas: 1287,
                                transferidos: 4
                              }
                              
                              return (
                                <tr 
                                  key={vendedor.id} 
                                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                  }`}
                                >
                                  <td className="p-2 font-medium text-gray-900 truncate max-w-[90px]">
                                    <div className="flex items-center gap-1">
                                      {vendedor.nome}
                                      {vendedor.isGestor && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                                          G
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="text-center p-2 text-green-600 font-semibold">
                                    {interacao.iniciados}
                                  </td>
                                  <td className="text-center p-2 text-purple-600 font-semibold">
                                    {interacao.finalizados}
                                  </td>
                                  <td className="text-center p-2 text-orange-600 font-semibold">
                                    {interacao.ignorados}
                                  </td>
                                  <td className="text-center p-2 text-cyan-600 font-semibold">
                                    {interacao.enviadas}
                                  </td>
                                  <td className="text-center p-2 text-teal-600 font-semibold">
                                    {interacao.recebidas}
                                  </td>
                                  <td className="text-center p-2 text-indigo-600 font-semibold">
                                    {interacao.transferidos}
                                  </td>
                                </tr>
                              )
                            })}
                            {/* Linha de Resumo/Total */}
                            <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                              <td className="p-2 text-gray-900">TOTAL</td>
                              <td className="text-center p-2 text-green-700">
                                {unidade.vendedores.reduce((sum, v) => {
                                  const interacao = v.interacao || { iniciados: 112, finalizados: 110, ignorados: 24, enviadas: 1856, recebidas: 1287, transferidos: 4 }
                                  return sum + interacao.iniciados
                                }, 0)}
                              </td>
                              <td className="text-center p-2 text-purple-700">
                                {unidade.vendedores.reduce((sum, v) => {
                                  const interacao = v.interacao || { iniciados: 112, finalizados: 110, ignorados: 24, enviadas: 1856, recebidas: 1287, transferidos: 4 }
                                  return sum + interacao.finalizados
                                }, 0)}
                              </td>
                              <td className="text-center p-2 text-orange-700">
                                {unidade.vendedores.reduce((sum, v) => {
                                  const interacao = v.interacao || { iniciados: 112, finalizados: 110, ignorados: 24, enviadas: 1856, recebidas: 1287, transferidos: 4 }
                                  return sum + interacao.ignorados
                                }, 0)}
                              </td>
                              <td className="text-center p-2 text-cyan-700">
                                {unidade.vendedores.reduce((sum, v) => {
                                  const interacao = v.interacao || { iniciados: 112, finalizados: 110, ignorados: 24, enviadas: 1856, recebidas: 1287, transferidos: 4 }
                                  return sum + interacao.enviadas
                                }, 0)}
                              </td>
                              <td className="text-center p-2 text-teal-700">
                                {unidade.vendedores.reduce((sum, v) => {
                                  const interacao = v.interacao || { iniciados: 112, finalizados: 110, ignorados: 24, enviadas: 1856, recebidas: 1287, transferidos: 4 }
                                  return sum + interacao.recebidas
                                }, 0)}
                              </td>
                              <td className="text-center p-2 text-indigo-700">
                                {unidade.vendedores.reduce((sum, v) => {
                                  const interacao = v.interacao || { iniciados: 112, finalizados: 110, ignorados: 24, enviadas: 1856, recebidas: 1287, transferidos: 4 }
                                  return sum + interacao.transferidos
                                }, 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

