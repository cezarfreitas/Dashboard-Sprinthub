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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  CalendarX,
  Plus,
  Trash2,
  Save
} from 'lucide-react'
import type { FilaLeads } from '@/hooks/fila/useFilaLeads'

interface Vendedor {
  id: number
  name: string
  lastName: string
}

interface Ausencia {
  id: number
  vendedor_id: number
  vendedor_nome?: string
  data_inicio: string
  data_fim: string
  motivo: string
  created_at: string
}

interface FilaAusenciasDialogProps {
  fila: FilaLeads | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const FilaAusenciasDialog = memo(function FilaAusenciasDialog({
  fila,
  open,
  onOpenChange
}: FilaAusenciasDialogProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [ausencias, setAusencias] = useState<Ausencia[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingVendedores, setLoadingVendedores] = useState(false)
  
  // Form state
  const [selectedVendedor, setSelectedVendedor] = useState<number | ''>('')
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined)
  const [horaInicio, setHoraInicio] = useState('')
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined)
  const [horaFim, setHoraFim] = useState('')
  const [motivo, setMotivo] = useState('')
  const [openInicio, setOpenInicio] = useState(false)
  const [openFim, setOpenFim] = useState(false)

  // Carregar vendedores e ausências
  useEffect(() => {
    if (fila && open) {
      carregarDados()
    } else {
      // Reset form
      setSelectedVendedor('')
      setDataInicio(undefined)
      setHoraInicio('')
      setDataFim(undefined)
      setHoraFim('')
      setMotivo('')
      setAusencias([])
      setVendedores([])
    }
  }, [fila, open])

  const carregarDados = async () => {
    if (!fila) return

    setLoading(true)
    setLoadingVendedores(true)

    try {
      // Carregar vendedores
      const vendedoresRes = await fetch(`/api/unidades/${fila.unidade_id}/vendedores`)
      if (vendedoresRes.ok) {
        const vendedoresData = await vendedoresRes.json()
        if (vendedoresData.success) {
          setVendedores(vendedoresData.vendedores || [])
        }
      }

      // Carregar ausências
      const ausenciasRes = await fetch(`/api/fila/${fila.unidade_id}/ausencias`)
      if (ausenciasRes.ok) {
        const ausenciasData = await ausenciasRes.json()
        if (ausenciasData.success) {
          setAusencias(ausenciasData.ausencias || [])
        }
      }
    } catch (err) {
      // Error silencioso
    } finally {
      setLoading(false)
      setLoadingVendedores(false)
    }
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fila || !selectedVendedor || !dataInicio || !dataFim || !motivo.trim() || !horaInicio || !horaFim) {
      return
    }

    // Combinar data e hora
    const [horaInicioH, horaInicioM] = horaInicio.split(':')
    const [horaFimH, horaFimM] = horaFim.split(':')
    
    const dataInicioCompleta = new Date(dataInicio)
    dataInicioCompleta.setHours(parseInt(horaInicioH), parseInt(horaInicioM), 0, 0)
    
    const dataFimCompleta = new Date(dataFim)
    dataFimCompleta.setHours(parseInt(horaFimH), parseInt(horaFimM), 0, 0)

