"use client"

import { memo, useEffect, useState } from "react"
import { AlertCircle, TrendingUp } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface OportunidadeGanha {
  data: string
  dia: number
  mes: number
  ano: number
  total: number
  valor_total: number
}

interface OportunidadeGanhaVendedor {
  data: string
  dia: number
  mes: number
  ano: number
  vendedor_id: number
  vendedor_nome: string
  total: number
  valor_total: number
}

interface GestorGanhosDiariosProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

export const GestorGanhosDiarios = memo(function GestorGanhosDiarios({
  unidadeId,
  dataInicio,
  dataFim
}: GestorGanhosDiariosProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dados, setDados] = useState<OportunidadeGanha[]>([])
  const [dadosPorVendedor, setDadosPorVendedor] = useState<OportunidadeGanhaVendedor[]>([])

  useEffect(() => {
    if (!unidadeId || !dataInicio || !dataFim) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.append('tipo', 'ganhas')
        params.append('data_inicio', dataInicio)
        params.append('data_fim', dataFim)
        params.append('unidade_id', unidadeId.toString())
        params.append('all', '1')

        const response = await fetch(`/api/oportunidades/diaria?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setDados(data.dados || [])
          setDadosPorVendedor(data.dados_por_vendedor || [])
        } else {
          setError(data.message || 'Erro ao carregar dados')
        }
      } catch (err) {
        setError('Erro ao buscar dados de ganhos diários')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [unidadeId, dataInicio, dataFim])

  if (!unidadeId) {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Carregando ganhos diários...</div>
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

  // Gerar todas as datas do período
  const todasDatas: string[] = []
  
  if (!dataInicio.match(/^\d{4}-\d{2}-\d{2}$/) || !dataFim.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return null
  }
  
  const [startYear, startMonth, startDay] = dataInicio.split('-').map(Number)
  const [endYear, endMonth, endDay] = dataFim.split('-').map(Number)
  
  if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay) || 
      isNaN(endYear) || isNaN(endMonth) || isNaN(endDay)) {
    return null
  }
  
  // Gerar datas diretamente
  let currentYear = startYear
  let currentMonth = startMonth
  let currentDay = startDay
  
  while (true) {
    const dataFormatada = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
    
    if (dataFormatada > dataFim) {
      break
    }
    
    if (dataFormatada >= dataInicio && dataFormatada <= dataFim) {
      todasDatas.push(dataFormatada)
    }
    
    currentDay++
    
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    if (currentDay > daysInMonth) {
      currentDay = 1
      currentMonth++
      
      if (currentMonth > 12) {
        currentMonth = 1
        currentYear++
      }
    }
    
    if (currentYear > endYear + 1) {
      break
    }
  }

  const datasValidasSet = new Set(todasDatas)

  // Criar mapa: vendedor_id -> data -> {quantidade, valor}
  const vendedoresMap = new Map<number, {
    vendedor_id: number
    vendedor_nome: string
    dadosPorData: Map<string, { quantidade: number; valor: number }>
    total_quantidade: number
    total_valor: number
  }>()

  dadosPorVendedor
    .filter(item => item.data && datasValidasSet.has(item.data))
    .forEach(item => {
      if (!vendedoresMap.has(item.vendedor_id)) {
        vendedoresMap.set(item.vendedor_id, {
          vendedor_id: item.vendedor_id,
          vendedor_nome: item.vendedor_nome,
          dadosPorData: new Map(),
          total_quantidade: 0,
          total_valor: 0
        })
      }
      const vendedor = vendedoresMap.get(item.vendedor_id)!
      if (item.data) {
        vendedor.dadosPorData.set(item.data, {
          quantidade: item.total,
          valor: item.valor_total
        })
        vendedor.total_quantidade += item.total
        vendedor.total_valor += item.valor_total
      }
    })

  const vendedores = Array.from(vendedoresMap.values()).sort((a, b) => b.total_valor - a.total_valor)

  if (dados.length === 0 && vendedores.length === 0) {
    return null
  }

  const totalGeralQuantidade = dados
    .filter(item => item.data && datasValidasSet.has(item.data))
    .reduce((sum, item) => sum + item.total, 0)

  const totalGeralValor = dados
    .filter(item => item.data && datasValidasSet.has(item.data))
    .reduce((sum, item) => sum + item.valor_total, 0)

  const formatarDataHeader = (data: string) => {
    const [year, month, day] = data.split('-').map(Number)
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
  }

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="bg-muted/50 py-2.5 px-4 flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ganhos Dia a Dia por Vendedor
          </CardTitle>
          <CardDescription className="text-[10px] mt-0.5">
            Valores de oportunidades ganhas no período
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">Total</div>
            <div className="font-semibold text-sm">{totalGeralQuantidade} ops</div>
          </div>
          <div className="text-right border-l pl-3">
            <div className="text-[10px] text-muted-foreground">Valor</div>
            <div className="font-semibold text-sm">R$ {formatarValor(totalGeralValor)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-20 bg-background min-w-[140px] border-r h-10 px-3 text-xs font-medium text-muted-foreground">
                  Vendedor
                </TableHead>
                {todasDatas.map(data => (
                  <TableHead
                    key={data}
                    className="text-center min-w-[70px] h-10 px-1.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {formatarDataHeader(data)}
                  </TableHead>
                ))}
                <TableHead className="text-center bg-muted/50 min-w-[100px] border-l-2 h-10 px-3 text-xs font-medium text-muted-foreground">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map(vendedor => (
                <TableRow key={vendedor.vendedor_id} className="hover:bg-muted/30">
                  <TableCell className="sticky left-0 z-10 bg-background border-r font-medium text-xs px-3 py-1.5">
                    <div className="truncate max-w-[130px]" title={vendedor.vendedor_nome}>
                      {vendedor.vendedor_nome}
                    </div>
                  </TableCell>
                  {todasDatas.map(data => {
                    const dados = vendedor.dadosPorData.get(data)
                    return (
                      <TableCell
                        key={`${vendedor.vendedor_id}-${data}`}
                        className="text-center text-[10px] py-1.5 px-1"
                      >
                        {dados && dados.valor > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">R$ {formatarValor(dados.valor)}</span>
                            <span className="text-muted-foreground text-[9px]">{dados.quantidade} ops</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center bg-muted/30 border-l-2 px-3 py-1.5 text-xs">
                    <div className="flex flex-col">
                      <span className="font-semibold">R$ {formatarValor(vendedor.total_valor)}</span>
                      <span className="text-muted-foreground text-[10px]">{vendedor.total_quantidade} ops</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* Linha de totais */}
              {vendedores.length > 0 && (
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell className="sticky left-0 z-10 bg-muted/50 border-r font-semibold text-xs px-3 py-1.5">
                    Total
                  </TableCell>
                  {todasDatas.map(data => {
                    const dadosDia = dados.find(d => d.data === data)
                    return (
                      <TableCell
                        key={`total-${data}`}
                        className="text-center font-semibold text-[10px] py-1.5 px-1"
                      >
                        {dadosDia && dadosDia.valor_total > 0 ? (
                          <div className="flex flex-col">
                            <span>R$ {formatarValor(dadosDia.valor_total)}</span>
                            <span className="text-muted-foreground text-[9px]">{dadosDia.total} ops</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center bg-muted font-bold border-l-2 px-3 py-1.5 text-xs">
                    <div className="flex flex-col">
                      <span>R$ {formatarValor(totalGeralValor)}</span>
                      <span className="text-[10px] font-normal">{totalGeralQuantidade} ops</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
})

