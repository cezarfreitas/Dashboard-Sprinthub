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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ListOrdered,
  Users,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save
} from 'lucide-react'
import type { FilaLeads, VendedorFila } from '@/hooks/fila/useFilaLeads'

interface Vendedor {
  id: number
  name: string
  lastName: string
}

interface FilaLeadsConfigDialogProps {
  fila: FilaLeads | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (unidadeId: number, vendedores: VendedorFila[]) => Promise<void>
}

export const FilaLeadsConfigDialog = memo(function FilaLeadsConfigDialog({
  fila,
  open,
  onOpenChange,
  onSave
}: FilaLeadsConfigDialogProps) {
  const [filaAtual, setFilaAtual] = useState<VendedorFila[]>([])
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState<Vendedor[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingVendedores, setLoadingVendedores] = useState(false)

  // Carregar vendedores da unidade
  useEffect(() => {
    if (fila && open) {
      setFilaAtual(fila.vendedores_fila || [])
      
      const carregarVendedores = async () => {
        setLoadingVendedores(true)
        try {
          const response = await fetch(`/api/unidades/${fila.unidade_id}/vendedores`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.vendedores) {
              setVendedoresDisponiveis(data.vendedores)
            } else {
              setVendedoresDisponiveis([])
            }
          } else {
            setVendedoresDisponiveis([])
          }
        } catch (err) {
          setVendedoresDisponiveis([])
        } finally {
          setLoadingVendedores(false)
        }
      }
      
      carregarVendedores()
    }
  }, [fila, open])

  const moverVendedor = useCallback((index: number, direcao: 'up' | 'down') => {
    const novaFila = [...filaAtual]
    const novoIndex = direcao === 'up' ? index - 1 : index + 1
    
    if (novoIndex >= 0 && novoIndex < novaFila.length) {
      [novaFila[index], novaFila[novoIndex]] = [novaFila[novoIndex], novaFila[index]]
      novaFila.forEach((v, i) => v.sequencia = i + 1)
      setFilaAtual(novaFila)
    }
  }, [filaAtual])

  const removerDaFila = useCallback((index: number) => {
    const novaFila = filaAtual.filter((_, i) => i !== index)
    novaFila.forEach((v, i) => v.sequencia = i + 1)
    setFilaAtual(novaFila)
  }, [filaAtual])

  const adicionarNaFila = useCallback((vendedor: Vendedor) => {
    const novoVendedor: VendedorFila = {
      id: vendedor.id,
      nome: `${vendedor.name} ${vendedor.lastName}`.trim(),
      sequencia: filaAtual.length + 1
    }
    setFilaAtual(prev => [...prev, novoVendedor])
  }, [filaAtual.length])

  const handleSave = useCallback(async () => {
    if (!fila) return
    
    try {
      setSaving(true)
      await onSave(fila.unidade_id, filaAtual)
      onOpenChange(false)
    } catch (err) {
      // Error is handled by parent
    } finally {
      setSaving(false)
    }
  }, [fila, filaAtual, onSave, onOpenChange])

  if (!fila) return null

  // Permitir adicionar qualquer vendedor disponível, mesmo que já esteja na fila
  const vendedoresParaAdicionar = vendedoresDisponiveis

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" />
            Configurar Fila de Leads - {fila.unidade_nome}
          </DialogTitle>
          <DialogDescription>
            Organize a ordem de distribuição de leads. Você pode adicionar o mesmo vendedor múltiplas vezes para criar uma sequência. Use os botões para reordenar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Coluna 1: Vendedores Disponíveis */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Vendedores Disponíveis</h3>
                <Badge variant="secondary">
                  {vendedoresParaAdicionar.length}
                </Badge>
              </div>
              
              <ScrollArea className="h-[400px] rounded-md border p-3">
                {loadingVendedores ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Carregando vendedores...
                  </div>
                ) : vendedoresParaAdicionar.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhum vendedor disponível
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vendedoresParaAdicionar.map((vendedor) => {
                      const vezesNaFila = filaAtual.filter(v => v.id === vendedor.id).length
                      return (
                        <div
                          key={vendedor.id}
                          className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">
                              {vendedor.name} {vendedor.lastName}
                            </span>
                            {vezesNaFila > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {vezesNaFila} {vezesNaFila === 1 ? 'vez' : 'vezes'} na fila
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => adicionarNaFila(vendedor)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Coluna 2: Fila Atual */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <ListOrdered className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Ordem na Fila</h3>
                <Badge variant="default">
                  {filaAtual.length}
                </Badge>
              </div>
              
              <ScrollArea className="h-[400px] rounded-md border p-3">
                {filaAtual.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhum vendedor na fila.
                    <br />
                    Adicione vendedores da lista ao lado.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filaAtual.map((vendedor, index) => (
                      <div
                        key={`${vendedor.id}-${index}`}
                        className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                      >
                        {/* Posição */}
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>

                        {/* Nome */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {vendedor.nome}
                          </div>
                          {vendedor.total_distribuicoes !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              {vendedor.total_distribuicoes} leads recebidos
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={index === 0}
                            onClick={() => moverVendedor(index, 'up')}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={index === filaAtual.length - 1}
                            onClick={() => moverVendedor(index, 'down')}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerDaFila(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || filaAtual.length === 0}
          >
            {saving ? (
              <>Salvando...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configuração
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

