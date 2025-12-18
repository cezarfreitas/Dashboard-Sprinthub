import { memo, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, CheckCircle, XCircle, Target, FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { PainelUnidade } from '@/types/painel.types'

interface PainelUnidadeCardProps {
  unidade: PainelUnidade
  posicao: number
  color: {
    bg: string
    text: string
  }
  filtros?: {
    periodoInicio: string
    periodoFim: string
  }
  onClickAbertas?: () => void
  onClickGanhas?: () => void
  onClickPerdidas?: () => void
}

const cardColors = [
  {
    bg: "bg-gradient-to-br from-blue-500 to-blue-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-purple-500 to-purple-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-pink-500 to-pink-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-teal-500 to-teal-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-violet-500 to-violet-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-rose-500 to-rose-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-orange-500 to-orange-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-amber-500 to-amber-600",
    text: "text-white"
  },
  {
    bg: "bg-gradient-to-br from-lime-500 to-lime-600",
    text: "text-white"
  }
]

export function getCardColor(id: number) {
  // Hash simples para melhorar alternância/distribuição sem mudar o padrão (paleta fixa)
  // Evita clusters quando ids são sequenciais ou seguem padrões por módulo.
  const idx = Math.abs((id * 2654435761) % cardColors.length)
  return cardColors[idx]
}

export const PainelUnidadeCard = memo(function PainelUnidadeCard({
  unidade,
  posicao,
  color,
  filtros,
  onClickAbertas,
  onClickGanhas,
  onClickPerdidas
}: PainelUnidadeCardProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const nomeExibicao = unidade.nome_exibicao || unidade.nome || unidade.name || 'Sem nome'
  
  const valorAbertoFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.valor_aberto)

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.valor_ganho)

  const valorPerdidoFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.valor_perdido)

  const metaFormatada = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(unidade.meta_valor)

  const percentualMeta = unidade.meta_valor > 0 
    ? Math.min(100, (unidade.valor_ganho / unidade.meta_valor) * 100)
    : 0

  const smartMeta = useMemo(() => {
    if (!unidade.meta_valor || unidade.meta_valor <= 0) {
      return {
        expectedPercent: 0,
        deviationPp: 0,
        status: 'no-meta' as const,
        statusLabel: 'Sem meta',
        fillClass: 'bg-white/35',
        expectedMarkerPercent: null as number | null,
      }
    }

    // Período vindo do grid (filtros do painel). Se não existir, não calculamos "esperado".
    if (!filtros?.periodoInicio || !filtros?.periodoFim) {
      return {
        expectedPercent: 0,
        deviationPp: 0,
        status: 'unknown' as const,
        statusLabel: 'Atingido',
        fillClass: 'bg-gradient-to-r from-green-400 to-green-500',
        expectedMarkerPercent: null as number | null,
      }
    }

    const start = new Date(`${filtros.periodoInicio}T00:00:00`)
    const end = new Date(`${filtros.periodoFim}T23:59:59`)
    const now = new Date()

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      return {
        expectedPercent: 0,
        deviationPp: 0,
        status: 'unknown' as const,
        statusLabel: 'Atingido',
        fillClass: 'bg-gradient-to-r from-green-400 to-green-500',
        expectedMarkerPercent: null as number | null,
      }
    }

    const rangeMs = end.getTime() - start.getTime()
    const clampedNowMs = Math.min(end.getTime(), Math.max(start.getTime(), now.getTime()))
    const elapsed = (clampedNowMs - start.getTime()) / rangeMs

    const expectedPercent = Math.min(100, Math.max(0, elapsed * 100))
    const deviationPpRaw = percentualMeta - expectedPercent
    const deviationPp = Math.round(deviationPpRaw * 10) / 10

    // Tolerâncias: dentro de -5pp = "no ritmo"; abaixo disso começa alertar
    if (deviationPp >= -5) {
      return {
        expectedPercent,
        deviationPp,
        status: 'on-track' as const,
        statusLabel: deviationPp >= 0 ? 'Acima do ritmo' : 'No ritmo',
        fillClass: 'bg-gradient-to-r from-green-400 to-green-500',
        expectedMarkerPercent: expectedPercent,
      }
    }

    if (deviationPp >= -15) {
      return {
        expectedPercent,
        deviationPp,
        status: 'warning' as const,
        statusLabel: 'Um pouco abaixo',
        fillClass: 'bg-gradient-to-r from-yellow-300 to-amber-400',
        expectedMarkerPercent: expectedPercent,
      }
    }

    return {
      expectedPercent,
      deviationPp,
      status: 'off-track' as const,
      statusLabel: 'Fora do ritmo',
      fillClass: 'bg-gradient-to-r from-red-400 to-rose-500',
      expectedMarkerPercent: expectedPercent,
    }
  }, [filtros?.periodoInicio, filtros?.periodoFim, percentualMeta, unidade.meta_valor])

  const handleExportToExcel = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      setIsExporting(true)

      // Buscar todas as oportunidades da unidade
      const params = new URLSearchParams({
        unidadeId: String(unidade.id),
        ...(filtros?.periodoInicio && { periodoInicio: filtros.periodoInicio }),
        ...(filtros?.periodoFim && { periodoFim: filtros.periodoFim })
      })

      const response = await fetch(`/api/painel/oportunidades-unidade?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao buscar oportunidades')
      }

      if (!data.oportunidades || data.oportunidades.length === 0) {
        toast({
          title: 'Nenhuma oportunidade',
          description: 'Não há oportunidades para exportar nesta unidade no período selecionado',
        })
        return
      }

      const XLSX = await import('xlsx')

      // Preparar dados para exportação - TODAS AS COLUNAS
      const exportData = data.oportunidades.map((op: any) => {
        // Formatar datas
        const formatDate = (date: any) => date ? new Date(date).toLocaleDateString('pt-BR', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-'

        // Criar objeto base com campos principais
        const baseData: any = {
          'ID': op.id || '-',
          'Título': op.title || '-',
          'Valor': op.value || 0,
          'Status': op.status || '-',
          'Status Original': op.status_original || '-',
          
          // Datas
          'Data Criação': formatDate(op.createDate),
          'Data Atualização': formatDate(op.updateDate),
          'Data Ganho': formatDate(op.gain_date),
          'Data Perda': formatDate(op.lost_date),
          'Data Mudança Coluna': formatDate(op.last_column_change),
          'Data Mudança Status': formatDate(op.last_status_change),
          'Data Fechamento Esperada': op.expectedCloseDate ? new Date(op.expectedCloseDate).toLocaleDateString('pt-BR') : '-',
          'Data Reabertura': formatDate(op.reopen_date),
          
          // Vendedor
          'Vendedor ID': op.vendedor_id || '-',
          'Vendedor Nome': op.vendedor_nome || '-',
          
          // Funil e Lead
          'Coluna CRM': op.crm_column || '-',
          'Coluna Funil ID': op.coluna_funil_id || '-',
          'Lead ID': op.lead_id || '-',
          'Sequência': op.sequence || '-',
          
          // Motivos
          'Motivo Perda ID': op.loss_reason || '-',
          'Motivo Perda Nome': op.loss_reason_nome || '-',
          'Motivo Ganho': op.gain_reason || '-',
          
          // Canais
          'Canal de Venda': op.sale_channel || '-',
          'Campanha': op.campaign || '-',
          
          // Aprovações
          'Aguardando Aprovação': op.await_column_approved ? 'Sim' : 'Não',
          'Usuário Aprovação': op.await_column_approved_user || '-',
          'Aprovação Rejeitada': op.reject_appro ? 'Sim' : 'Não',
          'Descrição Rejeição': op.reject_appro_desc || '-',
          
          // Outros
          'Arquivado': op.archived ? 'Sim' : 'Não',
        }

        // Adicionar campos expandidos de JSON (fields, dataLead, conf_installment)
        // Ignorar os campos _json (mantém apenas os expandidos)
        Object.keys(op).forEach(key => {
          if (key.startsWith('field_') || key.startsWith('dataLead_') || key.startsWith('conf_installment_')) {
            baseData[key] = op[key] || '-'
          }
        })

        return baseData
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Auto-ajustar largura das colunas baseado no conteúdo
      const colWidths = Object.keys(exportData[0] || {}).map(key => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map((row: any) => {
            const value = String(row[key] || '')
            return value.length
          })
        )
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
      })
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Oportunidades')

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const link = document.createElement('a')
      const urlBlob = URL.createObjectURL(blob)

      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${nomeExibicao}_Oportunidades_${timestamp}.xlsx`

      link.setAttribute('href', urlBlob)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(urlBlob)

      toast({
        title: 'Excel exportado!',
        description: `${data.oportunidades.length} oportunidade(s) exportada(s) com sucesso`,
      })
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido ao exportar oportunidades',
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card 
      className={cn(
        "unidade-card hover:shadow-xl border-0 overflow-hidden animate-card-appear",
        // Contraste consistente em qualquer cor da paleta
        "shadow-md ring-1 ring-black/10",
        color.bg
      )}
      style={{
        animationDelay: `${posicao * 0.05}s`
      }}
    >
      <CardContent className={cn("relative p-4", color.text)}>
        {/* Overlay sutil para melhorar contraste sem alterar a paleta */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10" />
        <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="font-black text-lg uppercase tracking-wide truncate flex-1">
            {nomeExibicao}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportToExcel}
              disabled={isExporting}
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                "bg-white/20 hover:bg-white/30 active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Exportar todas as oportunidades para Excel"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
            </button>
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-base text-white",
              posicao <= 3 ? "bg-yellow-400" : "bg-white/20"
            )}>
              {posicao}
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClickAbertas?.()
              }}
              className="flex flex-col items-center gap-1 flex-1 cursor-pointer hover:bg-white/10 rounded p-1 transition-colors"
              title="Ver oportunidades abertas"
            >
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 opacity-90" />
                <span className="text-xs opacity-90">Abertas</span>
              </div>
              <span className="text-xs font-bold">{unidade.oportunidades_abertas}</span>
              <span className="text-[10px] opacity-80">{valorAbertoFormatado}</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClickGanhas?.()
              }}
              className="flex flex-col items-center gap-1 flex-1 border-x border-white/20 px-2 cursor-pointer hover:bg-white/10 rounded p-1 transition-colors"
              title="Ver oportunidades ganhas"
            >
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 opacity-90" />
                <span className="text-xs opacity-90">Ganhas</span>
              </div>
              <span className="text-xs font-bold">{unidade.oportunidades_ganhas}</span>
              <span className="text-[10px] opacity-80">{valorFormatado}</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClickPerdidas?.()
              }}
              className="flex flex-col items-center gap-1 flex-1 cursor-pointer hover:bg-white/10 rounded p-1 transition-colors"
              title="Ver oportunidades perdidas"
            >
              <div className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 opacity-90" />
                <span className="text-xs opacity-90">Perdidas</span>
              </div>
              <span className="text-xs font-bold">{unidade.oportunidades_perdidas}</span>
              <span className="text-[10px] opacity-80">{valorPerdidoFormatado}</span>
            </button>
          </div>

          {/* Barra de Progresso da Meta */}
          <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5 opacity-90" />
                <span className="opacity-90">Meta</span>
              </div>
              <span className="font-semibold">{metaFormatada}</span>
            </div>

            {/* Barra */}
            <div
              className="relative h-3 bg-white/20 rounded-full overflow-hidden"
              title={
                smartMeta.status === 'no-meta' || smartMeta.status === 'unknown'
                  ? undefined
                  : `Esperado: ${smartMeta.expectedPercent.toFixed(1)}% · Desvio: ${smartMeta.deviationPp >= 0 ? '+' : ''}${smartMeta.deviationPp.toFixed(1)}pp`
              }
            >
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-500 rounded-full",
                  smartMeta.fillClass
                )}
                style={{ width: `${percentualMeta}%` }}
              />

              {smartMeta.expectedMarkerPercent !== null && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white/85"
                  style={{ left: `calc(${smartMeta.expectedMarkerPercent}% - 1px)` }}
                />
              )}
            </div>

            {/* Percentual e Total */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs opacity-90">
                Atingido: <span className="font-bold">{percentualMeta.toFixed(1)}%</span>
                {smartMeta.status !== 'no-meta' && smartMeta.status !== 'unknown' && (
                  <span className="ml-2 inline-flex items-center gap-2">
                    <span className="text-white/60">•</span>
                    <span className="font-semibold">{smartMeta.statusLabel}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20">
                      {smartMeta.deviationPp >= 0 ? '+' : ''}{smartMeta.deviationPp.toFixed(1)}pp
                    </span>
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-white">
                {valorFormatado}
              </span>
            </div>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  )
})

