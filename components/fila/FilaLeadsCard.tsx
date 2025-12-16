import React, { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  ListOrdered,
  Settings,
  TrendingUp,
  Clock,
  CalendarX,
  FileText
} from 'lucide-react'
import type { FilaLeads } from '@/hooks/fila/useFilaLeads'

interface FilaLeadsCardProps {
  fila: FilaLeads
  onManageQueue: (fila: FilaLeads) => void
  onRegistroAusencia?: (fila: FilaLeads) => void
  onLogs?: (fila: FilaLeads) => void
}

export const FilaLeadsCard = memo(function FilaLeadsCard({
  fila,
  onManageQueue,
  onRegistroAusencia,
  onLogs
}: FilaLeadsCardProps) {
  const handleManageQueue = useCallback(() => {
    onManageQueue(fila)
  }, [fila, onManageQueue])

  const handleRegistroAusencia = useCallback(() => {
    if (onRegistroAusencia) {
      onRegistroAusencia(fila)
    }
  }, [fila, onRegistroAusencia])

  const handleLogs = useCallback(() => {
    if (onLogs) {
      onLogs(fila)
    }
  }, [fila, onLogs])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card 
      className={`${
        fila.ativo 
          ? 'border-blue-600 border-2 shadow-lg hover:shadow-xl' 
          : 'border-gray-300 opacity-60'
      } transition-all duration-300 h-full flex flex-col overflow-hidden`}
    >
      <div className={`${
        fila.ativo 
          ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
          : 'bg-gradient-to-r from-gray-400 to-gray-500'
      } py-3 sm:py-4 px-4 sm:px-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Nome da Unidade */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                <span className="text-blue-100 font-medium mr-1 sm:mr-2 text-xs sm:text-base">#{fila.unidade_id}</span>
                {fila.unidade_nome}
              </h3>
            </div>
            
            {/* Status Badge */}
            <Badge 
              variant={fila.ativo ? 'default' : 'secondary'}
              className={`w-fit text-xs ${fila.ativo ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-200 text-gray-700'}`}
            >
              {fila.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="space-y-3 flex-1 flex flex-col p-4">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-2">
          {/* Total de Vendedores na Fila */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200">
            <div className="p-1.5 rounded-md bg-blue-600">
              <Users className="h-3.5 w-3.5 text-white flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-blue-600 font-medium">Vendedores</div>
              <div className="text-sm font-bold text-blue-700">
                {fila.vendedores_fila.length} / {fila.total_vendedores}
              </div>
            </div>
          </div>

          {/* Total de Leads Distribuídos */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 border border-green-200">
            <div className="p-1.5 rounded-md bg-green-600">
              <TrendingUp className="h-3.5 w-3.5 text-white flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-green-600 font-medium">Distribuídos</div>
              <div className="text-sm font-bold text-green-700">
                {fila.total_leads_distribuidos}
              </div>
            </div>
          </div>
        </div>

        {/* Última Distribuição */}
        <div className="flex items-start gap-2 p-2 rounded-md bg-orange-50 border border-orange-200">
          <div className="p-1.5 rounded-md bg-orange-600">
            <Clock className="h-3.5 w-3.5 text-white flex-shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-orange-600 font-medium">Última Distribuição</div>
            <div className="text-xs font-semibold text-gray-700">
              {formatDate(fila.ultima_distribuicao)}
            </div>
            {fila.ultima_distribuicao_vendedor && (
              <div className="text-[10px] text-gray-600 mt-0.5">
                {fila.ultima_distribuicao_vendedor}
                {fila.ultima_distribuicao_lead_id && ` • Lead #${fila.ultima_distribuicao_lead_id}`}
              </div>
            )}
          </div>
        </div>

        {/* Ordem da Fila */}
        {fila.vendedores_fila.length > 0 && (
          <div className="pt-2 border-t border-blue-200">
            <div className="flex items-center gap-1.5 mb-2">
              <ListOrdered className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[10px] text-gray-700 font-semibold uppercase tracking-wide">
                Ordem na Fila
              </span>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {fila.vendedores_fila.map((vendedor, index) => {
                const isAusente = vendedor.ausencia_retorno && new Date(vendedor.ausencia_retorno) >= new Date()
                const formatRetorno = (dateString: string) => {
                  const date = new Date(dateString)
                  return date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                }
                
                return (
                  <div 
                    key={`${vendedor.id}-${index}`}
                    className={`flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded ${
                      isAusente 
                        ? 'bg-orange-50 border border-orange-200' 
                        : 'bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-200'
                    } transition-colors`}
                  >
                    <span className="truncate flex-1">
                      <span className="text-blue-600 mr-1.5 font-bold">{vendedor.sequencia}.</span>
                      <span className="text-gray-700">{vendedor.nome}</span>
                      {isAusente && vendedor.ausencia_retorno && (
                        <span className="ml-1.5 text-[10px] text-orange-600">
                          (retorna {formatRetorno(vendedor.ausencia_retorno)})
                        </span>
                      )}
                    </span>
                    {vendedor.total_distribuicoes !== undefined && (
                      <Badge variant="outline" className="text-[10px] shrink-0 bg-blue-50 text-blue-700 border-blue-300">
                        {vendedor.total_distribuicoes}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="pt-3 border-t border-blue-200 space-y-1.5 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageQueue}
            className="w-full text-xs font-medium hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400"
          >
            <Settings className="h-3.5 w-3.5 mr-2" />
            Gerenciar Fila
          </Button>
          
          {onRegistroAusencia && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegistroAusencia}
              className="w-full text-xs font-medium hover:bg-orange-50 hover:text-orange-700 hover:border-orange-400"
            >
              <CalendarX className="h-3.5 w-3.5 mr-2" />
              Registro de Ausência
            </Button>
          )}
          
          {onLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogs}
              className="w-full text-xs font-medium hover:bg-slate-50 hover:text-slate-700 hover:border-slate-400"
            >
              <FileText className="h-3.5 w-3.5 mr-2" />
              Logs
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

