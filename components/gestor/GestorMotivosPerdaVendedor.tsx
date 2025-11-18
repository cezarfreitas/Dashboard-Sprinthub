"use client"

import { memo, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, XCircle } from "lucide-react"

interface MotivoPerda {
  motivo: string
  quantidade: number
}

interface VendedorMotivosPerda {
  vendedor_id: number
  vendedor_nome: string
  vendedor_sobrenome: string
  motivos: MotivoPerda[]
  total: number
}

interface GestorMotivosPerdaVendedorProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
}

export const GestorMotivosPerdaVendedor = memo(function GestorMotivosPerdaVendedor({
  unidadeId,
  dataInicio,
  dataFim
}: GestorMotivosPerdaVendedorProps) {
  const [dados, setDados] = useState<VendedorMotivosPerda[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!unidadeId) {
      setDados([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.append('unidade_id', unidadeId.toString())
      params.append('data_inicio', dataInicio)
      params.append('data_fim', dataFim)

      const response = await fetch(`/api/oportunidades/motivos-perda-vendedor?${params.toString()}`, {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.dados) {
        setDados(result.dados)
      } else {
        setDados([])
      }
    } catch (error) {
      console.error('Erro ao buscar motivos de perda:', error)
      setDados([])
    } finally {
      setLoading(false)
    }
  }, [unidadeId, dataInicio, dataFim])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>Motivos de Perda por Vendedor</span>
          </CardTitle>
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

  if (dados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>Motivos de Perda por Vendedor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6 text-xs">
            Nenhum motivo de perda encontrado para o período selecionado.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span>Motivos de Perda por Vendedor</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dados.map((vendedor) => (
            <Card key={vendedor.vendedor_id} className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-red-900">
                  {vendedor.vendedor_nome} {vendedor.vendedor_sobrenome}
                </CardTitle>
                <div className="text-xs text-red-700 font-medium">
                  Total: {vendedor.total} {vendedor.total === 1 ? 'perda' : 'perdas'}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {vendedor.motivos.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Sem motivos registrados
                    </div>
                  ) : (
                    vendedor.motivos.map((motivo, index) => {
                      const percentual = vendedor.total > 0 
                        ? ((motivo.quantidade / vendedor.total) * 100).toFixed(0)
                        : '0'
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border border-red-100"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate" title={motivo.motivo}>
                              {motivo.motivo}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {percentual}% do total
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full min-w-[24px]">
                              {motivo.quantidade}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

