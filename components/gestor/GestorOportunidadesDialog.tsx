import { memo, useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, TrendingUp, DollarSign } from "lucide-react"
import { VendedorStats } from "@/hooks/gestor/useGestorDashboard"

interface Oportunidade {
  id: number
  titulo: string
  valor: number
  coluna_nome: string
  ganho: number
  perda: number
  created_date: string
  motivo_perda?: string
}

interface GestorOportunidadesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendedor: VendedorStats | null
  dataInicio: string
  dataFim: string
}

export const GestorOportunidadesDialog = memo(function GestorOportunidadesDialog({
  open,
  onOpenChange,
  vendedor,
  dataInicio,
  dataFim
}: GestorOportunidadesDialogProps) {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [loading, setLoading] = useState(false)

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  useEffect(() => {
    const fetchOportunidades = async () => {
      if (!vendedor || !open) return

      setLoading(true)
      try {
        const response = await fetch(
          `/api/oportunidades/vendedor?vendedor_id=${vendedor.id}&data_inicio=${dataInicio}&data_fim=${dataFim}`
        )

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setOportunidades(data.oportunidades || [])
        } else {
          setOportunidades([])
        }
      } catch {
        setOportunidades([])
      } finally {
        setLoading(false)
      }
    }

    fetchOportunidades()
  }, [vendedor, open, dataInicio, dataFim])

  if (!vendedor) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Oportunidades de {vendedor.name} {vendedor.lastName}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : oportunidades.length > 0 ? (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">{oportunidades.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Ganhas</p>
                        <p className="text-lg font-bold text-emerald-600">
                          {oportunidades.filter(o => o.ganho === 1).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-600"></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Perdidas</p>
                        <p className="text-lg font-bold text-red-600">
                          {oportunidades.filter(o => o.perda === 1).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                {oportunidades.map((oportunidade) => (
                  <Card key={oportunidade.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-sm">{oportunidade.titulo}</h4>
                            {oportunidade.ganho === 1 && (
                              <Badge className="bg-emerald-600">Ganha</Badge>
                            )}
                            {oportunidade.perda === 1 && (
                              <Badge variant="destructive">Perdida</Badge>
                            )}
                            {oportunidade.ganho === 0 && oportunidade.perda === 0 && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                Aberta
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(oportunidade.valor)}
                            </span>
                            <span>Etapa: {oportunidade.coluna_nome}</span>
                            <span>
                              Criada: {new Date(oportunidade.created_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {oportunidade.motivo_perda && (
                            <p className="text-xs text-red-600 mt-1">
                              Motivo: {oportunidade.motivo_perda}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma oportunidade encontrada para este vendedor no período selecionado.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
})






