"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ListOrdered, Database } from 'lucide-react'
import { FilaLeadsCard } from '@/components/fila/FilaLeadsCard'
import { FilaLeadsFilters } from '@/components/fila/FilaLeadsFilters'
import { FilaLeadsConfigDialog } from '@/components/fila/FilaLeadsConfigDialog'
import { useFilaLeads } from '@/hooks/fila/useFilaLeads'
import type { FilaLeads } from '@/hooks/fila/useFilaLeads'

export default function FilaDeLeadsPage() {
  const {
    filas,
    stats,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    refreshFilas,
    updateFilaVendedores,
    toggleFilaStatus
  } = useFilaLeads()

  const [editingFila, setEditingFila] = useState<FilaLeads | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleManageQueue = useCallback((fila: FilaLeads) => {
    setEditingFila(fila)
    setDialogOpen(true)
  }, [])

  const handleSaveFila = useCallback(async (unidadeId: number, vendedores: any[]) => {
    await updateFilaVendedores(unidadeId, vendedores)
  }, [updateFilaVendedores])

  const handleToggleStatus = useCallback(async (unidadeId: number, currentStatus: boolean) => {
    try {
      await toggleFilaStatus(unidadeId, currentStatus)
    } catch (err) {
      // Error is already set in the hook
    }
  }, [toggleFilaStatus])

  if (loading && filas.length === 0 && !stats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg border p-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display flex items-center gap-3">
            <ListOrdered className="h-8 w-8 text-primary" />
            Gestão de Fila de Leads
          </h1>
          <p className="text-muted-foreground font-body mt-2">
            Configure a distribuição rotativa de leads por unidade
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total de Unidades
                  </p>
                  <p className="text-2xl font-bold">{stats.total_unidades}</p>
                </div>
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Com Fila Configurada
                  </p>
                  <p className="text-2xl font-bold">{stats.unidades_com_fila}</p>
                </div>
                <ListOrdered className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Vendedores
                  </p>
                  <p className="text-2xl font-bold">{stats.total_vendedores}</p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Leads Distribuídos
                  </p>
                  <p className="text-2xl font-bold">{stats.total_leads_distribuidos}</p>
                </div>
                <Database className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros e Lista */}
      <div>
        <FilaLeadsFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          totalFilas={filas.length}
          loading={loading && filas.length > 0}
        />

        {filas.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <ListOrdered className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma fila encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Tente ajustar sua busca' 
                    : 'Configure as filas de leads para começar a distribuir oportunidades automaticamente'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filas.map((fila) => (
              <FilaLeadsCard
                key={fila.id}
                fila={fila}
                onToggleStatus={handleToggleStatus}
                onManageQueue={handleManageQueue}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Configuração */}
      <FilaLeadsConfigDialog
        fila={editingFila}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveFila}
      />
    </div>
  )
}
