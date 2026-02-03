"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { AlertCircle, ExternalLink, SlidersHorizontal, TrendingUp } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExportToExcelButton } from "@/components/ExportToExcelButton"

type OportunidadeColumn = {
  key: string
  label: string
}

const OPORTUNIDADE_COLUNAS: OportunidadeColumn[] = [
  { key: "id", label: "ID" },
  { key: "title", label: "Título" },
  { key: "value", label: "Valor" },
  { key: "status", label: "Status" },
  { key: "crm_column", label: "Coluna CRM" },
  { key: "lead_id", label: "Lead ID" },
  { key: "sequence", label: "Sequência" },
  { key: "loss_reason", label: "Motivo de perda" },
  { key: "gain_reason", label: "Motivo de ganho" },
  { key: "expectedCloseDate", label: "Previsão de fechamento" },
  { key: "sale_channel", label: "Canal de venda" },
  { key: "campaign", label: "Campanha" },
  { key: "user", label: "User (owner)" },
  { key: "last_column_change", label: "Última mudança de coluna" },
  { key: "last_status_change", label: "Última mudança de status" },
  { key: "gain_date", label: "Data ganho" },
  { key: "lost_date", label: "Data perda" },
  { key: "reopen_date", label: "Data reabertura" },
  { key: "await_column_approved", label: "Aguardando aprovação coluna" },
  { key: "await_column_approved_user", label: "Usuário aprovação coluna" },
  { key: "reject_appro", label: "Reprovada (aprovação)" },
  { key: "reject_appro_desc", label: "Motivo reprovação" },
  { key: "conf_installment", label: "Config. parcelas (JSON)" },
  { key: "fields", label: "Fields (JSON)" },
  { key: "dataLead", label: "DataLead (JSON)" },
  { key: "createDate", label: "Data criação" },
  { key: "updateDate", label: "Data atualização" },
  { key: "archived", label: "Arquivada" },
  { key: "created_at", label: "Created at" },
  { key: "coluna_funil_id", label: "Coluna funil ID" },
  { key: "vendedor_nome", label: "Vendedor" },
]

const DEFAULT_COLUNAS_MODAL_CRIADAS = [
  "id",
  "title",
  "vendedor_nome",
  "value",
  "createDate",
  "status",
]

const STORAGE_KEY_COLUNAS_MODAL_CRIADAS = "gestor:oportunidades-diarias:oportunidades-modal:colunas:v1"

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
  value: number | null
  vendedor_nome?: string | null
  status?: string | null
  [key: string]: unknown
}

interface GestorOportunidadesDiariasProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
  funilId?: string | null
}

