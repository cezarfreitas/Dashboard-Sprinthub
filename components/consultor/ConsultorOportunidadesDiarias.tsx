"use client"

import { memo, useEffect, useState } from "react"
import { AlertCircle, TrendingUp, ExternalLink } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface OportunidadeDiaria {
  data: string
  dia: number
  mes: number
  ano: number
  total: number
  valor_total?: number
}

interface Oportunidade {
  id: number
  title: string
  value: number
  createDate: string
  lostDate?: string
  gainDate?: string
  status: string
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
  const [modalAberto, setModalAberto] = useState(false)
  const [oportunidadesModal, setOportunidadesModal] = useState<Oportunidade[]>([])
  const [tituloModal, setTituloModal] = useState<string>('')
  const [loadingModal, setLoadingModal] = useState(false)

  // Função para abrir modal com oportunidades do dia
  const handleCelulaClick = async (data: string, tipo: 'criadas' | 'perdidas' | 'ganhas', quantidade: number) => {
    console.log('🔥 handleCelulaClick chamado:', { data, tipo, quantidade, vendedorId })
    
    if (quantidade === 0) {
      console.log('⚠️ quantidade é 0, retornando sem buscar')
      return
    }

    try {
      setLoadingModal(true)
      setModalAberto(true)
      setTituloModal(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} - ${formatarDataCompleta(data)}`)
      setOportunidadesModal([])

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const params = new URLSearchParams()
      params.append('vendedor_id', vendedorId.toString())
      params.append('data', data)
      params.append('tipo', tipo)

      const url = `${baseUrl}/api/consultor/oportunidades-por-data?${params.toString()}`
      console.log('📡 Fazendo requisição para:', url)
      
      const response = await fetch(url)
      const result = await response.json()
      
      console.log('📥 Resposta da API:', result)

      if (result.success) {
        setOportunidadesModal(result.data || [])
      } else {
        console.error('❌ API retornou erro:', result)
        setOportunidadesModal([])
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error)
      setOportunidadesModal([])
    } finally {
      setLoadingModal(false)
    }
  }

  // Função para abrir modal com TODAS as oportunidades do período (quando clicar no Total)
  const handleTotalClick = async (tipo: 'criadas' | 'perdidas' | 'ganhas', quantidade: number) => {
    if (quantidade === 0) return

    try {
      setLoadingModal(true)
      setModalAberto(true)
      setTituloModal(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} - Período Completo`)
      setOportunidadesModal([])

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const params = new URLSearchParams()
      params.append('vendedor_id', vendedorId.toString())
      params.append('data_inicio', dataInicio)
      params.append('data_fim', dataFim)
      params.append('tipo', tipo)

      const response = await fetch(`${baseUrl}/api/consultor/oportunidades-por-periodo?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setOportunidadesModal(result.data || [])
      }
    } catch (error) {
      // Erro ao buscar oportunidades
    } finally {
      setLoadingModal(false)
    }
  }

  // Função para formatar data completa
  const formatarDataCompleta = (data: string) => {
    if (!data) return ''
    const [year, month, day] = data.split('-').map(Number)
    // Criar data com UTC para evitar problemas de timezone
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    })
  }

  useEffect(() => {
    if (!vendedorId || !dataInicio || !dataFim) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // URL base da API
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

        // Buscar oportunidades criadas
        const paramsCriadas = new URLSearchParams()
        paramsCriadas.append('tipo', 'criadas')
        paramsCriadas.append('data_inicio', dataInicio)
        paramsCriadas.append('data_fim', dataFim)
        paramsCriadas.append('user_id', vendedorId.toString())
        paramsCriadas.append('all', '1')

        const responseCriadas = await fetch(`${baseUrl}/api/oportunidades/diaria?${paramsCriadas.toString()}`)
        const dataCriadas = await responseCriadas.json()

        // Buscar oportunidades perdidas
        const paramsPerdidas = new URLSearchParams()
        paramsPerdidas.append('tipo', 'perdidas')
        paramsPerdidas.append('data_inicio', dataInicio)
        paramsPerdidas.append('data_fim', dataFim)
        paramsPerdidas.append('user_id', vendedorId.toString())
        paramsPerdidas.append('all', '1')

        const responsePerdidas = await fetch(`${baseUrl}/api/oportunidades/diaria?${paramsPerdidas.toString()}`)
        const dataPerdidas = await responsePerdidas.json()

        // Buscar oportunidades ganhas
        const paramsGanhas = new URLSearchParams()
        paramsGanhas.append('tipo', 'ganhas')
        paramsGanhas.append('data_inicio', dataInicio)
        paramsGanhas.append('data_fim', dataFim)
        paramsGanhas.append('user_id', vendedorId.toString())
        paramsGanhas.append('all', '1')

        const responseGanhas = await fetch(`${baseUrl}/api/oportunidades/diaria?${paramsGanhas.toString()}`)
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
                      className={`text-center text-sm py-2 px-2 border-l border-gray-200 ${quantidade > 0 ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
                      onClick={() => handleCelulaClick(data, 'criadas', quantidade)}
                    >
                      {quantidade > 0 ? (
                        <span className="font-bold text-blue-700">{quantidade}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell 
                  className={`text-center bg-blue-100 font-bold border-l-2 border-blue-300 px-3 py-2 text-sm text-blue-800 ${totalCriadas > 0 ? 'cursor-pointer hover:bg-blue-200 transition-colors' : ''}`}
                  onClick={() => handleTotalClick('criadas', totalCriadas)}
                >
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
                      className={`text-center text-sm py-2 px-2 border-l border-gray-200 ${quantidade > 0 ? 'cursor-pointer hover:bg-red-100 transition-colors' : ''}`}
                      onClick={() => handleCelulaClick(data, 'perdidas', quantidade)}
                    >
                      {quantidade > 0 ? (
                        <span className="font-bold text-red-700">{quantidade}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell 
                  className={`text-center bg-red-100 font-bold border-l-2 border-red-300 px-3 py-2 text-sm text-red-800 ${totalPerdidas > 0 ? 'cursor-pointer hover:bg-red-200 transition-colors' : ''}`}
                  onClick={() => handleTotalClick('perdidas', totalPerdidas)}
                >
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
                      className={`text-center text-sm py-2 px-2 border-l border-gray-200 ${quantidade > 0 ? 'cursor-pointer hover:bg-green-100 transition-colors' : ''}`}
                      onClick={() => handleCelulaClick(data, 'ganhas', quantidade)}
                    >
                      {quantidade > 0 ? (
                        <span className="font-bold text-green-700">{quantidade}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell 
                  className={`text-center bg-green-100 font-bold border-l-2 border-green-300 px-3 py-2 text-sm text-green-800 ${totalGanhasQtd > 0 ? 'cursor-pointer hover:bg-green-200 transition-colors' : ''}`}
                  onClick={() => handleTotalClick('ganhas', totalGanhasQtd)}
                >
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
                  const quantidade = item?.total || 0
                  return (
                    <TableCell
                      key={data}
                      className={`text-center text-[11px] py-2 px-1 border-l border-gray-200 ${quantidade > 0 ? 'cursor-pointer hover:bg-green-100 transition-colors' : ''}`}
                      onClick={() => handleCelulaClick(data, 'ganhas', quantidade)}
                    >
                      {valor > 0 ? (
                        <span className="font-bold text-green-700">{formatCurrency(valor)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell 
                  className={`text-center bg-green-100 font-bold border-l-2 border-green-300 px-3 py-2 text-[11px] text-green-800 ${totalGanhasQtd > 0 ? 'cursor-pointer hover:bg-green-200 transition-colors' : ''}`}
                  onClick={() => handleTotalClick('ganhas', totalGanhasQtd)}
                >
                  {formatCurrency(totalGanhasValor)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal com lista de oportunidades */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              {tituloModal}
            </DialogTitle>
            <DialogDescription>
              {oportunidadesModal.length} oportunidade(s) nesta data
            </DialogDescription>
          </DialogHeader>

          {loadingModal ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Carregando oportunidades...</div>
            </div>
          ) : oportunidadesModal.length > 0 ? (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right w-[120px]">Valor</TableHead>
                    <TableHead className="text-center w-[100px]">Status</TableHead>
                    <TableHead className="text-center w-[120px]">Data</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidadesModal.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">{op.id}</TableCell>
                      <TableCell>{op.title}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {op.value > 0 ? formatCurrency(op.value) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {op.status === 'open' && <span className="text-blue-600 text-xs bg-blue-100 px-2 py-0.5 rounded">Aberta</span>}
                        {op.status === 'won' && <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded">Ganha</span>}
                        {op.status === 'lost' && <span className="text-red-600 text-xs bg-red-100 px-2 py-0.5 rounded">Perdida</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {op.createDate && new Date(op.createDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const crmUrl = process.env.NEXT_PUBLIC_URL_PUBLIC || 'https://grupointeli.sprinthub.app'
                            window.open(`${crmUrl}/sh/crm?opportunityID=${op.id}`, '_blank')
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Nenhuma oportunidade encontrada
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
})