    try {
      setSaving(true)
      const response = await fetch(`/api/fila/${fila.unidade_id}/ausencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendedor_id: Number(selectedVendedor),
          data_inicio: dataInicioCompleta.toISOString(),
          data_fim: dataFimCompleta.toISOString(),
          motivo: motivo.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Reset form
          setSelectedVendedor('')
          setDataInicio(undefined)
          setHoraInicio('')
          setDataFim(undefined)
          setHoraFim('')
          setMotivo('')
          // Recarregar ausências
          await carregarDados()
        }
      }
    } catch (err) {
      // Error handled by API
    } finally {
      setSaving(false)
    }
  }, [fila, selectedVendedor, dataInicio, horaInicio, dataFim, horaFim, motivo])

  const handleDelete = useCallback(async (ausenciaId: number) => {
    if (!fila) return

    try {
      const response = await fetch(`/api/fila/${fila.unidade_id}/ausencias/${ausenciaId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await carregarDados()
      }
    } catch (err) {
      // Error handled by API
    }
  }, [fila])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!fila) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarX className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Ausências - {fila.unidade_nome}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Gerencie as ausências dos vendedores da unidade
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-2 sm:py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 h-full">
            {/* Coluna 1: Formulário de Nova Ausência */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-sm sm:text-base">Nova Ausência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="vendedor" className="text-xs sm:text-sm">Vendedor</Label>
                  <Select
                    value={selectedVendedor ? String(selectedVendedor) : ''}
                    onValueChange={(value) => setSelectedVendedor(value ? Number(value) : '')}
                    required
                  >
                    <SelectTrigger id="vendedor" className="h-11 sm:h-10 text-sm">
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)} className="text-sm">
                          {v.name} {v.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Data/Hora Início</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover open={openInicio} onOpenChange={setOpenInicio}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11 sm:h-10 text-sm",
                            !dataInicio && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          {dataInicio ? (
                            format(dataInicio, "dd/MM/yyyy")
                          ) : (
                            <span className="text-xs sm:text-sm">Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 z-50" 
                        align="center" 
                        side="bottom"
                        sideOffset={5}
                      >
                        <Calendar
                          mode="single"
                          selected={dataInicio}
                          onSelect={(date) => {
                            setDataInicio(date)
                            setOpenInicio(false)
                          }}
                          initialFocus
                          className="rounded-md border"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="w-full sm:w-32 h-11 sm:h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Data/Hora Fim</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover open={openFim} onOpenChange={setOpenFim}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11 sm:h-10 text-sm",
                            !dataFim && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          {dataFim ? (
                            format(dataFim, "dd/MM/yyyy")
                          ) : (
                            <span className="text-xs sm:text-sm">Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 z-50" 
                        align="center" 
                        side="bottom"
                        sideOffset={5}
                      >
                        <Calendar
                          mode="single"
                          selected={dataFim}
                          onSelect={(date) => {
                            setDataFim(date)
                            setOpenFim(false)
                          }}
                          initialFocus
                          className="rounded-md border"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={horaFim}
                      onChange={(e) => setHoraFim(e.target.value)}
                      className="w-full sm:w-32 h-11 sm:h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="motivo" className="text-xs sm:text-sm">Motivo</Label>
                  <Textarea
                    id="motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Descreva o motivo da ausência"
                    rows={3}
                    className="text-sm resize-none"
                    required
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full min-h-[44px] text-sm">
                  {saving ? (
                    <span className="text-sm">Salvando...</span>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Adicionar Ausência</span>
                    </>
                  )}
                </Button>
                </form>
              </CardContent>
            </Card>

            {/* Coluna 2: Lista de Ausências */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <CalendarX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <CardTitle className="text-sm sm:text-base">Ausências Registradas</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {ausencias.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] sm:h-[400px] rounded-md border p-2 sm:p-3">
                {loading ? (
                  <div className="text-center text-xs sm:text-sm text-muted-foreground py-6 sm:py-8">
                    Carregando...
                  </div>
                ) : ausencias.length === 0 ? (
                  <div className="text-center text-xs sm:text-sm text-muted-foreground py-6 sm:py-8">
                    Nenhuma ausência registrada
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {ausencias.map((ausencia) => {
                      const agora = new Date()
                      const inicio = new Date(ausencia.data_inicio)
                      const fim = new Date(ausencia.data_fim)
                      const estaAtiva = agora >= inicio && agora <= fim
                      const jaPassou = agora > fim
                      
                      return (
                        <div
                          key={ausencia.id}
                          className={`flex items-start justify-between p-2 sm:p-3 rounded-lg border transition-colors ${
                            estaAtiva 
                              ? 'border-orange-200 bg-orange-50/50' 
                              : jaPassou
                              ? 'border-gray-200 bg-gray-50/50'
                              : 'border-blue-200 bg-blue-50/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                              <div className="text-xs sm:text-sm font-medium truncate">
                                {ausencia.vendedor_nome || `Vendedor #${ausencia.vendedor_id}`}
                              </div>
                              {estaAtiva && (
                                <Badge variant="destructive" className="text-[10px] sm:text-xs">
                                  Ativa
                                </Badge>
                              )}
                              {!estaAtiva && !jaPassou && (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                  Agendada
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Início:</span>
                                <span className="truncate">{formatDate(ausencia.data_inicio)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Fim:</span>
                                <span className="truncate">{formatDate(ausencia.data_fim)}</span>
                              </div>
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t line-clamp-2">
                              {ausencia.motivo}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(ausencia.id)}
                            className="ml-1 sm:ml-2 flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
                            title="Remover ausência"
                          >
                            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="pt-3 sm:pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="w-full sm:w-auto min-h-[44px] text-sm"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