export const GestorOportunidadesDiarias = memo(function GestorOportunidadesDiarias({
  unidadeId,
  dataInicio,
  dataFim,
  funilId
}: GestorOportunidadesDiariasProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dados, setDados] = useState<OportunidadeDiaria[]>([])
  const [dadosPorVendedor, setDadosPorVendedor] = useState<OportunidadeDiariaVendedor[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [oportunidadesModal, setOportunidadesModal] = useState<Oportunidade[]>([])
  const [tituloModal, setTituloModal] = useState<string>('')
  const [loadingModal, setLoadingModal] = useState(false)
  const [colunasModal, setColunasModal] = useState<string[]>(DEFAULT_COLUNAS_MODAL_CRIADAS)

  // Hooks do seletor de colunas precisam ficar ANTES de qualquer return condicional
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLUNAS_MODAL_CRIADAS)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return

      const allowedKeys = new Set(OPORTUNIDADE_COLUNAS.map((c) => c.key))
      const sanitized = parsed.filter(
        (k): k is string => typeof k === "string" && allowedKeys.has(k)
      )
      if (sanitized.length > 0) {
        setColunasModal(sanitized)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLUNAS_MODAL_CRIADAS, JSON.stringify(colunasModal))
    } catch {
      // ignore
    }
  }, [colunasModal])

  const colunasVisiveis = useMemo(() => {
    const selected = new Set(colunasModal)
    return OPORTUNIDADE_COLUNAS.filter((c) => selected.has(c.key))
  }, [colunasModal])

  const selecionarTodasColunas = () => {
    setColunasModal(OPORTUNIDADE_COLUNAS.map((c) => c.key))
  }

  const resetarColunas = () => {
    setColunasModal(DEFAULT_COLUNAS_MODAL_CRIADAS)
  }

  const alternarColuna = (key: string, checked: boolean) => {
    setColunasModal((prev) => {
      const set = new Set(prev)
      if (checked) {
        set.add(key)
        return Array.from(set)
      }
      set.delete(key)
      if (set.size === 0) return prev
      return Array.from(set)
    })
  }

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
      if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
        params.append('funil_id', funilId)
      }

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
      if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
        params.append('funil_id', funilId)
      }

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
      if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
        params.append('funil_id', funilId)
      }

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
        if (funilId && funilId !== 'todos' && funilId !== 'undefined') {
          params.append('funil_id', funilId)
        }

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
  }, [unidadeId, dataInicio, dataFim, funilId])

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
    // CORREÇÃO: Para obter os dias do mês atual, usar currentMonth diretamente
    // new Date(year, month, 0) retorna o último dia do mês ANTERIOR (em 0-indexed)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
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
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const mesLabel = meses[month - 1] ?? String(month).padStart(2, '0')
    return {
      dia: String(day).padStart(2, '0'),
      mes: mesLabel,
      completo: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    }
  }

  // Função para formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatarDataPtBr = (dateTime?: string) => {
    if (!dateTime) return '-'

    const datePart = dateTime.split('T')[0]?.split(' ')[0] ?? ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return '-'

    const [year, month, day] = datePart.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }


  const formatarValorTabela = (key: string, value: unknown) => {
    if (value === null || value === undefined) return "-"

    const dateKeys = new Set([
      "createDate",
      "updateDate",
      "gain_date",
      "lost_date",
      "reopen_date",
      "last_column_change",
      "last_status_change",
      "created_at",
      "expectedCloseDate",
    ])

    if (key === "value") {
      const num = Number(value)
      return Number.isFinite(num) && num > 0 ? formatCurrency(num) : "-"
    }

    if (key === "archived" || key === "await_column_approved" || key === "reject_appro") {
      const num = Number(value)
      if (Number.isFinite(num)) return num === 1 ? "Sim" : "Não"
      if (typeof value === "boolean") return value ? "Sim" : "Não"
      return String(value)
    }

    if (dateKeys.has(key) && typeof value === "string") {
      return formatarDataPtBr(value)
    }

    if (typeof value === "object") {
      const str = JSON.stringify(value)
      return str.length > 80 ? `${str.slice(0, 80)}…` : str
    }

    const str = String(value)
    return str.length > 80 ? `${str.slice(0, 80)}…` : str
  }

  const gerarFilenameExcel = (base: string) => {
    const safe = base
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .replace(/\s+/g, "_")
      .trim()
    return safe.length > 0 ? safe : "oportunidades"
  }

  return (
    <Card className="border-primary border-2 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="card-header-brand">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="card-header-brand-icon" />
            <div>
              <div className="card-header-brand-title">
                Oportunidades Criadas Dia a Dia por Vendedor
              </div>
              <div className="card-header-brand-subtitle">
                Distribuição diária de oportunidades criadas no período
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs shrink-0 text-primary-foreground">
            <div className="text-right">
              <div className="text-[10px] text-primary-foreground/80 font-medium">Total</div>
              <div className="font-bold text-[12px] leading-tight">{totalGeral} ops</div>
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
                {todasDatas.map(data => {
                  const header = formatarDataHeader(data)
                  return (
                  <TableHead
                    key={data}
                    className="text-center min-w-[56px] h-10 px-1.5 text-xs font-bold text-gray-700 whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center leading-none" title={header.completo}>
                      <span className="text-[11px] font-extrabold text-gray-800 tabular-nums">{header.dia}</span>
                      <span className="text-[10px] font-semibold text-gray-500">{header.mes}</span>
                    </div>
                  </TableHead>
                  )
                })}
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
                        className={`text-center text-sm py-2.5 px-2 font-bold border-l border-slate-200 ${quantidade > 0 ? 'text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors' : 'text-gray-400'}`}
                        onClick={() => quantidade > 0 && handleCelulaClick(vendedor.vendedor_id, vendedor.vendedor_nome, data, quantidade)}
                      >
                        {quantidade > 0 ? quantidade : '-'}
                      </TableCell>
                    )
                  })}
                  <TableCell 
                    className={`text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-3 py-2.5 text-sm text-blue-700 ${vendedor.total > 0 ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
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
                        className={`text-center font-extrabold text-sm py-2.5 px-2 border-l border-slate-200 ${totalDia > 0 ? 'text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors' : 'text-gray-400'}`}
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
        <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-6xl flex-col overflow-hidden p-0">
          <div className="border-b px-4 py-3 pr-12">
            <div className="flex items-start justify-between gap-3">
              <DialogHeader className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600 shrink-0" />
                  <span className="truncate" title={tituloModal}>
                    {tituloModal}
                  </span>
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
                  <span>{oportunidadesModal.length} oportunidade(s) encontrada(s)</span>
                  {!loadingModal && oportunidadesModal.length > 0 && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(
                          oportunidadesModal.reduce((sum, op) => sum + (Number(op.value) || 0), 0)
                        )}
                      </span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="flex shrink-0 items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Colunas</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-auto">
                    <DropdownMenuLabel>Colunas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        resetarColunas()
                      }}
                    >
                      Usar padrão
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        selecionarTodasColunas()
                      }}
                    >
                      Selecionar todas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {OPORTUNIDADE_COLUNAS.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={colunasModal.includes(col.key)}
                        onCheckedChange={(checked) => alternarColuna(col.key, Boolean(checked))}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <ExportToExcelButton
                  data={oportunidadesModal}
                  filename={gerarFilenameExcel(`oportunidades_criadas_${tituloModal}`)}
                  sheetName="Oportunidades Criadas"
                  disabled={loadingModal || oportunidadesModal.length === 0}
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  colorScheme="blue"
                  columns={colunasVisiveis.map((c) => ({
                    key: c.key,
                    label: c.label,
                    format: (value) => {
                      if (value === null || value === undefined) return "-"
                      if (typeof value === "object") return JSON.stringify(value)
                      if (c.key === "value") {
                        const num = Number(value)
                        return Number.isFinite(num) ? formatCurrency(num) : "-"
                      }
                      if (
                        c.key === "archived" ||
                        c.key === "await_column_approved" ||
                        c.key === "reject_appro"
                      ) {
                        const num = Number(value)
                        if (Number.isFinite(num)) return num === 1 ? "Sim" : "Não"
                      }
                      if (typeof value === "string") {
                        const dateKeys = new Set([
                          "createDate",
                          "updateDate",
                          "gain_date",
                          "lost_date",
                          "reopen_date",
                          "last_column_change",
                          "last_status_change",
                          "created_at",
                          "expectedCloseDate",
                        ])
                        if (dateKeys.has(c.key)) return formatarDataPtBr(value)
                      }
                      return String(value)
                    },
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            {loadingModal ? (
              <div className="flex items-center justify-center py-10">
                <div className="text-muted-foreground">Carregando oportunidades...</div>
              </div>
            ) : oportunidadesModal.length > 0 ? (
              <div className="rounded-md border">
                <div className="max-h-[55vh] overflow-x-scroll overflow-y-auto scrollbar-gutter-stable">
                  <Table className="min-w-full">
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow className="bg-background">
                        {colunasVisiveis.map((col) => (
                          <TableHead
                            key={col.key}
                            className={
                              col.key === "value"
                                ? "text-right bg-background min-w-[140px]"
                                : col.key === "id"
                                  ? "bg-background min-w-[90px]"
                                  : "bg-background min-w-[180px]"
                            }
                          >
                            {col.label}
                          </TableHead>
                        ))}
                        <TableHead className="w-[70px] bg-background"> </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {oportunidadesModal.map((op) => {
                        const crmUrl =
                          process.env.NEXT_PUBLIC_URL_PUBLIC || 'https://grupointeli.sprinthub.app'
                        const oportunidade = op as Record<string, unknown>

                        return (
                          <TableRow key={op.id} className="align-middle">
                            {colunasVisiveis.map((col) => {
                              const rawValue = oportunidade[col.key]
                              const rendered = formatarValorTabela(col.key, rawValue)
                              const isRight = col.key === "value"
                              const isId = col.key === "id"

                              return (
                                <TableCell
                                  key={`${op.id}-${col.key}`}
                                  className={[
                                    isRight ? "text-right tabular-nums" : "",
                                    isId ? "font-medium tabular-nums" : "",
                                    col.key === "title" ? "max-w-[520px]" : "",
                                  ].join(" ")}
                                >
                                  {col.key === "title" ? (
                                    <div className="truncate" title={String(rawValue ?? "")}>
                                      {rendered}
                                    </div>
                                  ) : (
                                    <span title={typeof rawValue === "string" ? rawValue : undefined}>
                                      {rendered}
                                    </span>
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                aria-label={`Abrir oportunidade ${op.id} no CRM`}
                                onClick={() => {
                                  window.open(`${crmUrl}/sh/crm?opportunityID=${op.id}`, '_blank')
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                Nenhuma oportunidade encontrada
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
})

