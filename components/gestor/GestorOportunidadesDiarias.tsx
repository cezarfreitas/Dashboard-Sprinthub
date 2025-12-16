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
}

interface OportunidadeDiariaVendedor {
  data: string
  dia: number
  mes: number
  ano: number
  vendedor_id: number
  vendedor_nome: string
  total: number
}

interface Oportunidade {
  id: number
  title: string
  value: number
  createDate: string
  vendedor_nome?: string
  status: string
}

interface GestorOportunidadesDiariasProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

export const GestorOportunidadesDiarias = memo(function GestorOportunidadesDiarias({
  unidadeId,
  dataInicio,
  dataFim
}: GestorOportunidadesDiariasProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dados, setDados] = useState<OportunidadeDiaria[]>([])
  const [dadosPorVendedor, setDadosPorVendedor] = useState<OportunidadeDiariaVendedor[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [oportunidadesModal, setOportunidadesModal] = useState<Oportunidade[]>([])
  const [tituloModal, setTituloModal] = useState<string>('')
  const [loadingModal, setLoadingModal] = useState(false)

  // Função para abrir modal com oportunidades do vendedor em uma data
  const handleCelulaClick = async (vendedorId: number, vendedorNome: string, data: string, quantidade: number) => {
    if (quantidade === 0) return

    try {
      setLoadingModal(true)
      setModalAberto(true)
      setTituloModal(`${vendedorNome} - ${formatarDataCompleta(data)}`)
      setOportunidadesModal([])

      const params = new URLSearchParams()
      params.append('unidade_id', unidadeId?.toString() || '')
      params.append('vendedor_id', vendedorId.toString())
      params.append('data', data)
      params.append('tipo', 'criadas')

      const response = await fetch(`/api/gestor/oportunidades-por-vendedor-data?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setOportunidadesModal(result.data || [])
      }
    } catch (error) {
      setOportunidadesModal([])
    } finally {
      setLoadingModal(false)
    }
  }

  // Função para abrir modal com total do dia (todos os vendedores)
  const handleTotalDiaClick = async (data: string, quantidade: number) => {
    if (quantidade === 0) return

    try {
      setLoadingModal(true)
      setModalAberto(true)
      setTituloModal(`Todas as Oportunidades - ${formatarDataCompleta(data)}`)
      setOportunidadesModal([])

      const params = new URLSearchParams()
      params.append('unidade_id', unidadeId?.toString() || '')
      params.append('data', data)
      params.append('tipo', 'criadas')

      const response = await fetch(`/api/gestor/oportunidades-por-data?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setOportunidadesModal(result.data || [])
      }
    } catch (error) {
      setOportunidadesModal([])
    } finally {
      setLoadingModal(false)
    }
  }

  // Função para abrir modal com total do vendedor (todas as datas)
  const handleTotalVendedorClick = async (vendedorId: number, vendedorNome: string, quantidade: number) => {
    if (quantidade === 0) return

    try {
      setLoadingModal(true)
      setModalAberto(true)
      setTituloModal(`${vendedorNome} - Período Completo`)
      setOportunidadesModal([])

      const params = new URLSearchParams()
      params.append('unidade_id', unidadeId?.toString() || '')
      params.append('vendedor_id', vendedorId.toString())
      params.append('data_inicio', dataInicio)
      params.append('data_fim', dataFim)
      params.append('tipo', 'criadas')

      const response = await fetch(`/api/gestor/oportunidades-por-vendedor-periodo?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setOportunidadesModal(result.data || [])
      }
    } catch (error) {
      setOportunidadesModal([])
    } finally {
      setLoadingModal(false)
    }
  }

  // Função para formatar data completa
  const formatarDataCompleta = (data: string) => {
    if (!data) return ''
    const [year, month, day] = data.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    })
  }

  useEffect(() => {
    if (!unidadeId || !dataInicio || !dataFim) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.append('tipo', 'criadas')
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
        setError('Erro ao buscar dados de oportunidades diárias')
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
            <div className="text-gray-500">Carregando oportunidades diárias...</div>
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

  // Gerar todas as datas do período (evitando problemas de timezone)
  const todasDatas: string[] = []
  
  // Validar formato das datas recebidas
  if (!dataInicio.match(/^\d{4}-\d{2}-\d{2}$/) || !dataFim.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return null
  }
  
  const [startYear, startMonth, startDay] = dataInicio.split('-').map(Number)
  const [endYear, endMonth, endDay] = dataFim.split('-').map(Number)
  
  // Validar valores
  if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay) || 
      isNaN(endYear) || isNaN(endMonth) || isNaN(endDay)) {
    return null
  }
  
  // Gerar datas diretamente sem usar Date object para evitar problemas de timezone
  let currentYear = startYear
  let currentMonth = startMonth
  let currentDay = startDay
  
  while (true) {
    const dataFormatada = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
    
    // Se passou do fim, parar
    if (dataFormatada > dataFim) {
      break
    }
    
    // Adicionar data válida
    if (dataFormatada >= dataInicio && dataFormatada <= dataFim) {
      todasDatas.push(dataFormatada)
    }
    
    // Avançar para o próximo dia
    currentDay++
    
    // Verificar se precisa avançar o mês
    // FIX: usar (currentMonth) para obter dias do mês ATUAL
    // new Date(year, month, 0) retorna último dia do mês ANTERIOR
    // Então para novembro (mês 11), usamos new Date(2025, 11, 0) que dá outubro (31 dias) - ERRADO!
    // Correto: new Date(2025, 12, 0) que dá novembro (30 dias) - CORRETO!
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    if (currentDay > daysInMonth) {
      currentDay = 1
      currentMonth++
      
      // Verificar se precisa avançar o ano
      if (currentMonth > 12) {
        currentMonth = 1
        currentYear++
      }
    }
    
    // Proteção contra loop infinito
    if (currentYear > endYear + 1) {
      break
    }
  }

  // Criar Set para verificação rápida de datas válidas
  const datasValidasSet = new Set(todasDatas)

  // Criar mapa: vendedor_id -> data -> quantidade
  const vendedoresMap = new Map<number, {
    vendedor_id: number
    vendedor_nome: string
    dadosPorData: Map<string, number>
    total: number
  }>()

  // Filtrar dados para incluir apenas datas dentro do período
  dadosPorVendedor
    .filter(item => item.data && datasValidasSet.has(item.data))
    .forEach(item => {
      if (!vendedoresMap.has(item.vendedor_id)) {
        vendedoresMap.set(item.vendedor_id, {
          vendedor_id: item.vendedor_id,
          vendedor_nome: item.vendedor_nome,
          dadosPorData: new Map(),
          total: 0
        })
      }
      const vendedor = vendedoresMap.get(item.vendedor_id)!
      if (item.data) {
        vendedor.dadosPorData.set(item.data, item.total)
        vendedor.total += item.total
      }
    })

  const vendedores = Array.from(vendedoresMap.values()).sort((a, b) => b.total - a.total)

  // Se não houver dados, não mostrar
  if (dados.length === 0 && vendedores.length === 0) {
    return null
  }

  // Calcular totais gerais (filtrando apenas datas dentro do período)
  const totalGeral = dados
    .filter(item => item.data && datasValidasSet.has(item.data))
    .reduce((sum, item) => sum + item.total, 0)

  // Função para formatar data (header) - evitando problemas de timezone
  const formatarDataHeader = (data: string) => {
    // Fazer parsing manual para evitar problemas de timezone
    const [year, month, day] = data.split('-').map(Number)
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
  }

  // Função para formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value)
  }

  return (
    <Card className="border-blue-600 border-2 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-white" />
            <div>
              <div className="text-base font-bold text-white tracking-wide">
                Oportunidades Criadas Dia a Dia por Vendedor
              </div>
              <div className="text-xs text-blue-100 font-medium">
                Distribuição diária de oportunidades criadas no período
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <div className="text-[10px] text-blue-100 font-medium">Total</div>
              <div className="font-bold text-sm text-white">{totalGeral} ops</div>
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-blue-200">
                <TableHead className="sticky left-0 z-20 bg-gradient-to-r from-slate-50 to-slate-100 min-w-[140px] border-r-2 border-blue-200 h-10 px-3 text-xs font-bold text-gray-700 uppercase">
                  Vendedor
                </TableHead>
                {todasDatas.map(data => (
                  <TableHead
                    key={data}
                    className="text-center min-w-[50px] h-10 px-1.5 text-xs font-bold text-gray-700"
                  >
                    {formatarDataHeader(data)}
                  </TableHead>
                ))}
                <TableHead className="text-center bg-blue-50 min-w-[70px] border-l-2 border-blue-300 h-10 px-3 text-xs font-extrabold text-blue-800 uppercase">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map((vendedor, index) => (
                <TableRow key={vendedor.vendedor_id} className={`hover:bg-slate-50/80 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} border-b transition-colors`}>
                  <TableCell className={`sticky left-0 z-10 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} border-r-2 border-slate-200 font-bold text-xs px-3 py-2.5 text-slate-700`}>
                    <div className="truncate max-w-[130px]" title={vendedor.vendedor_nome}>
                      {vendedor.vendedor_nome}
                    </div>
                  </TableCell>
                  {todasDatas.map(data => {
                    const quantidade = vendedor.dadosPorData.get(data) || 0
                    return (
                      <TableCell
                        key={`${vendedor.vendedor_id}-${data}`}
                        className={`text-center text-sm py-2.5 px-2 font-bold border-l border-slate-200 ${quantidade > 0 ? 'text-blue-600 cursor-pointer hover:bg-blue-50 hover:scale-105 transition-all duration-200' : 'text-gray-400'}`}
                        onClick={() => quantidade > 0 && handleCelulaClick(vendedor.vendedor_id, vendedor.vendedor_nome, data, quantidade)}
                      >
                        {quantidade > 0 ? quantidade : '-'}
                      </TableCell>
                    )
                  })}
                  <TableCell 
                    className={`text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-3 py-2.5 text-sm text-blue-700 ${vendedor.total > 0 ? 'cursor-pointer hover:bg-blue-100 hover:scale-105 transition-all duration-200' : ''}`}
                    onClick={() => vendedor.total > 0 && handleTotalVendedorClick(vendedor.vendedor_id, vendedor.vendedor_nome, vendedor.total)}
                  >
                    {vendedor.total}
                  </TableCell>
                </TableRow>
              ))}
              {/* Linha de totais */}
              {vendedores.length > 0 && (
                <TableRow className="hover:bg-slate-50/80 bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-300">
                  <TableCell className="sticky left-0 z-10 bg-gradient-to-r from-blue-50 to-blue-100 border-r-2 border-slate-200 font-extrabold text-xs px-3 py-2.5 text-slate-800 uppercase">
                    Total
                  </TableCell>
                  {todasDatas.map(data => {
                    const totalDia = dados.find(d => d.data === data)?.total || 0
                    return (
                      <TableCell
                        key={`total-${data}`}
                        className={`text-center font-extrabold text-sm py-2.5 px-2 border-l border-slate-200 ${totalDia > 0 ? 'text-blue-700 cursor-pointer hover:bg-blue-50 hover:scale-105 transition-all duration-200' : 'text-gray-400'}`}
                        onClick={() => totalDia > 0 && handleTotalDiaClick(data, totalDia)}
                      >
                        {totalDia > 0 ? totalDia : '-'}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center bg-blue-100 font-extrabold border-l-2 border-blue-400 px-3 py-2.5 text-sm text-blue-800">
                    {totalGeral}
                  </TableCell>
                </TableRow>
              )}
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
              {oportunidadesModal.length} oportunidade(s) encontrada(s)
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
                    <TableHead className="w-[150px]">Vendedor</TableHead>
                    <TableHead className="text-right w-[120px]">Valor</TableHead>
                    <TableHead className="text-center w-[120px]">Data Criação</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidadesModal.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">{op.id}</TableCell>
                      <TableCell>{op.title}</TableCell>
                      <TableCell className="text-sm">{op.vendedor_nome || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {op.value > 0 ? formatCurrency(op.value) : '-'}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(op.createDate).toLocaleDateString('pt-BR')}
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

