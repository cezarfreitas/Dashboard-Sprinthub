"use client"

import { memo, useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface VendedorWhatsapp {
  id: number
  nome: string
  iniciados: number
  finalizados: number
  ignorados: number
  enviadas: number
  recebidas: number
  transferidos: number
  isGestor?: boolean
  error?: string
}

interface GestorAtendimentosWhatsappProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

// Intervalo de atualização em tempo real (30 segundos)
const UPDATE_INTERVAL = 30000

export const GestorAtendimentosWhatsapp = memo(function GestorAtendimentosWhatsapp({
  unidadeId,
  dataInicio,
  dataFim
}: GestorAtendimentosWhatsappProps) {
  const [vendedores, setVendedores] = useState<VendedorWhatsapp[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (isPolling: boolean = false) => {
    if (!unidadeId) {
      setVendedores([])
      setLoading(false)
      return
    }

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController()

    try {
      if (!isPolling) {
        setLoading(true)
      }

      const params = new URLSearchParams()
      params.append('unidadeId', unidadeId.toString())
      params.append('dataInicio', dataInicio)
      params.append('dataFim', dataFim)
      
      const response = await fetch(`/api/sac/stats/resume?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.vendedores) {
        setVendedores(result.vendedores)
        setLastUpdate(new Date())
      } else {
        setVendedores([])
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Requisição cancelada, não fazer nada
      }
      setVendedores([])
    } finally {
      if (!isPolling) {
        setLoading(false)
      }
    }
  }, [unidadeId, dataInicio, dataFim])

  useEffect(() => {
    // Buscar dados iniciais
    fetchData(false)

    // Configurar polling para atualização em tempo real
    intervalRef.current = setInterval(() => {
      fetchData(true)
    }, UPDATE_INTERVAL)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Atendimentos Whatsapp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (vendedores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Atendimentos Whatsapp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6 text-xs">
            Nenhum vendedor encontrado.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calcular totais
  const totalIniciados = vendedores.reduce((sum, v) => sum + v.iniciados, 0)
  const totalFinalizados = vendedores.reduce((sum, v) => sum + v.finalizados, 0)
  const totalIgnorados = vendedores.reduce((sum, v) => sum + v.ignorados, 0)
  const totalEnviadas = vendedores.reduce((sum, v) => sum + v.enviadas, 0)
  const totalRecebidas = vendedores.reduce((sum, v) => sum + v.recebidas, 0)
  const totalTransferidos = vendedores.reduce((sum, v) => sum + v.transferidos, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Atendimentos Whatsapp</span>
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span>Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-left min-w-[120px] font-semibold text-xs h-8 px-2 py-1.5">
                    Vendedor
                  </TableHead>
                  <TableHead className="text-center min-w-[80px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Iniciados
                  </TableHead>
                  <TableHead className="text-center min-w-[80px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Finalizados
                  </TableHead>
                  <TableHead className="text-center min-w-[80px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Ignorados
                  </TableHead>
                  <TableHead className="text-center min-w-[80px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Enviadas
                  </TableHead>
                  <TableHead className="text-center min-w-[80px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Recebidas
                  </TableHead>
                  <TableHead className="text-center min-w-[80px] font-semibold text-xs h-8 px-1.5 py-1.5">
                    Transferidos
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.map((vendedor, index) => (
                  <TableRow 
                    key={vendedor.id} 
                    className={`hover:bg-muted/50 ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                    } ${vendedor.error ? 'opacity-60' : ''}`}
                  >
                    <TableCell className="font-medium whitespace-nowrap text-xs px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        {vendedor.nome}
                        {vendedor.isGestor && (
                          <span className="text-[8px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                            G
                          </span>
                        )}
                        {vendedor.error && (
                          <span className="text-[8px] px-1 py-0.5 bg-red-100 text-red-700 rounded" title={vendedor.error}>
                            ⚠
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-green-600 font-semibold text-xs px-1.5 py-1.5">
                      {vendedor.iniciados}
                    </TableCell>
                    <TableCell className="text-center text-purple-600 font-semibold text-xs px-1.5 py-1.5">
                      {vendedor.finalizados}
                    </TableCell>
                    <TableCell className="text-center text-orange-600 font-semibold text-xs px-1.5 py-1.5">
                      {vendedor.ignorados}
                    </TableCell>
                    <TableCell className="text-center text-cyan-600 font-semibold text-xs px-1.5 py-1.5">
                      {vendedor.enviadas}
                    </TableCell>
                    <TableCell className="text-center text-teal-600 font-semibold text-xs px-1.5 py-1.5">
                      {vendedor.recebidas}
                    </TableCell>
                    <TableCell className="text-center text-indigo-600 font-semibold text-xs px-1.5 py-1.5">
                      {vendedor.transferidos}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Linha de Total */}
                <TableRow className="bg-muted border-t-2 border-muted-foreground/30 font-bold">
                  <TableCell className="font-bold text-xs px-2 py-1.5">TOTAL</TableCell>
                  <TableCell className="text-center text-green-700 font-bold text-xs px-1.5 py-1.5">
                    {totalIniciados}
                  </TableCell>
                  <TableCell className="text-center text-purple-700 font-bold text-xs px-1.5 py-1.5">
                    {totalFinalizados}
                  </TableCell>
                  <TableCell className="text-center text-orange-700 font-bold text-xs px-1.5 py-1.5">
                    {totalIgnorados}
                  </TableCell>
                  <TableCell className="text-center text-cyan-700 font-bold text-xs px-1.5 py-1.5">
                    {totalEnviadas}
                  </TableCell>
                  <TableCell className="text-center text-teal-700 font-bold text-xs px-1.5 py-1.5">
                    {totalRecebidas}
                  </TableCell>
                  <TableCell className="text-center text-indigo-700 font-bold text-xs px-1.5 py-1.5">
                    {totalTransferidos}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

