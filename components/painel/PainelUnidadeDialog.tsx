import { memo, useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, DollarSign, Clock, XCircle, X } from 'lucide-react'
import { ExportToExcelButton } from '@/components/ExportToExcelButton'
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
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SortField = 'id' | 'nome' | 'vendedorNome' | 'valor' | 'data' | 'tempoPerdido' | 'motivoPerda' | 'wonTime' | 'tempoAberto'
type SortDirection = 'asc' | 'desc'

function formatDiffDias(diffMs: number): string {
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDias <= 0) return 'Hoje'
  if (diffDias === 1) return '1 dia'
  if (diffDias < 30) return `${diffDias} dias`
  const meses = Math.floor(diffDias / 30)
  if (meses === 1) return '1 mês'
  if (meses < 12) return `${meses} meses`
  const anos = Math.floor(meses / 12)
  return anos === 1 ? '1 ano' : `${anos} anos`
}

function calcularDiffDias(dateA: string | undefined, dateB: string): number {
  if (!dateA || !dateB) return 0
  const a = new Date(dateA)
  const b = new Date(dateB)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)))
}

function calcularTempoEntre(dateA: string | undefined, dateB: string): string {
  const dias = calcularDiffDias(dateA, dateB)
  if (!dateA || !dateB) return '-'
  return formatDiffDias(dias * 1000 * 60 * 60 * 24)
}

function calcularTempoDesdeHoje(dataCriacao: string | undefined): string {
  if (!dataCriacao) return '-'
  const criacao = new Date(dataCriacao)
  if (isNaN(criacao.getTime())) return '-'
  const agora = new Date()
  agora.setHours(0, 0, 0, 0)
  criacao.setHours(0, 0, 0, 0)
  return formatDiffDias(agora.getTime() - criacao.getTime())
}

const STATUS_CONFIG = {
  abertas: {
    title: 'Oportunidades Abertas',
    singular: 'aberta',
    plural: 'abertas',
    dateLabel: 'Data Criação',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/15 border-blue-500/30',
    badgeText: 'text-blue-300',
    accentColor: '#3b82f6',
    icon: Clock,
    tempoLabel: 'Em Aberto',
  },
  ganhas: {
    title: 'Oportunidades Ganhas',
    singular: 'ganha',
    plural: 'ganhas',
    dateLabel: 'Data Ganho',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    badgeText: 'text-emerald-300',
    accentColor: '#10b981',
    icon: TrendingUp,
    tempoLabel: 'Won Time',
  },
  perdidas: {
    title: 'Oportunidades Perdidas',
    singular: 'perdida',
    plural: 'perdidas',
    dateLabel: 'Data Perda',
    color: 'text-red-400',
    badgeBg: 'bg-red-500/15 border-red-500/30',
    badgeText: 'text-red-300',
    accentColor: '#ef4444',
    icon: XCircle,
    tempoLabel: 'Tempo Perdido',
  },
}

