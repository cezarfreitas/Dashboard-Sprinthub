"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Building2, TrendingUp, DollarSign, XCircle, Clock, Target, Users, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

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

interface VendedorFila {
  vendedor_id: number
  sequencia: number
  nome?: string
  total_distribuicoes?: number
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
  fila_leads?: VendedorFila[]
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
  dataInicio?: string
  dataFim?: string
}

// Componente Pie Chart With Needle
function PieChartWithNeedle({ value, meta, realizado }: { value: number; meta: number; realizado: number }) {
  // Determinar a cor baseada no percentual
  const getColor = () => {
    if (value >= 100) return '#10b981' // Verde
    if (value >= 75) return '#f59e0b'  // Laranja
    return '#ef4444' // Vermelho
  }

  // Normalizar para o range 0-200% com 100% no centro
  const maxValue = 200
  const normalizedValue = Math.min(Math.max(value, 0), maxValue)
  
  // Criar segmentos do gauge com 100% no centro (topo)
  const segments = [
    { value: 50, fill: '#ef4444' },   // 0-50% Vermelho
    { value: 25, fill: '#f59e0b' },   // 50-75% Laranja  
    { value: 25, fill: '#fbbf24' },   // 75-100% Amarelo
    { value: 50, fill: '#10b981' },   // 100-150% Verde claro
    { value: 50, fill: '#059669' }    // 150-200% Verde escuro
  ]

  // Função de formatação de moeda
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const RADIAN = Math.PI / 180
  const width = 240
  const gaugeHeight = 140
  const dataHeight = 25
  const height = gaugeHeight + dataHeight - 10
  const cx = width / 2
  const cy = gaugeHeight - 12
  const innerRadius = 60
  const outerRadius = 85
  const needleLength = 72
  const needleBaseRadius = 6
  
  // Calcular o ângulo da agulha
  // Semicírculo: 180° (esquerda) até 0° (direita)
  // 0% deve estar em 180° (esquerda)
  // 100% deve estar em 90° (topo/centro)
  // 200% deve estar em 0° (direita)
  const startAngle = 180
  const endAngle = 0
  const totalAngle = startAngle - endAngle // 180°
  const angleForValue = startAngle - (normalizedValue / maxValue) * totalAngle
  
  // Converter para radianos e ajustar para sistema de coordenadas SVG
  // No SVG: 0° = direita (3h), 90° = baixo (6h), 180° = esquerda (9h), 270° = cima (12h)
  // Mapeamento: SVG angle = 360° - angleForValue
  // 0%: angleForValue=180° → SVG=180° (esquerda horizontal)
  // 100%: angleForValue=90° → SVG=270° (cima vertical)
  // 200%: angleForValue=0° → SVG=0° (direita horizontal)
  const svgAngle = 360 - angleForValue
  const needleAngleRad = svgAngle * RADIAN
  const needleX = cx + needleLength * Math.cos(needleAngleRad)
  const needleY = cy + needleLength * Math.sin(needleAngleRad)

  return (
    <div className="relative -mt-2" style={{ width: width, height: height }}>
      <div className="absolute top-0 left-0" style={{ marginTop: '-10px' }}>
        <PieChart width={width} height={gaugeHeight}>
          <Pie
            data={segments}
            cx={cx}
            cy={cy}
            startAngle={180}
            endAngle={0}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={0}
            dataKey="value"
          >
            {segments.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </div>
      
      {/* Agulha sobreposta */}
      <svg
        className="absolute left-0 pointer-events-none"
        width={width}
        height={gaugeHeight}
        style={{ top: '-10px', zIndex: 10 }}
      >
        {/* Sombra da agulha */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX + 1.5}
          y2={needleY + 1.5}
          stroke="#00000020"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Agulha */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#1f2937"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Base da agulha */}
        <circle
          cx={cx}
          cy={cy}
          r={needleBaseRadius}
          fill="#1f2937"
          stroke="#ffffff"
          strokeWidth="2"
        />
      </svg>
      
      {/* Marcadores de porcentagem */}
      <div 
        className="absolute flex justify-between text-[10px] font-medium text-gray-600 pointer-events-none"
        style={{
          top: (gaugeHeight - 10) + 'px',
          left: '10px',
          right: '10px',
          zIndex: 20
        }}
      >
        <span className="text-red-600">0%</span>
        <span className="text-amber-600">50%</span>
        <span className="text-green-600 font-bold">100%</span>
        <span className="text-emerald-600">150%</span>
        <span>200%</span>
      </div>
      
      {/* Dados abaixo do gráfico em uma linha */}
      <div 
        className="absolute w-full text-center pointer-events-none"
        style={{
          top: (gaugeHeight + 5) + 'px',
          zIndex: 20
        }}
      >
        <div className="flex items-center justify-center gap-2 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-purple-700 font-medium">Meta:</span>
            <span className="font-bold text-purple-900">{formatCurrency(meta)}</span>
          </div>
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-1">
            <span className="text-purple-700 font-medium">Realizado:</span>
            <span className="font-bold text-purple-900">{formatCurrency(realizado)}</span>
          </div>
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-1">
            <span className={`font-bold ${value >= 100 ? 'text-green-600' : value >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
              {value.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResumoUnidades({ mes, ano, vendedorId, unidadeId, dataInicio, dataFim }: ResumoUnidadesProps) {
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

  const escapeCsv = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }


  const handleExportarOportunidades = async (unidadeId: number, mesAtual?: number, anoAtual?: number) => {
    try {
      // Usar período do filtro se disponível, senão usar mês/ano
      let primeiraData: string
      let ultimaData: string
      
      if (dataInicio && dataFim) {
        primeiraData = dataInicio
        ultimaData = dataFim
      } else {
        // Obter período atual se não fornecido
        const mesPeriodo = mesAtual || mes || new Date().getMonth() + 1
        const anoPeriodo = anoAtual || ano || new Date().getFullYear()
        primeiraData = `${anoPeriodo}-${String(mesPeriodo).padStart(2, '0')}-01`
        ultimaData = new Date(anoPeriodo, mesPeriodo, 0).toISOString().split('T')[0]
      }
      
      // Buscar unidade nos dados já carregados
      const unidade = data?.unidades.find((u: any) => u.id === unidadeId)
      if (!unidade || !unidade.vendedores || unidade.vendedores.length === 0) {
        alert('Nenhum vendedor encontrado para esta unidade')
        return
      }

      // Buscar oportunidades de todos os vendedores da unidade no período
      const todasOportunidades = []
      
      for (const vendedor of unidade.vendedores) {
        const response = await fetch(
          `/api/oportunidades/vendedor?vendedor_id=${vendedor.id}&data_inicio=${primeiraData}&data_fim=${ultimaData}`
        )
        
        if (response.ok) {
          const responseData = await response.json()
          if (responseData.success && responseData.oportunidades) {
            todasOportunidades.push(...responseData.oportunidades.map((op: any) => ({
              ...op,
              vendedor_nome: `${vendedor.nome}`.trim()
            })))
          }
        }
      }

      if (todasOportunidades.length === 0) {
        alert('Nenhuma oportunidade encontrada para o período selecionado')
        return
      }

      // Criar CSV
      const headers = [
        'ID',
        'Título',
        'Vendedor',
        'Valor',
        'Status',
        'Etapa',
        'Data Criação',
        'Motivo Perda'
      ]
      
      const csvContent = [
        headers.map(escapeCsv).join(','),
        ...todasOportunidades.map((op: any) => [
          escapeCsv(op.id),
          escapeCsv(op.titulo),
          escapeCsv(op.vendedor_nome),
          escapeCsv(op.valor),
          escapeCsv(op.ganho === 1 ? 'Ganha' : op.perda === 1 ? 'Perdida' : 'Aberta'),
          escapeCsv(op.coluna_nome || ''),
          escapeCsv(new Date(op.created_date).toLocaleDateString('pt-BR')),
          escapeCsv(op.motivo_perda || '')
        ].join(','))
      ].join('\n')

      // Adicionar BOM para Excel reconhecer UTF-8
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      
      // Nome do arquivo
      const mesPeriodo = mes || new Date().getMonth() + 1
      const anoPeriodo = ano || new Date().getFullYear()
      link.download = `oportunidades_${unidade.nome}_${getMesNome(mesPeriodo)}_${anoPeriodo}.csv`
      link.click()
    } catch (err) {
      console.error('Erro ao exportar oportunidades:', err)
      alert('Erro ao exportar oportunidades. Tente novamente.')
    }
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
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
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
                <div className="flex items-start justify-between gap-6">
                  {/* Nome da unidade e informações */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">{unidade.nome}</CardTitle>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 flex-shrink-0" />
                          <span className="font-medium">{unidade.total_vendedores} vendedor{unidade.total_vendedores !== 1 ? 'es' : ''}</span>
                        </div>
                        <span className="text-green-600 font-semibold">• {unidade.vendedores_na_fila} na fila</span>
                        {unidade.nome_gestor && (
                          <span className="text-blue-600 font-semibold">• Gestor: {unidade.nome_gestor}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Botão Exportar e Gráfico */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {/* Botão Exportar */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportarOportunidades(unidade.id, mes, ano)}
                      className="h-8 text-xs whitespace-nowrap"
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      Exportar
                    </Button>
                    
                    {/* Gráfico */}
                    {unidade.meta_mes > 0 && (
                      <div className="flex items-center justify-end">
                        <PieChartWithNeedle 
                          value={percentualMeta}
                          meta={unidade.meta_mes}
                          realizado={unidade.valor_ganho}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">

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

