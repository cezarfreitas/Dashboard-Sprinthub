"use client"

import { memo, useEffect, useState, useMemo } from "react"
import { AlertCircle, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface MotivoPerda {
  motivo_id: number | null
  motivo: string
  total_oportunidades: number
  valor_total: number
  lost_time: number
  percentual: string
}

interface Oportunidade {
  id: number
  title: string
  value: number
  crm_column?: string
  createDate: string
  lost_date?: string
  lost_reason?: string
}

interface ConsultorMatrizMotivosPerdaProps {
  unidadeId: number
  vendedorId: number
  dataInicio: string
  dataFim: string
  funilSelecionado?: string | null
}

type SortField = 'motivo' | 'quantidade' | 'percentual' | 'tempo' | 'valor'
type SortDirection = 'asc' | 'desc' | null

export const ConsultorMatrizMotivosPerda = memo(function ConsultorMatrizMotivosPerda({
  unidadeId,
  vendedorId,
  dataInicio,
  dataFim,
  funilSelecionado
}: ConsultorMatrizMotivosPerdaProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [motivosPerda, setMotivosPerda] = useState<MotivoPerda[]>([])
  const [totalOportunidades, setTotalOportunidades] = useState(0)
  const [totalValor, setTotalValor] = useState(0)
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'quantidade',
    direction: 'desc'
  })
  
  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false)
  const [oportunidadesModal, setOportunidadesModal] = useState<Oportunidade[]>([])
  const [motivoModal, setMotivoModal] = useState<string>('')
  const [loadingModal, setLoadingModal] = useState(false)

  useEffect(() => {
    if (!vendedorId || !dataInicio || !dataFim) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.append('user_id', vendedorId.toString()) // Filtrar por vendedor
        params.append('lost_date_start', dataInicio)
        params.append('lost_date_end', dataFim)
        params.append('all', '1')
        if (funilSelecionado) {
          params.append('funil_id', funilSelecionado)
        }

        const response = await fetch(`/api/oportunidades/lost?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          const motivos = data.data.motivos_perda || []
          setMotivosPerda(motivos)
          
          // Calcular totais
          const totalOps = motivos.reduce((sum: number, m: MotivoPerda) => sum + m.total_oportunidades, 0)
          const totalVal = motivos.reduce((sum: number, m: MotivoPerda) => sum + m.valor_total, 0)
          
          setTotalOportunidades(totalOps)
          setTotalValor(totalVal)
        } else {
          setError(data.message || 'Erro ao carregar dados')
        }
      } catch (err) {
        setError('Erro ao buscar dados de motivos de perda')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [vendedorId, dataInicio, dataFim, funilSelecionado])

  // Função para abrir modal com oportunidades do motivo
  const handleMotivoClick = async (motivo: MotivoPerda) => {
    if (motivo.total_oportunidades === 0) return

    try {
      setLoadingModal(true)
      setModalAberto(true)
      setMotivoModal(motivo.motivo)
      setOportunidadesModal([])

      const params = new URLSearchParams()
      params.append('user_id', vendedorId.toString())
      params.append('lost_date_start', dataInicio)
      params.append('lost_date_end', dataFim)
      params.append('status', 'lost')
      
      // Enviar o ID do motivo se disponível, senão envia o texto
      if (motivo.motivo_id) {
        // O loss_reason no banco pode estar como "Motivo X" ou apenas "X"
        params.append('motivo_id', `Motivo ${motivo.motivo_id}`)
      } else {
        params.append('motivo', motivo.motivo)
      }

      if (funilSelecionado) {
        params.append('funil_id', funilSelecionado)
      }

      const response = await fetch(`/api/oportunidades?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setOportunidadesModal(data.oportunidades || data.data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error)
      setOportunidadesModal([])
    } finally {
      setLoadingModal(false)
    }
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  // Cores para o gráfico de pizza
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1']

  // Preparar dados para o gráfico (HOOK - deve estar antes de qualquer return)
  const chartData = useMemo(() => {
    if (motivosPerda.length === 0 || totalOportunidades === 0) {
      return []
    }
    return motivosPerda.map((motivo, idx) => ({
      name: motivo.motivo.length > 30 ? motivo.motivo.substring(0, 30) + '...' : motivo.motivo,
      value: motivo.total_oportunidades,
      percentual: ((motivo.total_oportunidades / totalOportunidades) * 100).toFixed(1),
      color: COLORS[idx % COLORS.length]
    }))
  }, [motivosPerda, totalOportunidades, COLORS])

  // Função para ordenar motivos
  const sortMotivos = () => {
    if (!sortConfig.direction) {
      return [...motivosPerda].sort((a, b) => b.total_oportunidades - a.total_oportunidades)
    }

    const sorted = [...motivosPerda].sort((a, b) => {
      let comparison = 0

      switch (sortConfig.field) {
        case 'motivo':
          comparison = a.motivo.localeCompare(b.motivo)
          break
        case 'quantidade':
          comparison = a.total_oportunidades - b.total_oportunidades
          break
        case 'percentual':
          const percentA = (a.total_oportunidades / totalOportunidades) * 100
          const percentB = (b.total_oportunidades / totalOportunidades) * 100
          comparison = percentA - percentB
          break
        case 'tempo':
          comparison = a.lost_time - b.lost_time
          break
        case 'valor':
          comparison = a.valor_total - b.valor_total
          break
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    return sorted
  }

  // Função para alternar ordenação
  const handleSort = (field: SortField) => {
    setSortConfig(prev => {
      if (prev.field === field) {
        // Alternar direção: asc -> desc -> null -> asc
        if (prev.direction === 'asc') {
          return { field, direction: 'desc' }
        } else if (prev.direction === 'desc') {
          return { field, direction: null }
        } else {
          return { field, direction: 'asc' }
        }
      } else {
        // Novo campo: começar com asc
        return { field, direction: 'asc' }
      }
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Carregando meus motivos de perda...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se não houver dados, não mostrar
  if (motivosPerda.length === 0) {
    return null
  }

  // Componente de header ordenável
  const SortableHeader = ({ field, children, align = 'center' }: { field: SortField; children: React.ReactNode; align?: 'left' | 'center' | 'right' }) => {
    const isActive = sortConfig.field === field
    const direction = isActive ? sortConfig.direction : null

    const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'

    return (
      <TableHead className={`${alignClass} text-xs h-10 px-1.5 font-medium text-muted-foreground`}>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-semibold hover:bg-transparent"
          onClick={() => handleSort(field)}
        >
          <div className={`flex items-center gap-1 ${justifyClass}`}>
            {children}
            {direction === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-blue-600" />
            ) : direction === 'desc' ? (
              <ArrowDown className="h-3 w-3 text-blue-600" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </div>
        </Button>
      </TableHead>
    )
  }

  // Componente de tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-bold text-gray-800">{payload[0].name}</p>
          <p className="text-xs text-gray-600">Quantidade: {payload[0].value}</p>
          <p className="text-xs text-gray-600">Percentual: {payload[0].payload.percentual}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4">
      {/* Card do Gráfico - Menor */}
      <Card className="border-primary border-2 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="card-header-brand">
          <div className="flex items-center gap-2">
            <TrendingDown className="card-header-brand-icon" />
            <div>
              <CardTitle className="card-header-brand-title">
                Distribuição
              </CardTitle>
              <CardDescription className="card-header-brand-subtitle">
                Motivos de Perda
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentual }) => `${percentual}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legenda customizada */}
            <div className="mt-3 w-full max-h-[180px] overflow-y-auto space-y-1">
              {chartData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="truncate text-gray-700 flex-1" title={motivosPerda[index]?.motivo}>{entry.name}</span>
                  <span className="text-gray-500 text-[10px]">({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card da Tabela - Maior */}
      <Card className="border-primary border-2 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="card-header-brand">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="card-header-brand-icon" />
              <div>
                <div className="card-header-brand-title">
                  Meus Motivos de Perda
                </div>
                <div className="card-header-brand-subtitle">
                  Detalhamento das minhas oportunidades perdidas no período
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-primary-foreground">
              <div className="text-right">
                <div className="text-[10px] text-primary-foreground/80 font-medium">Total</div>
                <div className="font-bold text-[12px] leading-tight">{totalOportunidades} ops</div>
              </div>
              {totalValor > 0 && (
                <div className="text-right border-l border-primary-foreground/30 pl-3">
                  <div className="text-[10px] text-primary-foreground/80 font-medium">Valor</div>
                  <div className="font-bold text-[12px] leading-tight">
                    R$ {totalValor.toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-blue-200">
                <SortableHeader field="motivo" align="left">
                  <span className="text-xs font-bold">Motivo</span>
                </SortableHeader>
                <SortableHeader field="quantidade">
                  <span className="text-xs font-bold">Quantidade</span>
                </SortableHeader>
                <SortableHeader field="percentual">
                  <span className="text-xs font-bold">Percentual</span>
                </SortableHeader>
                <SortableHeader field="tempo">
                  <span className="text-xs font-bold">Tempo Médio</span>
                </SortableHeader>
                <SortableHeader field="valor" align="right">
                  <span className="text-xs font-bold">Valor</span>
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortMotivos().map((motivo, idx) => (
                <TableRow key={motivo.motivo_id || `motivo-${idx}`} className={`hover:bg-slate-50/80 transition-colors border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <TableCell className="text-xs py-2.5 px-3 font-bold text-slate-700">
                    <div className="truncate max-w-[300px]" title={motivo.motivo}>
                      {motivo.motivo}
                    </div>
                  </TableCell>
                  <TableCell 
                    className="text-center text-sm font-bold py-2.5 px-2 text-red-600 cursor-pointer hover:bg-red-50 hover:scale-105 transition-all duration-200"
                    onClick={() => handleMotivoClick(motivo)}
                  >
                    {motivo.total_oportunidades}
                  </TableCell>
                  <TableCell className="text-center py-2.5 px-2">
                    <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded text-xs font-bold">
                      {((motivo.total_oportunidades / totalOportunidades) * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-slate-600 font-bold py-2.5 px-2">
                    {motivo.lost_time}d
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold py-2.5 px-3">
                    {motivo.valor_total > 0 ? (
                      <span className="text-red-600">
                        R$ {motivo.valor_total.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog com lista de oportunidades */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Oportunidades Perdidas - {motivoModal}
            </DialogTitle>
            <DialogDescription>
              {loadingModal ? 'Carregando...' : `${oportunidadesModal.length} oportunidade(s) encontrada(s)`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {loadingModal ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Carregando oportunidades...</div>
              </div>
            ) : oportunidadesModal.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Nenhuma oportunidade encontrada</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-center">Valor</TableHead>
                    <TableHead className="text-center">Criado em</TableHead>
                    <TableHead className="text-center">Perdido em</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidadesModal.map((oportunidade) => (
                    <TableRow key={oportunidade.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-[300px] truncate" title={oportunidade.title}>
                          {oportunidade.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {formatCurrency(oportunidade.value)}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {formatDate(oportunidade.createDate)}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {formatDate(oportunidade.lost_date || '')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const crmUrl = process.env.NEXT_PUBLIC_URL_PUBLIC || 'https://grupointeli.sprinthub.app'
                            window.open(`${crmUrl}/sh/crm?opportunityID=${oportunidade.id}`, '_blank')
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})
