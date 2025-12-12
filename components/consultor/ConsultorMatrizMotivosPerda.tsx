"use client"

import { memo, useEffect, useState } from "react"
import { AlertCircle, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
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

interface MotivoPerda {
  motivo_id: number | null
  motivo: string
  total_oportunidades: number
  valor_total: number
  lost_time: number
  percentual: string
}

interface ConsultorMatrizMotivosPerdaProps {
  unidadeId: number
  vendedorId: number
  dataInicio: string
  dataFim: string
}

type SortField = 'motivo' | 'quantidade' | 'percentual' | 'tempo' | 'valor'
type SortDirection = 'asc' | 'desc' | null

export const ConsultorMatrizMotivosPerda = memo(function ConsultorMatrizMotivosPerda({
  unidadeId,
  vendedorId,
  dataInicio,
  dataFim
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
  }, [vendedorId, dataInicio, dataFim])

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

  return (
    <Card className="border-gray-300 shadow-sm">
      <CardHeader className="bg-red-100 py-2.5 px-4 flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            Meus Motivos de Perda
          </CardTitle>
          <CardDescription className="text-[10px] mt-0.5">
            Distribuição das minhas oportunidades perdidas no período
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="text-right">
            <div className="text-[10px] text-gray-600 font-medium">Total</div>
            <div className="font-bold text-sm text-red-700">{totalOportunidades} ops</div>
          </div>
          {totalValor > 0 && (
            <div className="text-right border-l border-gray-300 pl-3">
              <div className="text-[10px] text-gray-600 font-medium">Valor</div>
              <div className="font-bold text-sm text-red-700">
                R$ {totalValor.toLocaleString('pt-BR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableHeader field="motivo" align="left">
                  <span className="text-xs">Motivo</span>
                </SortableHeader>
                <SortableHeader field="quantidade">
                  <span className="text-xs">Quantidade</span>
                </SortableHeader>
                <SortableHeader field="percentual">
                  <span className="text-xs">Percentual</span>
                </SortableHeader>
                <SortableHeader field="tempo">
                  <span className="text-xs">Tempo Médio</span>
                </SortableHeader>
                <SortableHeader field="valor" align="right">
                  <span className="text-xs">Valor</span>
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortMotivos().map((motivo, idx) => (
                <TableRow key={motivo.motivo_id || `motivo-${idx}`} className="hover:bg-red-50/30 bg-white border-b border-gray-200">
                  <TableCell className="text-xs py-2 px-3 font-medium text-gray-700">
                    <div className="truncate max-w-[300px]" title={motivo.motivo}>
                      {motivo.motivo}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm font-bold py-2 px-2 text-red-700">
                    {motivo.total_oportunidades}
                  </TableCell>
                  <TableCell className="text-center py-2 px-2">
                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-semibold">
                      {((motivo.total_oportunidades / totalOportunidades) * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-gray-600 font-medium py-2 px-2">
                    {motivo.lost_time}d
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold py-2 px-3">
                    {motivo.valor_total > 0 ? (
                      <span className="text-red-700">
                        R$ {motivo.valor_total.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
})
