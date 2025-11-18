import { memo, useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { PainelFiltros } from '@/types/painel.types'

interface Oportunidade {
  id: number
  nome: string
  valor: number
  data: string
  dataCriacao?: string
  motivoPerda?: string | null
  vendedorId: number | null
  vendedorNome: string
}

type StatusType = 'abertas' | 'ganhas' | 'perdidas'

interface PainelUnidadeDialogProps {
  unidadeId: number | null
  unidadeNome: string
  status: StatusType
  filtros: PainelFiltros
  mesAtual: number
  anoAtual: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function calcularPeriodo(tipo: string): { inicio: string; fim: string } {
  const hoje = new Date()
  const inicio = new Date()
  const fim = new Date()

  switch (tipo) {
    case 'este-mes':
      inicio.setDate(1)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      break
    case 'mes-passado':
      inicio.setMonth(hoje.getMonth() - 1, 1)
      inicio.setHours(0, 0, 0, 0)
      fim.setDate(0)
      fim.setHours(23, 59, 59, 999)
      break
    case 'esta-semana':
      const diaSemana = hoje.getDay()
      inicio.setDate(hoje.getDate() - diaSemana)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      break
    case 'semana-passada':
      const diaSemanaAtual = hoje.getDay()
      inicio.setDate(hoje.getDate() - diaSemanaAtual - 7)
      inicio.setHours(0, 0, 0, 0)
      fim.setDate(hoje.getDate() - diaSemanaAtual - 1)
      fim.setHours(23, 59, 59, 999)
      break
    case 'este-ano':
      inicio.setMonth(0, 1)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      break
    case 'ano-anterior':
      inicio.setFullYear(hoje.getFullYear() - 1, 0, 1)
      inicio.setHours(0, 0, 0, 0)
      fim.setFullYear(hoje.getFullYear() - 1, 11, 31)
      fim.setHours(23, 59, 59, 999)
      break
    default:
      return { inicio: '', fim: '' }
  }

  return {
    inicio: inicio.toISOString().split('T')[0],
    fim: fim.toISOString().split('T')[0]
  }
}

type SortField = 'id' | 'nome' | 'vendedorNome' | 'valor' | 'data' | 'tempoPerdido' | 'motivoPerda' | 'wonTime' | 'tempoAberto'
type SortDirection = 'asc' | 'desc'

export const PainelUnidadeDialog = memo(function PainelUnidadeDialog({
  unidadeId,
  unidadeNome,
  status,
  filtros,
  mesAtual,
  anoAtual,
  open,
  onOpenChange
}: PainelUnidadeDialogProps) {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    if (!open || !unidadeId) {
      setOportunidades([])
      setSearchTerm('')
      setSortField('id')
      setSortDirection('desc')
      return
    }

    const fetchOportunidades = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()

        // Para oportunidades abertas, não filtrar por período (mostrar todas)
        // Para ganhas e perdidas, aplicar filtro de período
        if (status !== 'abertas') {
          // Calcular período
          let periodoCalculado: { inicio: string; fim: string }
          if (filtros.periodoTipo === 'personalizado' && filtros.periodoInicio && filtros.periodoFim) {
            periodoCalculado = {
              inicio: filtros.periodoInicio,
              fim: filtros.periodoFim
            }
          } else if (filtros.periodoTipo !== 'personalizado') {
            periodoCalculado = calcularPeriodo(filtros.periodoTipo)
          } else {
            periodoCalculado = calcularPeriodo('este-mes')
          }

          if (periodoCalculado.inicio && periodoCalculado.fim) {
            params.append('data_inicio', periodoCalculado.inicio)
            params.append('data_fim', periodoCalculado.fim)
          }
        }

        if (filtros.funilSelecionado !== 'todos') {
          params.append('funil_id', filtros.funilSelecionado)
        }

        const endpoint = `/api/unidades/${unidadeId}/oportunidades-${status}?${params.toString()}`
        const response = await fetch(endpoint)
        const data = await response.json()

        if (!response.ok || !data.success) {
          const errorMsg = data.error || data.message || 'Erro ao carregar oportunidades'
          throw new Error(errorMsg)
        }

        setOportunidades(data.oportunidades || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setOportunidades([])
      } finally {
        setLoading(false)
      }
    }

    fetchOportunidades()
  }, [open, unidadeId, status, filtros, mesAtual, anoAtual])

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }, [])

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date)
    } catch {
      return dateString
    }
  }, [])

  const calcularTempoDesde = (dateString: string): string => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      const agora = new Date()
      agora.setHours(0, 0, 0, 0)
      date.setHours(0, 0, 0, 0)
      
      const diffMs = agora.getTime() - date.getTime()
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDias < 0) return 'Hoje'
      if (diffDias === 0) return 'Hoje'
      if (diffDias === 1) return '1 dia'
      if (diffDias < 30) return `${diffDias} dias`
      
      const diffMeses = Math.floor(diffDias / 30)
      if (diffMeses === 1) return '1 mês'
      if (diffMeses < 12) return `${diffMeses} meses`
      
      const diffAnos = Math.floor(diffMeses / 12)
      return diffAnos === 1 ? '1 ano' : `${diffAnos} anos`
    } catch {
      return '-'
    }
  }

  const calcularTempoCriacaoParaPerda = (dataCriacao: string | undefined, dataPerda: string): string => {
    if (!dataCriacao || !dataPerda) return '-'
    try {
      const criacao = new Date(dataCriacao)
      const perda = new Date(dataPerda)
      
      if (isNaN(criacao.getTime()) || isNaN(perda.getTime())) return '-'
      
      criacao.setHours(0, 0, 0, 0)
      perda.setHours(0, 0, 0, 0)
      
      const diffMs = perda.getTime() - criacao.getTime()
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDias < 0) return '0 dias'
      if (diffDias === 0) return '0 dias'
      if (diffDias === 1) return '1 dia'
      if (diffDias < 30) return `${diffDias} dias`
      
      const diffMeses = Math.floor(diffDias / 30)
      if (diffMeses === 1) return '1 mês'
      if (diffMeses < 12) return `${diffMeses} meses`
      
      const diffAnos = Math.floor(diffMeses / 12)
      return diffAnos === 1 ? '1 ano' : `${diffAnos} anos`
    } catch {
      return '-'
    }
  }

  const calcularTempoPerdidoEmDias = (dataCriacao: string | undefined, dataPerda: string): number => {
    if (!dataCriacao || !dataPerda) return 0
    try {
      const criacao = new Date(dataCriacao)
      const perda = new Date(dataPerda)
      
      if (isNaN(criacao.getTime()) || isNaN(perda.getTime())) return 0
      
      criacao.setHours(0, 0, 0, 0)
      perda.setHours(0, 0, 0, 0)
      
      const diffMs = perda.getTime() - criacao.getTime()
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } catch {
      return 0
    }
  }

  const calcularTempoCriacaoParaGanho = (dataCriacao: string | undefined, dataGanho: string): string => {
    if (!dataCriacao || !dataGanho) return '-'
    try {
      const criacao = new Date(dataCriacao)
      const ganho = new Date(dataGanho)
      
      if (isNaN(criacao.getTime()) || isNaN(ganho.getTime())) return '-'
      
      criacao.setHours(0, 0, 0, 0)
      ganho.setHours(0, 0, 0, 0)
      
      const diffMs = ganho.getTime() - criacao.getTime()
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDias < 0) return '0 dias'
      if (diffDias === 0) return '0 dias'
      if (diffDias === 1) return '1 dia'
      if (diffDias < 30) return `${diffDias} dias`
      
      const diffMeses = Math.floor(diffDias / 30)
      if (diffMeses === 1) return '1 mês'
      if (diffMeses < 12) return `${diffMeses} meses`
      
      const diffAnos = Math.floor(diffMeses / 12)
      return diffAnos === 1 ? '1 ano' : `${diffAnos} anos`
    } catch {
      return '-'
    }
  }

  const calcularWonTimeEmDias = (dataCriacao: string | undefined, dataGanho: string): number => {
    if (!dataCriacao || !dataGanho) return 0
    try {
      const criacao = new Date(dataCriacao)
      const ganho = new Date(dataGanho)
      
      if (isNaN(criacao.getTime()) || isNaN(ganho.getTime())) return 0
      
      criacao.setHours(0, 0, 0, 0)
      ganho.setHours(0, 0, 0, 0)
      
      const diffMs = ganho.getTime() - criacao.getTime()
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } catch {
      return 0
    }
  }

  const calcularTempoEmAberto = (dataCriacao: string | undefined): string => {
    if (!dataCriacao) return '-'
    try {
      const criacao = new Date(dataCriacao)
      const hoje = new Date()
      
      if (isNaN(criacao.getTime())) return '-'
      
      criacao.setHours(0, 0, 0, 0)
      hoje.setHours(0, 0, 0, 0)
      
      const diffMs = hoje.getTime() - criacao.getTime()
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDias < 0) return '0 dias'
      if (diffDias === 0) return 'Hoje'
      if (diffDias === 1) return '1 dia'
      if (diffDias < 30) return `${diffDias} dias`
      
      const diffMeses = Math.floor(diffDias / 30)
      if (diffMeses === 1) return '1 mês'
      if (diffMeses < 12) return `${diffMeses} meses`
      
      const diffAnos = Math.floor(diffMeses / 12)
      return diffAnos === 1 ? '1 ano' : `${diffAnos} anos`
    } catch {
      return '-'
    }
  }

  const calcularTempoAbertoEmDias = (dataCriacao: string | undefined): number => {
    if (!dataCriacao) return 0
    try {
      const criacao = new Date(dataCriacao)
      const hoje = new Date()
      
      if (isNaN(criacao.getTime())) return 0
      
      criacao.setHours(0, 0, 0, 0)
      hoje.setHours(0, 0, 0, 0)
      
      const diffMs = hoje.getTime() - criacao.getTime()
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } catch {
      return 0
    }
  }

  const oportunidadesFiltradasEOrdenadas = useMemo(() => {
    let filtered = [...oportunidades]

    // Filtrar por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      const termNumerico = term.replace(/[^\d]/g, '') // Remove tudo exceto números
      
      filtered = filtered.filter(op => {
        // Busca por ID
        if (op.id?.toString().includes(termNumerico) && termNumerico) return true
        
        // Busca por nome da oportunidade
        if (op.nome?.toLowerCase().includes(term)) return true
        
        // Busca por vendedor
        if (op.vendedorNome?.toLowerCase().includes(term)) return true
        
        // Busca por valor (número bruto)
        if (termNumerico && op.valor?.toString().replace(/\D/g, '').includes(termNumerico)) return true
        
        // Busca por valor formatado (R$ 1.234,56)
        const valorFormatado = formatCurrency(op.valor || 0).toLowerCase()
        if (valorFormatado.includes(term)) return true
        
        // Busca por data de criação (formatada DD/MM/YYYY)
        if (op.dataCriacao) {
          const dataCriacaoFormatada = formatDate(op.dataCriacao)
          if (dataCriacaoFormatada.includes(term)) return true
          // Busca por números da data
          if (termNumerico && dataCriacaoFormatada.replace(/\D/g, '').includes(termNumerico)) return true
        }
        
        // Busca por data principal (abertura/ganho/perda)
        if (op.data) {
          const dataFormatada = formatDate(op.data)
          if (dataFormatada.includes(term)) return true
          // Busca por números da data
          if (termNumerico && dataFormatada.replace(/\D/g, '').includes(termNumerico)) return true
        }
        
        // Busca por Tempo em Aberto (apenas para abertas)
        if (op.dataCriacao) {
          const tempoAberto = calcularTempoEmAberto(op.dataCriacao).toLowerCase()
          if (tempoAberto.includes(term)) return true
        }
        
        // Busca por Won Time (apenas para ganhas)
        if (op.dataCriacao && op.data) {
          const wonTime = calcularTempoCriacaoParaGanho(op.dataCriacao, op.data).toLowerCase()
          if (wonTime.includes(term)) return true
        }
        
        // Busca por Tempo Perdido (apenas para perdidas)
        if (op.dataCriacao && op.data) {
          const tempoPerdido = calcularTempoCriacaoParaPerda(op.dataCriacao, op.data).toLowerCase()
          if (tempoPerdido.includes(term)) return true
        }
        
        // Busca por motivo de perda (apenas para perdidas)
        if (op.motivoPerda && op.motivoPerda.toLowerCase().includes(term)) return true
        
        return false
      })
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        case 'nome':
          aValue = a.nome.toLowerCase()
          bValue = b.nome.toLowerCase()
          break
        case 'vendedorNome':
          aValue = a.vendedorNome.toLowerCase()
          bValue = b.vendedorNome.toLowerCase()
          break
        case 'valor':
          aValue = a.valor
          bValue = b.valor
          break
        case 'data':
          aValue = new Date(a.data).getTime()
          bValue = new Date(b.data).getTime()
          break
        case 'tempoPerdido':
          aValue = calcularTempoPerdidoEmDias(a.dataCriacao, a.data)
          bValue = calcularTempoPerdidoEmDias(b.dataCriacao, b.data)
          break
        case 'motivoPerda':
          aValue = (a.motivoPerda || '').toLowerCase()
          bValue = (b.motivoPerda || '').toLowerCase()
          break
        case 'wonTime':
          aValue = calcularWonTimeEmDias(a.dataCriacao, a.data)
          bValue = calcularWonTimeEmDias(b.dataCriacao, b.data)
          break
        case 'tempoAberto':
          aValue = calcularTempoAbertoEmDias(a.dataCriacao)
          bValue = calcularTempoAbertoEmDias(b.dataCriacao)
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [oportunidades, searchTerm, sortField, sortDirection, formatCurrency, formatDate, calcularTempoCriacaoParaGanho, calcularTempoCriacaoParaPerda, calcularTempoPerdidoEmDias, calcularWonTimeEmDias, calcularTempoEmAberto, calcularTempoAbertoEmDias])

  const valorTotal = oportunidadesFiltradasEOrdenadas.reduce((sum, op) => sum + op.valor, 0)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const statusLabels = {
    abertas: { title: 'Oportunidades Abertas', singular: 'aberta', plural: 'abertas', dateLabel: 'Data Criação', color: 'text-blue-400' },
    ganhas: { title: 'Oportunidades Ganhas', singular: 'ganha', plural: 'ganhas', dateLabel: 'Data Ganho', color: 'text-green-400' },
    perdidas: { title: 'Oportunidades Perdidas', singular: 'perdida', plural: 'perdidas', dateLabel: 'Data Perda', color: 'text-red-400' }
  }

  const statusInfo = statusLabels[status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white w-[70vw] max-w-none max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {statusInfo.title} - {unidadeNome}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {oportunidadesFiltradasEOrdenadas.length} de {oportunidades.length} oportunidade{oportunidades.length !== 1 ? 's' : ''} {oportunidades.length !== 1 ? statusInfo.plural : statusInfo.singular}
            {valorTotal > 0 && ` • Total: ${formatCurrency(valorTotal)}`}
          </DialogDescription>
        </DialogHeader>

        {/* Campo de Busca */}
        <div className="mt-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={
                status === 'perdidas' 
                  ? "Buscar por ID, nome, vendedor, valor, datas, tempo perdido ou motivo..." 
                  : status === 'ganhas'
                  ? "Buscar por ID, nome, vendedor, valor, datas ou won time..."
                  : "Buscar por ID, nome, vendedor, valor, datas ou tempo em aberto..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-400">Carregando oportunidades...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-500">Erro: {error}</div>
            </div>
          ) : oportunidades.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Nenhuma oportunidade {statusInfo.singular} encontrada</div>
            </div>
          ) : oportunidadesFiltradasEOrdenadas.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Nenhuma oportunidade encontrada com o termo de busca</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div 
                className={`grid px-4 py-2 bg-gray-800/50 rounded-lg text-xs font-semibold text-gray-300 uppercase gap-3`}
                style={status === 'perdidas' ? { gridTemplateColumns: '70px minmax(150px, 2fr) minmax(140px, 1.5fr) minmax(110px, 1fr) 110px 110px minmax(100px, 1fr) minmax(150px, 2fr)' } : status === 'ganhas' ? { gridTemplateColumns: '70px minmax(150px, 2.5fr) minmax(140px, 1.5fr) minmax(110px, 1fr) 110px 110px minmax(100px, 1fr)' } : { gridTemplateColumns: '70px minmax(150px, 2.5fr) minmax(140px, 1.5fr) minmax(110px, 1fr) 110px minmax(100px, 1fr)' }}
              >
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center justify-start hover:text-white transition-colors"
                >
                  ID {getSortIcon('id')}
                </button>
                <button
                  onClick={() => handleSort('nome')}
                  className="flex items-center justify-start hover:text-white transition-colors"
                >
                  Oportunidade {getSortIcon('nome')}
                </button>
                <button
                  onClick={() => handleSort('vendedorNome')}
                  className="flex items-center justify-start hover:text-white transition-colors"
                >
                  Vendedor {getSortIcon('vendedorNome')}
                </button>
                <button
                  onClick={() => handleSort('valor')}
                  className="flex items-center justify-start hover:text-white transition-colors"
                >
                  Valor {getSortIcon('valor')}
                </button>
                {(status === 'perdidas' || status === 'ganhas') && (
                  <div className="text-left">Data Criação</div>
                )}
                <button
                  onClick={() => handleSort('data')}
                  className="flex items-center justify-start hover:text-white transition-colors"
                >
                  {statusInfo.dateLabel} {getSortIcon('data')}
                </button>
                {status === 'abertas' && (
                  <button
                    onClick={() => handleSort('tempoAberto')}
                    className="flex items-center justify-start hover:text-white transition-colors"
                  >
                    Tempo em Aberto {getSortIcon('tempoAberto')}
                  </button>
                )}
                {status === 'ganhas' && (
                  <button
                    onClick={() => handleSort('wonTime')}
                    className="flex items-center justify-start hover:text-white transition-colors"
                  >
                    Won Time {getSortIcon('wonTime')}
                  </button>
                )}
                {status === 'perdidas' && (
                  <button
                    onClick={() => handleSort('tempoPerdido')}
                    className="flex items-center justify-start hover:text-white transition-colors"
                  >
                    Tempo Perdido {getSortIcon('tempoPerdido')}
                  </button>
                )}
                {status === 'perdidas' && (
                  <button
                    onClick={() => handleSort('motivoPerda')}
                    className="flex items-center justify-start hover:text-white transition-colors"
                  >
                    Motivo {getSortIcon('motivoPerda')}
                  </button>
                )}
              </div>
              {oportunidadesFiltradasEOrdenadas.map((op, index) => (
                <div
                  key={op.id}
                  className="grid px-4 py-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors gap-3"
                  style={status === 'perdidas' ? { gridTemplateColumns: '70px minmax(150px, 2fr) minmax(140px, 1.5fr) minmax(110px, 1fr) 110px 110px minmax(100px, 1fr) minmax(150px, 2fr)' } : status === 'ganhas' ? { gridTemplateColumns: '70px minmax(150px, 2.5fr) minmax(140px, 1.5fr) minmax(110px, 1fr) 110px 110px minmax(100px, 1fr)' } : { gridTemplateColumns: '70px minmax(150px, 2.5fr) minmax(140px, 1.5fr) minmax(110px, 1fr) 110px minmax(100px, 1fr)' }}
                >
                  <div className="text-sm font-mono">
                    <a
                      href={`https://grupointeli.sprinthub.app/sh/crm?opportunityID=${op.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                      title={`Abrir oportunidade ${op.id} no CRM`}
                    >
                      {op.id}
                    </a>
                  </div>
                  <div className="text-white font-medium overflow-hidden" title={op.nome}>
                    <div className="truncate">{op.nome}</div>
                  </div>
                  <div className="text-gray-300 text-sm overflow-hidden" title={op.vendedorNome}>
                    <div className="truncate">{op.vendedorNome}</div>
                  </div>
                  <div className={`text-left font-semibold ${statusInfo.color}`}>
                    {formatCurrency(op.valor)}
                  </div>
                  {(status === 'perdidas' || status === 'ganhas') && (
                    <div className="text-left text-gray-400 text-sm whitespace-nowrap">
                      {op.dataCriacao ? formatDate(op.dataCriacao) : '-'}
                    </div>
                  )}
                  <div className="text-left text-gray-400 text-sm whitespace-nowrap">
                    {formatDate(op.data)}
                  </div>
                  {status === 'abertas' && (
                    <div className="text-left text-blue-400 text-sm font-medium whitespace-nowrap">
                      {calcularTempoEmAberto(op.dataCriacao)}
                    </div>
                  )}
                  {status === 'ganhas' && (
                    <div className="text-left text-green-400 text-sm font-medium whitespace-nowrap">
                      {calcularTempoCriacaoParaGanho(op.dataCriacao, op.data)}
                    </div>
                  )}
                  {status === 'perdidas' && (
                    <div className="text-left text-orange-400 text-sm font-medium whitespace-nowrap">
                      {calcularTempoCriacaoParaPerda(op.dataCriacao, op.data)}
                    </div>
                  )}
                  {status === 'perdidas' && (
                    <div className="text-left text-gray-300 text-sm overflow-hidden" title={op.motivoPerda || 'Sem motivo'}>
                      <div className="truncate">{op.motivoPerda || '-'}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

