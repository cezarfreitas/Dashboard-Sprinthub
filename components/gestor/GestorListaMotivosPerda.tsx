"use client"

import { memo, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, List, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MotivoPerda {
  id: number
  motivo: string
  created_at: string
  updated_at: string
}

interface GestorListaMotivosPerdaProps {
  className?: string
}

export const GestorListaMotivosPerda = memo(function GestorListaMotivosPerda({
  className = ""
}: GestorListaMotivosPerdaProps) {
  const [motivos, setMotivos] = useState<MotivoPerda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/motivos-perda', {
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setMotivos(result.motivos || [])
        setTotal(result.stats?.total || 0)
      } else {
        setError(result.message || 'Erro ao buscar motivos de perda')
        setMotivos([])
      }
    } catch (err) {
      console.error('Erro ao buscar motivos de perda:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setMotivos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <List className="h-4 w-4 text-blue-600" />
            <span>Motivos de Perda Cadastrados</span>
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

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <List className="h-4 w-4 text-blue-600" />
            <span>Motivos de Perda Cadastrados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="text-xs">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-blue-600" />
            <span>Motivos de Perda Cadastrados</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {total} {total === 1 ? 'motivo' : 'motivos'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {motivos.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 text-xs">
            Nenhum motivo de perda cadastrado na tabela.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {motivos.map((motivo) => (
              <div
                key={motivo.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      ID: {motivo.id}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900 truncate" title={motivo.motivo}>
                      {motivo.motivo || '(Sem nome)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                    {motivo.created_at && (
                      <span>
                        Criado: {new Date(motivo.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {motivo.updated_at && motivo.updated_at !== motivo.created_at && (
                      <span>
                        Atualizado: {new Date(motivo.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

