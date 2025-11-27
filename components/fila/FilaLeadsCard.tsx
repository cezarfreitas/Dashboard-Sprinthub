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
          ? 'border-primary/20 hover:border-primary/40 hover:shadow-md' 
          : 'border-gray-200 opacity-75'
      } transition-all duration-200 h-full flex flex-col`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Nome da Unidade */}
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              <h3 className="text-lg font-semibold truncate">
                <span className="text-muted-foreground font-normal mr-2">#{fila.unidade_id}</span>
                {fila.unidade_nome}
              </h3>
            </div>
            
            {/* Status Badge */}
            <Badge 
              variant={fila.ativo ? 'default' : 'secondary'}
              className="w-fit"
            >
              {fila.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total de Vendedores na Fila */}
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-md bg-blue-50">
              <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Vendedores</div>
              <div className="text-base font-semibold">
                {fila.vendedores_fila.length} / {fila.total_vendedores}
              </div>
            </div>
          </div>

          {/* Total de Leads Distribuídos */}
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-md bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Distribuídos</div>
              <div className="text-base font-semibold">
                {fila.total_leads_distribuidos}
              </div>
            </div>
          </div>
        </div>

        {/* Última Distribuição */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-md bg-orange-50">
            <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Última Distribuição</div>
            <div className="text-sm font-medium mb-1">
              {formatDate(fila.ultima_distribuicao)}
            </div>
            {fila.ultima_distribuicao_vendedor && (
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="font-medium">{fila.ultima_distribuicao_vendedor}</span>
                </div>
                {fila.ultima_distribuicao_lead_id && (
                  <div className="text-xs text-muted-foreground">
                    Lead #{fila.ultima_distribuicao_lead_id}
                  </div>
                )}
                {fila.ultima_distribuicao_total_fila && (
                  <div className="text-xs text-muted-foreground">
                    {fila.ultima_distribuicao_total_fila} vendedor{fila.ultima_distribuicao_total_fila > 1 ? 'es' : ''} na fila
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ordem da Fila */}
        {fila.vendedores_fila.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-3">
              <ListOrdered className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Ordem na Fila
              </span>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {fila.vendedores_fila.map((vendedor, index) => {
                const isAusente = vendedor.ausencia_retorno && new Date(vendedor.ausencia_retorno) >= new Date()
                const formatRetorno = (dateString: string) => {
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
                  <div 
                    key={`${vendedor.id}-${index}`}
                    className={`flex flex-col gap-1 text-sm py-1.5 px-2 rounded-md ${
                      isAusente ? 'bg-orange-50 border border-orange-200' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1 font-medium">
                        <span className="text-muted-foreground mr-2">{vendedor.sequencia}.</span>
                        {vendedor.nome}
                      </span>
                      {vendedor.total_distribuicoes !== undefined && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {vendedor.total_distribuicoes}
                        </Badge>
                      )}
                    </div>
                    {isAusente && vendedor.ausencia_retorno && (
                      <div className="text-xs text-orange-700 flex items-center gap-1">
                        <CalendarX className="h-3 w-3" />
                        Retorna em {formatRetorno(vendedor.ausencia_retorno)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="pt-4 border-t space-y-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageQueue}
            className="w-full"
          >
            <Settings className="h-3.5 w-3.5 mr-2" />
            Gerenciar Fila
          </Button>
          
          {onRegistroAusencia && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegistroAusencia}
              className="w-full"
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
              className="w-full"
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

