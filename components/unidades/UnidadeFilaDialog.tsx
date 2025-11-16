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
import {
  ListOrdered,
  Users,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus
} from 'lucide-react'
import type { Unidade, VendedorFila, Vendedor } from '@/hooks/unidades/useUnidades'

interface UnidadeFilaDialogProps {
  unidade: Unidade | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (unidadeId: number, fila: VendedorFila[]) => Promise<void>
}

export const UnidadeFilaDialog = memo(function UnidadeFilaDialog({
  unidade,
  open,
  onOpenChange,
  onSave
}: UnidadeFilaDialogProps) {
  const [filaAtual, setFilaAtual] = useState<VendedorFila[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (unidade && open) {
      setFilaAtual(unidade.fila_leads || [])
    }
  }, [unidade, open])

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
      nome: `${vendedor.name} ${vendedor.lastName}`,
      sequencia: filaAtual.length + 1
    }
    setFilaAtual(prev => [...prev, novoVendedor])
  }, [filaAtual.length])

  const handleSave = useCallback(async () => {
    if (!unidade) return
    
    try {
      setSaving(true)
      await onSave(unidade.id, filaAtual)
      onOpenChange(false)
    } catch (err) {
      // Error is handled by parent
    } finally {
      setSaving(false)
    }
  }, [unidade, filaAtual, onSave, onOpenChange])

  if (!unidade) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" />
            Gerenciar Fila de Leads - {unidade.name}
          </DialogTitle>
          <DialogDescription>
            Adicione vendedores e organize a ordem de atendimento. Você pode adicionar o mesmo vendedor múltiplas vezes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Coluna 1: Fila Atual */}
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ListOrdered className="h-4 w-4" />
                Ordem da Fila ({filaAtual.length})
              </h3>
              <div className="flex-1 overflow-y-auto">
                {filaAtual.length > 0 ? (
                  <div className="space-y-2">
                    {filaAtual.map((vendedor, index) => (
                      <div
                        key={`${vendedor.id}-${index}`}
                        className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                          {vendedor.sequencia}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{vendedor.nome}</p>
                          {vendedor.total_distribuicoes !== undefined && vendedor.total_distribuicoes > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="h-5 px-2 text-xs font-semibold"
                              title={`${vendedor.total_distribuicoes} distribuições nesta unidade`}
                            >
                              {vendedor.total_distribuicoes}x
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moverVendedor(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moverVendedor(index, 'down')}
                            disabled={index === filaAtual.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => removerDaFila(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <ListOrdered className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum vendedor na fila. Adicione vendedores ao lado.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Vendedores Disponíveis */}
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Disponíveis
              </h3>
              <div className="flex-1 overflow-y-auto">
                {unidade.vendedores_detalhes && unidade.vendedores_detalhes.length > 0 ? (
                  <div className="space-y-2">
                    {unidade.vendedores_detalhes.map((vendedor) => (
                      <button
                        key={vendedor.id}
                        className="w-full flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                        onClick={() => adicionarNaFila(vendedor)}
                      >
                        <Plus className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm truncate flex items-center gap-2">
                          {vendedor.name} {vendedor.lastName}
                          {vendedor.isGestor && (
                            <Badge variant="secondary" className="h-5 text-[10px] px-1.5">Gestor</Badge>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum vendedor disponível
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Fila'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

