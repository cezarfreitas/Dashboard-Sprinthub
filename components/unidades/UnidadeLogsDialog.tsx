import React, { memo, useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileText,
  Calendar,
  User,
  RefreshCw
} from 'lucide-react'
import type { Unidade } from '@/hooks/unidades/useUnidades'

interface LogEntry {
  id: number
  unidade_id: number
  vendedor_id: number
  vendedor_nome?: string
  lead_id: number | null
  posicao_fila: number
  total_fila: number
  owner_anterior: number | null
  distribuido_em: string
}

interface UnidadeLogsDialogProps {
  unidade: Unidade | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UnidadeLogsDialog = memo(function UnidadeLogsDialog({
  unidade,
  open,
  onOpenChange
}: UnidadeLogsDialogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregarLogs = useCallback(async () => {
    if (!unidade) return

    setLoading(true)
    setError(null)
    try {
      const url = `/api/fila/${unidade.id}/logs`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        setError(`Erro ao carregar logs (${response.status}): ${errorText.substring(0, 100)}`)
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs)
        } else {
          setError(`Nenhum log encontrado para unidade #${unidade.id} (${unidade.name}). Total de ${data.total || 0} registros.`)
        }
      } else {
        setError(data.message || data.error || 'Erro ao carregar logs')
      }
    } catch (err) {
      setError(`Erro de conexão: ${err instanceof Error ? err.message : 'Desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }, [unidade])

  useEffect(() => {
    if (unidade && open) {
      carregarLogs()
    } else {
      setLogs([])
      setError(null)
    }
  }, [unidade, open, carregarLogs])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (!unidade) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs de Distribuição - {unidade.name}
          </DialogTitle>
          <DialogDescription>
            Histórico de distribuições de leads via fila rotativa
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
              Carregando logs...
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                  <h3 className="text-lg font-semibold mb-2 text-destructive">Erro ao carregar logs</h3>
                  <p className="text-muted-foreground text-sm mb-4">{error}</p>
                  <Button variant="outline" size="sm" onClick={carregarLogs}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum log encontrado</h3>
                  <p className="text-muted-foreground text-sm">
                    Ainda não houve distribuições de leads para esta unidade
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {log.vendedor_nome || `Vendedor #${log.vendedor_id}`}
                            </span>
                          </div>
                          
                          {log.lead_id && (
                            <Badge variant="outline" className="text-xs">
                              Lead #{log.lead_id}
                            </Badge>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(log.distribuido_em)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Posição na Fila:</span>
                            <span className="ml-2 font-medium">{log.posicao_fila}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total na Fila:</span>
                            <span className="ml-2 font-medium">{log.total_fila}</span>
                          </div>
                          {log.owner_anterior && (
                            <div>
                              <span className="text-muted-foreground">Owner Anterior:</span>
                              <span className="ml-2 font-medium">#{log.owner_anterior}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          {logs.length > 0 && (
            <Button
              variant="outline"
              onClick={carregarLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