export const PainelUnidadeDialog = memo(function PainelUnidadeDialog({
  unidadeId,
  unidadeNome,
  status,
  filtros,
  open,
  onOpenChange,
}: PainelUnidadeDialogProps) {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const crmBaseUrl = process.env.NEXT_PUBLIC_URL_PUBLIC || 'https://grupointeli.sprinthub.app'

  const periodoInicio = filtros.periodoInicio
  const periodoFim = filtros.periodoFim
  const funisSelecionados = filtros.funisSelecionados
  const funilParam = funisSelecionados?.length > 0 ? funisSelecionados.join(',') : null

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

        if (status !== 'abertas' && periodoInicio && periodoFim) {
          params.append('data_inicio', periodoInicio)
          params.append('data_fim', periodoFim)
        }

        if (funilParam) {
          params.append('funil_id', funilParam)
        }

        const endpoint = `/api/unidades/${unidadeId}/oportunidades-${status}?${params.toString()}`
        const response = await fetch(endpoint)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || 'Erro ao carregar oportunidades')
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
  }, [open, unidadeId, status, periodoInicio, periodoFim, funilParam])

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }, [])

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '-'
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(dateString))
    } catch {
      return dateString
    }
  }, [])

  const oportunidadesFiltradasEOrdenadas = useMemo(() => {
    let filtered = [...oportunidades]

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      const termNumerico = term.replace(/[^\d]/g, '')

      filtered = filtered.filter((op) => {
        if (termNumerico && op.id?.toString().includes(termNumerico)) return true
        if (op.nome?.toLowerCase().includes(term)) return true
        if (op.vendedorNome?.toLowerCase().includes(term)) return true
        if (termNumerico && op.valor?.toString().replace(/\D/g, '').includes(termNumerico)) return true
        if (formatCurrency(op.valor || 0).toLowerCase().includes(term)) return true
        if (op.dataCriacao && formatDate(op.dataCriacao).includes(term)) return true
        if (op.data && formatDate(op.data).includes(term)) return true
        if (status === 'abertas' && op.dataCriacao && calcularTempoDesdeHoje(op.dataCriacao).toLowerCase().includes(term)) return true
        if (status === 'ganhas' && op.dataCriacao && op.data && calcularTempoEntre(op.dataCriacao, op.data).toLowerCase().includes(term)) return true
        if (status === 'perdidas' && op.dataCriacao && op.data && calcularTempoEntre(op.dataCriacao, op.data).toLowerCase().includes(term)) return true
        if (status === 'perdidas' && op.motivoPerda?.toLowerCase().includes(term)) return true
        return false
      })
    }

    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'id':          aValue = a.id;                                            bValue = b.id;                                            break
        case 'nome':        aValue = a.nome.toLowerCase();                            bValue = b.nome.toLowerCase();                            break
        case 'vendedorNome': aValue = a.vendedorNome.toLowerCase();                  bValue = b.vendedorNome.toLowerCase();                    break
        case 'valor':       aValue = a.valor;                                         bValue = b.valor;                                         break
        case 'data':        aValue = new Date(a.data).getTime();                      bValue = new Date(b.data).getTime();                      break
        case 'tempoPerdido': aValue = calcularDiffDias(a.dataCriacao, a.data);       bValue = calcularDiffDias(b.dataCriacao, b.data);          break
        case 'wonTime':     aValue = calcularDiffDias(a.dataCriacao, a.data);        bValue = calcularDiffDias(b.dataCriacao, b.data);          break
        case 'tempoAberto': aValue = calcularDiffDias(a.dataCriacao, new Date().toISOString()); bValue = calcularDiffDias(b.dataCriacao, new Date().toISOString()); break
        case 'motivoPerda': aValue = (a.motivoPerda || '').toLowerCase();            bValue = (b.motivoPerda || '').toLowerCase();             break
        default: return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [oportunidades, searchTerm, sortField, sortDirection, formatCurrency, formatDate, status])

  const valorTotal = useMemo(
    () => oportunidadesFiltradasEOrdenadas.reduce((sum, op) => sum + op.valor, 0),
    [oportunidadesFiltradasEOrdenadas]
  )

  const ticketMedio = useMemo(
    () => (oportunidadesFiltradasEOrdenadas.length > 0 ? valorTotal / oportunidadesFiltradasEOrdenadas.length : 0),
    [valorTotal, oportunidadesFiltradasEOrdenadas]
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1 text-gray-900" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-gray-900" />
    )
  }

  const cfg = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon

  // Colunas da tabela
  const gridCols = {
    perdidas: '60px minmax(160px, 2fr) minmax(130px, 1.5fr) 120px 100px 100px 90px minmax(130px, 1.5fr)',
    ganhas:   '60px minmax(160px, 2.5fr) minmax(130px, 1.5fr) 120px 100px 100px 90px',
    abertas:  '60px minmax(160px, 2.5fr) minmax(130px, 1.5fr) 120px 100px 90px',
  }[status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-gray-200 text-gray-900 w-[88vw] max-w-none max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl">

        {/* Header totalmente inline */}
        <div
          className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 shrink-0"
          style={{ background: `linear-gradient(135deg, ${cfg.accentColor}10 0%, transparent 60%)` }}
        >
          <DialogHeader className="p-0 space-y-0 contents">
            <DialogTitle className="sr-only">{cfg.title} — {unidadeNome}</DialogTitle>
            <DialogDescription className="sr-only">{cfg.title} — {unidadeNome}</DialogDescription>
          </DialogHeader>

          {/* Badge */}
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}>
            <StatusIcon className="h-2.5 w-2.5" />
            {cfg.title}
          </div>

          {/* Título */}
          <span className="text-sm font-bold text-gray-900 shrink-0 max-w-[180px] truncate">{unidadeNome}</span>

          {/* Separador */}
          <div className="w-px h-4 bg-gray-200 shrink-0" />

          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 h-7 text-sm focus-visible:ring-1 focus-visible:ring-gray-300"
            />
          </div>

          {/* Cards de resumo */}
          {!loading && oportunidades.length > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200 shrink-0" />
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">
                  <StatusIcon className="h-3 w-3" style={{ color: cfg.accentColor }} />
                  <span className="text-xs font-bold text-gray-700">{oportunidadesFiltradasEOrdenadas.length}</span>
                </div>
                {valorTotal > 0 && (
                  <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">
                    <DollarSign className="h-3 w-3 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-600">{formatCurrency(valorTotal)}</span>
                  </div>
                )}
                {ticketMedio > 0 && oportunidadesFiltradasEOrdenadas.length > 1 && (
                  <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">
                    <TrendingUp className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-bold text-purple-600">{formatCurrency(ticketMedio)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Exportar */}
          <ExportToExcelButton
            data={oportunidadesFiltradasEOrdenadas}
            filename={`oportunidades_${status}_${unidadeNome.replace(/\s+/g, '_')}`}
            sheetName={cfg.title}
            disabled={loading || oportunidadesFiltradasEOrdenadas.length === 0}
            variant="outline"
            className="shrink-0 h-7 text-xs border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
          />

          {/* Fechar */}
          <DialogClose className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300">
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-y-auto px-7 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: cfg.accentColor }} />
              <span className="text-gray-500 text-sm">Carregando oportunidades...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-red-600 text-sm">
              Erro: {error}
            </div>
          ) : oportunidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-500">
              <StatusIcon className="h-10 w-10 opacity-20" />
              <span className="text-sm">Nenhuma oportunidade {cfg.singular} encontrada</span>
            </div>
          ) : oportunidadesFiltradasEOrdenadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-500">
              <Search className="h-10 w-10 opacity-20" />
              <span className="text-sm">Nenhum resultado para "{searchTerm}"</span>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {/* Cabeçalho sticky */}
              <div
                className="grid px-4 py-2.5 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider gap-3 border-b border-gray-200 sticky top-0 z-10"
                style={{ gridTemplateColumns: gridCols }}
              >
                <button onClick={() => handleSort('id')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                  ID {getSortIcon('id')}
                </button>
                <button onClick={() => handleSort('nome')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                  Oportunidade {getSortIcon('nome')}
                </button>
                <button onClick={() => handleSort('vendedorNome')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                  Vendedor {getSortIcon('vendedorNome')}
                </button>
                <button onClick={() => handleSort('valor')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                  Valor {getSortIcon('valor')}
                </button>
                {(status === 'perdidas' || status === 'ganhas') && (
                  <div className="text-left">Criação</div>
                )}
                <button onClick={() => handleSort('data')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                  {cfg.dateLabel} {getSortIcon('data')}
                </button>
                {status === 'abertas' && (
                  <button onClick={() => handleSort('tempoAberto')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                    {cfg.tempoLabel} {getSortIcon('tempoAberto')}
                  </button>
                )}
                {status === 'ganhas' && (
                  <button onClick={() => handleSort('wonTime')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                    {cfg.tempoLabel} {getSortIcon('wonTime')}
                  </button>
                )}
                {status === 'perdidas' && (
                  <button onClick={() => handleSort('tempoPerdido')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                    {cfg.tempoLabel} {getSortIcon('tempoPerdido')}
                  </button>
                )}
                {status === 'perdidas' && (
                  <button onClick={() => handleSort('motivoPerda')} className="flex items-center hover:text-gray-900 transition-colors text-left">
                    Motivo {getSortIcon('motivoPerda')}
                  </button>
                )}
              </div>

              {/* Linhas */}
              {oportunidadesFiltradasEOrdenadas.map((op, index) => (
                <div
                  key={op.id}
                  className={`grid px-4 py-3 gap-3 transition-colors hover:bg-gray-50 ${
                    index < oportunidadesFiltradasEOrdenadas.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  {/* ID */}
                  <div className="text-sm font-mono">
                    <a
                      href={`${crmBaseUrl}/sh/crm?opportunityID=${op.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      title={`Abrir oportunidade ${op.id} no CRM`}
                    >
                      {op.id}
                    </a>
                  </div>

                  {/* Nome */}
                  <div className="text-sm text-gray-900 font-medium overflow-hidden" title={op.nome}>
                    <div className="truncate">{op.nome}</div>
                  </div>

                  {/* Vendedor */}
                  <div className="text-sm text-gray-500 overflow-hidden" title={op.vendedorNome}>
                    <div className="truncate">{op.vendedorNome}</div>
                  </div>

                  {/* Valor */}
                  <div className={`text-sm font-semibold ${
                    status === 'abertas' ? 'text-blue-600' : status === 'ganhas' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(op.valor)}
                  </div>

                  {/* Data Criação (ganhas/perdidas) */}
                  {(status === 'perdidas' || status === 'ganhas') && (
                    <div className="text-sm text-gray-500 whitespace-nowrap">
                      {op.dataCriacao ? formatDate(op.dataCriacao) : '-'}
                    </div>
                  )}

                  {/* Data principal */}
                  <div className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(op.data)}
                  </div>

                  {/* Tempo */}
                  {status === 'abertas' && (
                    <div className="text-sm font-medium text-blue-600 whitespace-nowrap">
                      {calcularTempoDesdeHoje(op.dataCriacao)}
                    </div>
                  )}
                  {status === 'ganhas' && (
                    <div className="text-sm font-medium text-emerald-600 whitespace-nowrap">
                      {calcularTempoEntre(op.dataCriacao, op.data)}
                    </div>
                  )}
                  {status === 'perdidas' && (
                    <div className="text-sm font-medium text-orange-600 whitespace-nowrap">
                      {calcularTempoEntre(op.dataCriacao, op.data)}
                    </div>
                  )}

                  {/* Motivo perda */}
                  {status === 'perdidas' && (
                    <div className="text-sm text-gray-500 overflow-hidden" title={op.motivoPerda || 'Sem motivo'}>
                      <div className="truncate">{op.motivoPerda || <span className="text-gray-400 italic">—</span>}</div>
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
