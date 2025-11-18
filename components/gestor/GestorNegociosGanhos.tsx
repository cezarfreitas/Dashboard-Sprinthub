"use client"

import { memo, useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, CheckCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface NegocioGanho {
  id: number
  titulo: string
  valor: number
  data_criacao: string
  data_ganho: string
  vendedor_id: number
  vendedor_nome: string
  vendedor_sobrenome: string
  unidade_nome: string
  etapa: string
  motivo_ganho: string
  canal_venda: string
  campanha: string
  win_time_dias: number
}

interface GestorNegociosGanhosProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

export const GestorNegociosGanhos = memo(function GestorNegociosGanhos({
  unidadeId,
  dataInicio,
  dataFim
}: GestorNegociosGanhosProps) {
  const [dados, setDados] = useState<NegocioGanho[]>([])
  const [loading, setLoading] = useState(true)
  const [totais, setTotais] = useState({
    total_oportunidades: 0,
    valor_total: 0,
    win_time_medio: 0
  })

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  const formatDate = useCallback((dateString: string | null): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }, [])

  const fetchData = useCallback(async () => {
    if (!unidadeId) {
      setDados([])
      setTotais({ total_oportunidades: 0, valor_total: 0, win_time_medio: 0 })
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.append('unidade_id', unidadeId.toString())
      params.append('data_inicio', dataInicio)
      params.append('data_fim', dataFim)

      const response = await fetch(`/api/oportunidades/ganhas-tabela?${params.toString()}`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setDados(result.dados || [])
        setTotais(result.totais || { total_oportunidades: 0, valor_total: 0, win_time_medio: 0 })
      } else {
        setDados([])
        setTotais({ total_oportunidades: 0, valor_total: 0, win_time_medio: 0 })
      }
    } catch {
      setDados([])
      setTotais({ total_oportunidades: 0, valor_total: 0, win_time_medio: 0 })
    } finally {
      setLoading(false)
    }
  }, [unidadeId, dataInicio, dataFim])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 bg-green-600 rounded-full" />
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Negócios Ganhos</span>
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Lista completa de oportunidades ganhas
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (dados.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 bg-green-600 rounded-full" />
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Negócios Ganhos</span>
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Lista completa de oportunidades ganhas
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-center text-muted-foreground py-4 text-xs">
            Nenhum negócio ganho encontrado para o período selecionado.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 bg-green-600 rounded-full" />
            <div>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Negócios Ganhos</span>
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Lista completa de oportunidades ganhas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground whitespace-nowrap">
            <span>
              Total: <span className="font-semibold text-green-600">{totais.total_oportunidades}</span> {totais.total_oportunidades === 1 ? 'negócio' : 'negócios'}
            </span>
            <span>
              Valor: <span className="font-semibold text-green-600">{formatCurrency(totais.valor_total)}</span>
            </span>
            {totais.win_time_medio > 0 && (
              <span>
                Tempo Médio: <span className="font-semibold text-green-600">{Math.round(totais.win_time_medio)}d</span>
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-left font-semibold text-xs h-8 px-3 py-2 min-w-[80px]">
                    ID
                  </TableHead>
                  <TableHead className="text-left font-semibold text-xs h-8 px-3 py-2 min-w-[200px]">
                    Título
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs h-8 px-3 py-2 min-w-[120px]">
                    Valor
                  </TableHead>
                  <TableHead className="text-left font-semibold text-xs h-8 px-3 py-2 min-w-[150px]">
                    Vendedor
                  </TableHead>
                  <TableHead className="text-left font-semibold text-xs h-8 px-3 py-2 min-w-[100px]">
                    Data Criação
                  </TableHead>
                  <TableHead className="text-left font-semibold text-xs h-8 px-3 py-2 min-w-[100px]">
                    Data Ganho
                  </TableHead>
                  <TableHead className="text-center font-semibold text-xs h-8 px-3 py-2 min-w-[100px]">
                    Win Time
                  </TableHead>
                  <TableHead className="text-left font-semibold text-xs h-8 px-3 py-2 min-w-[120px]">
                    Etapa
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((negocio, index) => (
                  <TableRow
                    key={negocio.id}
                    className={`hover:bg-muted/50 ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                    }`}
                  >
                    <TableCell className="text-xs px-3 py-2 font-mono text-gray-600">
                      {negocio.id}
                    </TableCell>
                    <TableCell className="text-xs px-3 py-2 font-medium">
                      {negocio.titulo}
                    </TableCell>
                    <TableCell className="text-right text-xs px-3 py-2 font-semibold text-green-600">
                      {formatCurrency(negocio.valor)}
                    </TableCell>
                    <TableCell className="text-xs px-3 py-2">
                      {negocio.vendedor_nome} {negocio.vendedor_sobrenome}
                    </TableCell>
                    <TableCell className="text-xs px-3 py-2 text-gray-600">
                      {formatDate(negocio.data_criacao)}
                    </TableCell>
                    <TableCell className="text-xs px-3 py-2 text-green-700 font-medium">
                      {formatDate(negocio.data_ganho)}
                    </TableCell>
                    <TableCell className="text-center text-xs px-3 py-2 text-gray-600">
                      {negocio.win_time_dias > 0 ? `${negocio.win_time_dias}d` : '-'}
                    </TableCell>
                    <TableCell className="text-xs px-3 py-2 text-gray-600">
                      {negocio.etapa || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Linha de Total */}
                <TableRow className="bg-muted border-t-2 border-muted-foreground/30 font-bold">
                  <TableCell colSpan={2} className="text-xs px-3 py-2 font-bold">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right text-xs px-3 py-2 font-bold text-green-700">
                    {formatCurrency(totais.valor_total)}
                  </TableCell>
                  <TableCell colSpan={3} className="text-xs px-3 py-2"></TableCell>
                  <TableCell className="text-center text-xs px-3 py-2 font-bold text-gray-700">
                    {totais.win_time_medio > 0 ? `${Math.round(totais.win_time_medio)}d` : '-'}
                  </TableCell>
                  <TableCell className="text-xs px-3 py-2"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

