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

interface OportunidadeDiaria {
  data: string
  dia: number
  mes: number
  ano: number
  total: number
  valor_total?: number
}

interface ConsultorOportunidadesDiariasProps {
  unidadeId: number
  vendedorId: number
  dataInicio: string
  dataFim: string
}

export const ConsultorOportunidadesDiarias = memo(function ConsultorOportunidadesDiarias({
  unidadeId,
  vendedorId,
  dataInicio,
  dataFim
}: ConsultorOportunidadesDiariasProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dadosCriadas, setDadosCriadas] = useState<OportunidadeDiaria[]>([])
  const [dadosPerdidas, setDadosPerdidas] = useState<OportunidadeDiaria[]>([])
  const [dadosGanhas, setDadosGanhas] = useState<OportunidadeDiaria[]>([])

  useEffect(() => {
    if (!vendedorId || !dataInicio || !dataFim) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Buscar oportunidades criadas
        const paramsCriadas = new URLSearchParams()
        paramsCriadas.append('tipo', 'criadas')
        paramsCriadas.append('data_inicio', dataInicio)
        paramsCriadas.append('data_fim', dataFim)
        paramsCriadas.append('user_id', vendedorId.toString())
        paramsCriadas.append('all', '1')

        const responseCriadas = await fetch(`/api/oportunidades/diaria?${paramsCriadas.toString()}`)
        const dataCriadas = await responseCriadas.json()

        // Buscar oportunidades perdidas
        const paramsPerdidas = new URLSearchParams()
        paramsPerdidas.append('tipo', 'perdidas')
        paramsPerdidas.append('data_inicio', dataInicio)
        paramsPerdidas.append('data_fim', dataFim)
        paramsPerdidas.append('user_id', vendedorId.toString())
        paramsPerdidas.append('all', '1')

        const responsePerdidas = await fetch(`/api/oportunidades/diaria?${paramsPerdidas.toString()}`)
        const dataPerdidas = await responsePerdidas.json()

        // Buscar oportunidades ganhas
        const paramsGanhas = new URLSearchParams()
        paramsGanhas.append('tipo', 'ganhas')
        paramsGanhas.append('data_inicio', dataInicio)
        paramsGanhas.append('data_fim', dataFim)
        paramsGanhas.append('user_id', vendedorId.toString())
        paramsGanhas.append('all', '1')

        const responseGanhas = await fetch(`/api/oportunidades/diaria?${paramsGanhas.toString()}`)
        const dataGanhas = await responseGanhas.json()

        if (dataCriadas.success) {
          setDadosCriadas(dataCriadas.dados || [])
        }
        
        if (dataPerdidas.success) {
          setDadosPerdidas(dataPerdidas.dados || [])
        }

        if (dataGanhas.success) {
          setDadosGanhas(dataGanhas.dados || [])
        }

        if (!dataCriadas.success && !dataPerdidas.success && !dataGanhas.success) {
          setError(dataCriadas.message || 'Erro ao carregar dados')
        }
      } catch (err) {
        setError('Erro ao buscar dados de oportunidades diárias')
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
            <div className="text-gray-500">Carregando minhas oportunidades diárias...</div>
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
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
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

  // Se não houver dados, não mostrar
  if (dadosCriadas.length === 0 && dadosPerdidas.length === 0 && dadosGanhas.length === 0) {
    return null
  }

  // Calcular totais gerais
  const totalCriadas = dadosCriadas
    .filter(item => item.data && datasValidasSet.has(item.data))
    .reduce((sum, item) => sum + item.total, 0)
  
  const totalPerdidas = dadosPerdidas
    .filter(item => item.data && datasValidasSet.has(item.data))
    .reduce((sum, item) => sum + item.total, 0)

  const totalGanhasQtd = dadosGanhas
    .filter(item => item.data && datasValidasSet.has(item.data))
    .reduce((sum, item) => sum + item.total, 0)

  const totalGanhasValor = dadosGanhas
    .filter(item => item.data && datasValidasSet.has(item.data))
    .reduce((sum, item) => sum + (item.valor_total || 0), 0)

  // Função para formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value)
  }

  // Função para formatar data (header)
  const formatarDataHeader = (data: string) => {
    const [year, month, day] = data.split('-').map(Number)
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
  }

  return (
    <Card className="border-gray-300 shadow-sm">
      <CardHeader className="bg-blue-100 py-2.5 px-4 flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Minhas Oportunidades Criadas Dia a Dia
          </CardTitle>
          <CardDescription className="text-[10px] mt-0.5">
            Distribuição diária das minhas oportunidades criadas no período
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-[10px] text-gray-600 font-medium">Criadas</div>
            <div className="font-bold text-sm text-blue-700">{totalCriadas} ops</div>
          </div>
          <div className="text-right border-l border-gray-300 pl-4">
            <div className="text-[10px] text-gray-600 font-medium">Perdidas</div>
            <div className="font-bold text-sm text-red-700">{totalPerdidas} ops</div>
          </div>
          <div className="text-right border-l border-gray-300 pl-4">
            <div className="text-[10px] text-gray-600 font-medium">Ganhas</div>
            <div className="font-bold text-sm text-green-700">{totalGanhasQtd} ops · {formatCurrency(totalGanhasValor)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-20 bg-gray-50 min-w-[120px] border-r border-gray-300 h-10 px-3 text-xs font-semibold text-gray-700">
                  Período
                </TableHead>
                {todasDatas.map(data => (
                  <TableHead
                    key={data}
                    className="text-center min-w-[60px] h-10 px-2 text-[10px] font-medium text-muted-foreground"
                  >
                    {formatarDataHeader(data)}
                  </TableHead>
                ))}
                <TableHead className="text-center bg-blue-100 min-w-[70px] border-l-2 border-blue-300 h-10 px-3 text-xs font-bold text-gray-700">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Linha de Criadas */}
              <TableRow className="hover:bg-blue-50/50 bg-white">
                <TableCell className="sticky left-0 z-10 bg-white border-r border-gray-300 font-semibold text-xs px-3 py-2 text-blue-700">
                  Criadas
                </TableCell>
                {todasDatas.map(data => {
                  const item = dadosCriadas.find(d => d.data === data)
                  const quantidade = item?.total || 0
                  return (
                    <TableCell
                      key={data}
                      className="text-center text-sm py-2 px-2 border-l border-gray-200"
                    >
                      {quantidade > 0 ? (
                        <span className="font-bold text-blue-700">{quantidade}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center bg-blue-100 font-bold border-l-2 border-blue-300 px-3 py-2 text-sm text-blue-800">
                  {totalCriadas}
                </TableCell>
              </TableRow>
              
              {/* Linha de Perdidas */}
              <TableRow className="hover:bg-red-50/50 bg-red-50/20 border-t border-gray-200">
                <TableCell className="sticky left-0 z-10 bg-red-50/20 border-r border-gray-300 font-semibold text-xs px-3 py-2 text-red-700">
                  Perdidas
                </TableCell>
                {todasDatas.map(data => {
                  const item = dadosPerdidas.find(d => d.data === data)
                  const quantidade = item?.total || 0
                  return (
                    <TableCell
                      key={data}
                      className="text-center text-sm py-2 px-2 border-l border-gray-200"
                    >
                      {quantidade > 0 ? (
                        <span className="font-bold text-red-700">{quantidade}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center bg-red-100 font-bold border-l-2 border-red-300 px-3 py-2 text-sm text-red-800">
                  {totalPerdidas}
                </TableCell>
              </TableRow>

              {/* Linha de Ganhas - Quantidade */}
              <TableRow className="hover:bg-green-50/50 bg-green-50/20 border-t border-gray-200">
                <TableCell className="sticky left-0 z-10 bg-green-50/20 border-r border-gray-300 font-semibold text-xs px-3 py-2 text-green-700">
                  Ganhas (Qtd)
                </TableCell>
                {todasDatas.map(data => {
                  const item = dadosGanhas.find(d => d.data === data)
                  const quantidade = item?.total || 0
                  return (
                    <TableCell
                      key={data}
                      className="text-center text-sm py-2 px-2 border-l border-gray-200"
                    >
                      {quantidade > 0 ? (
                        <span className="font-bold text-green-700">{quantidade}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center bg-green-100 font-bold border-l-2 border-green-300 px-3 py-2 text-sm text-green-800">
                  {totalGanhasQtd}
                </TableCell>
              </TableRow>

              {/* Linha de Ganhas - Valor */}
              <TableRow className="hover:bg-green-50/50 bg-green-50/30 border-t border-gray-200">
                <TableCell className="sticky left-0 z-10 bg-green-50/30 border-r border-gray-300 font-semibold text-xs px-3 py-2 text-green-700">
                  Ganhas (Valor)
                </TableCell>
                {todasDatas.map(data => {
                  const item = dadosGanhas.find(d => d.data === data)
                  const valor = item?.valor_total || 0
                  return (
                    <TableCell
                      key={data}
                      className="text-center text-[11px] py-2 px-1 border-l border-gray-200"
                    >
                      {valor > 0 ? (
                        <span className="font-bold text-green-700">{formatCurrency(valor)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center bg-green-100 font-bold border-l-2 border-green-300 px-3 py-2 text-[11px] text-green-800">
                  {formatCurrency(totalGanhasValor)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
})

