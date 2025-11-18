import { memo, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import type { PainelFiltros } from '@/types/painel.types'

interface OportunidadeGanha {
  id: number
  nome: string
  valor: number
  dataGanho: string
  vendedorId: number | null
  vendedorNome: string
}

interface PainelUnidadeDialogProps {
  unidadeId: number | null
  unidadeNome: string
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

export const PainelUnidadeDialog = memo(function PainelUnidadeDialog({
  unidadeId,
  unidadeNome,
  filtros,
  mesAtual,
  anoAtual,
  open,
  onOpenChange
}: PainelUnidadeDialogProps) {
  const [oportunidades, setOportunidades] = useState<OportunidadeGanha[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !unidadeId) {
      setOportunidades([])
      return
    }

    const fetchOportunidades = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()

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

        if (filtros.funilSelecionado !== 'todos') {
          params.append('funil_id', filtros.funilSelecionado)
        }

        const response = await fetch(`/api/unidades/${unidadeId}/oportunidades-ganhas?${params.toString()}`)
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
  }, [open, unidadeId, filtros, mesAtual, anoAtual])

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string): string => {
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
  }

  const valorTotal = oportunidades.reduce((sum, op) => sum + op.valor, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Oportunidades Ganhas - {unidadeNome}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {oportunidades.length} oportunidade{oportunidades.length !== 1 ? 's' : ''} ganha{oportunidades.length !== 1 ? 's' : ''}
            {valorTotal > 0 && ` • Total: ${formatCurrency(valorTotal)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
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
              <div className="text-gray-400">Nenhuma oportunidade ganha encontrada</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-800/50 rounded-lg text-xs font-semibold text-gray-300 uppercase">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Oportunidade</div>
                <div className="col-span-2">Vendedor</div>
                <div className="col-span-2 text-right">Valor</div>
                <div className="col-span-2 text-right">Data Ganho</div>
              </div>
              {oportunidades.map((op, index) => (
                <div
                  key={op.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  <div className="col-span-1 text-gray-400 text-sm">
                    {index + 1}
                  </div>
                  <div className="col-span-5 text-white font-medium truncate" title={op.nome}>
                    {op.nome}
                  </div>
                  <div className="col-span-2 text-gray-300 text-sm truncate" title={op.vendedorNome}>
                    {op.vendedorNome}
                  </div>
                  <div className="col-span-2 text-right text-green-400 font-semibold">
                    {formatCurrency(op.valor)}
                  </div>
                  <div className="col-span-2 text-right text-gray-400 text-sm">
                    {formatDate(op.dataGanho)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

