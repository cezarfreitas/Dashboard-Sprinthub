"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  History, 
  RefreshCw, 
  Trash2, 
  Calendar,
  User,
  Building2
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface LogEntry {
  id: number
  roleta_id: number
  vendedor_id: number
  vendedor_name: string
  vendedor_email: string
  unidade_nome: string
  responsavel: string
  ordem_anterior: number
  timestamp: string
  timestamp_formatado: string
}

interface RoletaLogDialogProps {
  isOpen: boolean
  onClose: () => void
  roletaId: number
  roletaNome: string
}

export function RoletaLogDialog({ isOpen, onClose, roletaId, roletaNome }: RoletaLogDialogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/roleta/log?roleta_id=${roletaId}&limit=100`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs || [])
      } else {
        throw new Error(data.error || 'Erro ao carregar logs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar logs')
      console.error('Erro ao carregar logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const limparLogs = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os logs desta roleta?')) {
      return
    }

    try {
      const response = await fetch(`/api/roleta/log?roleta_id=${roletaId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Logs limpos!",
          description: "Todos os logs foram removidos com sucesso.",
        })
        loadLogs()
      } else {
        throw new Error(data.error || 'Erro ao limpar logs')
      }
    } catch (err) {
      console.error('Erro ao limpar logs:', err)
      toast({
        title: "Erro",
        description: "Erro ao limpar logs",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    if (isOpen && roletaId) {
      loadLogs()
    }
  }, [isOpen, roletaId])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Log da Roleta: {roletaNome}
          </DialogTitle>
          <DialogDescription>
            Histórico de vendedores selecionados nesta roleta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {logs.length} registros
              </Badge>
              {logs.length > 0 && (
                <Badge variant="secondary">
                  Último: {logs[0]?.timestamp_formatado}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {logs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={limparLogs}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Logs */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Carregando logs...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Erro ao carregar logs</div>
              <div className="text-sm text-muted-foreground">{error}</div>
              <Button variant="outline" size="sm" onClick={loadLogs} className="mt-4">
                Tentar novamente
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <div className="text-muted-foreground">
                <div className="font-medium">Nenhum log encontrado</div>
                <div className="text-sm">Os logs aparecerão aqui quando vendedores forem selecionados</div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Data/Hora</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="w-[100px]">Ordem</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={log.id} className={index === 0 ? "bg-green-50 dark:bg-green-900/20" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {log.timestamp_formatado}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="font-medium">{log.vendedor_name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.vendedor_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          #{log.ordem_anterior}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">
                            Último
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
