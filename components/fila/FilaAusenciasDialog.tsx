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
import { ptBR } from 'date-fns/locale'
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            Registro de Ausências - {fila.unidade_nome}
          </DialogTitle>
          <DialogDescription>
            Gerencie as ausências dos vendedores da unidade
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Coluna 1: Formulário de Nova Ausência */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova Ausência</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendedor">Vendedor</Label>
                  <Select
                    value={selectedVendedor ? String(selectedVendedor) : ''}
                    onValueChange={(value) => setSelectedVendedor(value ? Number(value) : '')}
                    required
                  >
                    <SelectTrigger id="vendedor">
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.name} {v.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data/Hora Início</Label>
                  <div className="flex gap-2">
                    <Popover open={openInicio} onOpenChange={setOpenInicio}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dataInicio && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataInicio ? (
                            format(dataInicio, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataInicio}
                          onSelect={(date) => {
                            setDataInicio(date)
                            setOpenInicio(false)
                          }}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="w-32"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data/Hora Fim</Label>
                  <div className="flex gap-2">
                    <Popover open={openFim} onOpenChange={setOpenFim}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dataFim && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataFim ? (
                            format(dataFim, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataFim}
                          onSelect={(date) => {
                            setDataFim(date)
                            setOpenFim(false)
                          }}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={horaFim}
                      onChange={(e) => setHoraFim(e.target.value)}
                      className="w-32"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo</Label>
                  <Textarea
                    id="motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Descreva o motivo da ausência"
                    rows={3}
                    required
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? (
                    <>Salvando...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Ausência
                    </>
                  )}
                </Button>
                </form>
              </CardContent>
            </Card>

            {/* Coluna 2: Lista de Ausências */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarX className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Ausências Registradas</CardTitle>
                  <Badge variant="secondary">
                    {ausencias.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] rounded-md border p-3">
                {loading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Carregando...
                  </div>
                ) : ausencias.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma ausência registrada
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ausencias.map((ausencia) => {
                      const agora = new Date()
                      const inicio = new Date(ausencia.data_inicio)
                      const fim = new Date(ausencia.data_fim)
                      const estaAtiva = agora >= inicio && agora <= fim
                      const jaPassou = agora > fim
                      
                      return (
                        <div
                          key={ausencia.id}
                          className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${
                            estaAtiva 
                              ? 'border-orange-200 bg-orange-50/50' 
                              : jaPassou
                              ? 'border-gray-200 bg-gray-50/50'
                              : 'border-blue-200 bg-blue-50/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-medium">
                                {ausencia.vendedor_nome || `Vendedor #${ausencia.vendedor_id}`}
                              </div>
                              {estaAtiva && (
                                <Badge variant="destructive" className="text-xs">
                                  Ativa
                                </Badge>
                              )}
                              {!estaAtiva && !jaPassou && (
                                <Badge variant="secondary" className="text-xs">
                                  Agendada
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Início:</span>
                                <span>{formatDate(ausencia.data_inicio)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Fim:</span>
                                <span>{formatDate(ausencia.data_fim)}</span>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                              {ausencia.motivo}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(ausencia.id)}
                            className="ml-2 flex-shrink-0"
                            title="Remover ausência"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

