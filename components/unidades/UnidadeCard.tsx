import React, { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  UserCircle,
  ListOrdered,
  MapPin,
  MessageCircle,
  Copy,
  Check
} from 'lucide-react'
import type { Unidade, VendedorFila } from '@/hooks/unidades/useUnidades'

interface UnidadeCardProps {
  unidade: Unidade
  onToggleStatus: (id: number, currentStatus: boolean) => void
  onManageQueue: (unidade: Unidade) => void
  onCopyUrl: (id: number) => void
  copiedId: number | null
}

export const UnidadeCard = memo(function UnidadeCard({
  unidade,
  onToggleStatus,
  onManageQueue,
  onCopyUrl,
  copiedId
}: UnidadeCardProps) {
  const handleToggleStatus = useCallback(() => {
    onToggleStatus(unidade.id, unidade.ativo)
  }, [unidade.id, unidade.ativo, onToggleStatus])

  const handleManageQueue = useCallback(() => {
    onManageQueue(unidade)
  }, [unidade, onManageQueue])

  const handleCopyUrl = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCopyUrl(unidade.id)
  }, [unidade.id, onCopyUrl])

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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopyUrl}
              title="Copiar URL da fila"
            >
              {copiedId === unidade.id ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
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
                {unidade.vendedores.map((vendedor, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs h-6 px-2"
                  >
                    {vendedor}
                  </Badge>
                ))}
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
          
          <Card 
            className="cursor-pointer hover:bg-accent/30 transition-colors border-gray-200"
            onClick={handleManageQueue}
          >
            <CardContent className="p-3">
              {unidade.fila_leads && unidade.fila_leads.length > 0 ? (
                <div className="space-y-1.5">
                  {unidade.fila_leads.map((vendedor, idx) => (
                    <div 
                      key={`${vendedor.id}-${idx}`}
                      className="flex items-center gap-2 text-xs"
                    >
                      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 text-orange-600 font-semibold text-xs">
                        {vendedor.sequencia}
                      </div>
                      <span className="truncate">{vendedor.nome}</span>
                      {vendedor.total_distribuicoes !== undefined && vendedor.total_distribuicoes > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="h-4 px-1.5 text-[10px] font-semibold"
                          title={`${vendedor.total_distribuicoes} distribuições`}
                        >
                          {vendedor.total_distribuicoes}x
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-2">
                  Clique para configurar a fila
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
})

