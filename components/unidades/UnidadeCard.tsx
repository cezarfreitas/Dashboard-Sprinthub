import React, { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  UserCircle,
  ListOrdered,
  MapPin,
  MessageCircle,
  Settings,
  TrendingUp,
  Clock,
  CalendarX,
  FileText
} from 'lucide-react'
import type { Unidade, VendedorFila } from '@/hooks/unidades/useUnidades'

interface UnidadeCardProps {
  unidade: Unidade
  onToggleStatus: (id: number, currentStatus: boolean) => void
  onManageQueue: (unidade: Unidade) => void
  onRegistroAusencia?: (unidade: Unidade) => void
  onLogs?: (unidade: Unidade) => void
}

export const UnidadeCard = memo(function UnidadeCard({
  unidade,
  onToggleStatus,
  onManageQueue,
  onRegistroAusencia,
  onLogs
}: UnidadeCardProps) {
  const handleToggleStatus = useCallback(() => {
    onToggleStatus(unidade.id, unidade.ativo)
  }, [unidade.id, unidade.ativo, onToggleStatus])

  const handleManageQueue = useCallback(() => {
    onManageQueue(unidade)
  }, [unidade, onManageQueue])

  const handleRegistroAusencia = useCallback(() => {
    if (onRegistroAusencia) {
      onRegistroAusencia(unidade)
    }
  }, [unidade, onRegistroAusencia])

  const handleLogs = useCallback(() => {
    if (onLogs) {
      onLogs(unidade)
    }
  }, [unidade, onLogs])

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
        unidade.ativo 
          ? 'border-primary/20 hover:border-primary/40' 
          : 'border-gray-200 opacity-60'
      } transition-all duration-200`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Nome + Grupo */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="text-base font-semibold truncate">
                {unidade.name}
                <span className="text-sm text-muted-foreground font-normal ml-1">
                  #{unidade.id}
                </span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground flex-shrink-0">
                {unidade.grupo_nome || 'Sem Grupo'}
              </span>
            </div>
            
            {/* Branches */}
            {unidade.branches && unidade.branches.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                {unidade.branches.map((branch: any, index: number) => {
                  const nome = typeof branch === 'object' ? branch.name || branch.id : branch
                  return (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs h-6 px-2"
                    >
                      {nome}
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch
              checked={unidade.ativo}
              onCheckedChange={handleToggleStatus}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-0">
        {/* Vendedores */}
        {unidade.vendedores && unidade.vendedores.length > 0 && (
          <div className="py-1.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Equipe
              </span>
              <div className="flex flex-wrap gap-1.5">
                {unidade.vendedores.map((vendedorId, index) => {
                  // Buscar nome do vendedor em vendedores_detalhes
                  const vendedorDetalhe = unidade.vendedores_detalhes?.find(
                    v => String(v.id) === String(vendedorId)
                  )
                  const nomeVendedor = vendedorDetalhe 
                    ? `${vendedorDetalhe.name} ${vendedorDetalhe.lastName || ''}`.trim()
                    : vendedorId
                  
                  return (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs h-6 px-2"
                      title={vendedorDetalhe ? `ID: ${vendedorId}` : undefined}
                    >
                      {nomeVendedor}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Gestor */}
        <div className="py-1.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-shrink-0">
              Gestor
            </span>
            <Badge 
              variant={unidade.nome_user_gestao || unidade.user_gestao ? "default" : "outline"}
              className="text-xs h-6 px-2"
            >
              {unidade.nome_user_gestao || (unidade.user_gestao ? `ID: ${unidade.user_gestao}` : "Não definido")}
            </Badge>
          </div>
        </div>

        {/* ACCs */}
        {unidade.accs && unidade.accs.length > 0 && (
          <div className="py-1.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {unidade.accs.map((acc: any, index: number) => {
                  const numero = typeof acc === 'object' ? acc.id : acc
                  return (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs h-6 px-2 font-mono border-green-500 text-green-700 bg-green-50"
                      title={acc.type}
                    >
                      {numero}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Estatísticas de Distribuição */}
        <div className="py-1.5 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            {/* Total de Leads Distribuídos */}
            <div className="flex items-start gap-1.5">
              <div className="p-1 rounded-md bg-green-50">
                <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-muted-foreground">Distribuídos</div>
                <div className="text-xs font-semibold">
                  {unidade.total_leads_distribuidos || 0}
                </div>
              </div>
            </div>

            {/* Última Distribuição */}
            <div className="flex items-start gap-1.5">
              <div className="p-1 rounded-md bg-orange-50">
                <Clock className="h-3 w-3 text-orange-600 flex-shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-muted-foreground">Última</div>
                <div className="text-xs font-medium truncate">
                  {formatDate(unidade.ultima_distribuicao || null)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Detalhes da última distribuição */}
          {unidade.ultima_distribuicao_vendedor && (
            <div className="mt-2 pt-2 border-t border-gray-50">
              <div className="space-y-0.5">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" />
                  <span className="font-medium truncate">{unidade.ultima_distribuicao_vendedor}</span>
                </div>
                {unidade.ultima_distribuicao_lead_id && (
                  <div className="text-[10px] text-muted-foreground">
                    Lead #{unidade.ultima_distribuicao_lead_id}
                  </div>
                )}
                {unidade.ultima_distribuicao_total_fila && (
                  <div className="text-[10px] text-muted-foreground">
                    {unidade.ultima_distribuicao_total_fila} vendedor{unidade.ultima_distribuicao_total_fila > 1 ? 'es' : ''} na fila
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fila de Leads */}
        <div className="py-1.5">
          <div className="flex items-center gap-2 mb-2">
            <ListOrdered className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Fila de Atendimento
            </span>
            {unidade.fila_leads && unidade.fila_leads.length > 0 && (
              <Badge variant="outline" className="text-xs h-6 px-2">
                {unidade.fila_leads.length}
              </Badge>
            )}
          </div>
          
          {unidade.fila_leads && unidade.fila_leads.length > 0 ? (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 mb-2">
              {unidade.fila_leads.map((vendedor, idx) => {
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
                    key={`${vendedor.id}-${idx}`}
                    className={`flex flex-col gap-1 text-xs py-1.5 px-2 rounded-md ${
                      isAusente ? 'bg-orange-50 border border-orange-200' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate flex-1 font-medium">
                        <span className="text-muted-foreground mr-1.5 text-[10px]">{vendedor.sequencia}.</span>
                        <span className="text-xs">{vendedor.nome}</span>
                      </span>
                      {vendedor.total_distribuicoes !== undefined && vendedor.total_distribuicoes > 0 && (
                        <Badge 
                          variant="outline" 
                          className="ml-1 text-[10px] shrink-0"
                          title={`${vendedor.total_distribuicoes} distribuições`}
                        >
                          {vendedor.total_distribuicoes}
                        </Badge>
                      )}
                    </div>
                    {isAusente && vendedor.ausencia_retorno && (
                      <div className="text-[10px] text-orange-700 flex items-center gap-1">
                        <CalendarX className="h-2.5 w-2.5" />
                        <span className="truncate">Retorna em {formatRetorno(vendedor.ausencia_retorno)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic text-center py-2 mb-2 bg-muted/30 rounded-md">
              Nenhum vendedor na fila
            </div>
          )}

          {/* Botões de Ação */}
          <div className="space-y-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageQueue}
              className="w-full h-8 text-xs"
            >
              <Settings className="h-3 w-3 mr-1.5" />
              Gerenciar Fila
            </Button>
            
            {onRegistroAusencia && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegistroAusencia}
                className="w-full h-8 text-xs"
              >
                <CalendarX className="h-3 w-3 mr-1.5" />
                Ausências
              </Button>
            )}
            
            {onLogs && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogs}
                className="w-full h-8 text-xs"
              >
                <FileText className="h-3 w-3 mr-1.5" />
                Logs
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

