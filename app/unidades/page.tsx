"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Database } from 'lucide-react'
import CronControls from '@/components/cron-controls'
import { UnidadeCard } from '@/components/unidades/UnidadeCard'
import { UnidadeFilters } from '@/components/unidades/UnidadeFilters'
import { UnidadeFilaDialog } from '@/components/unidades/UnidadeFilaDialog'
import { UnidadeLogsDialog } from '@/components/unidades/UnidadeLogsDialog'
import { UnidadeAusenciasDialog } from '@/components/unidades/UnidadeAusenciasDialog'
import { useUnidades } from '@/hooks/unidades/useUnidades'
import type { Unidade } from '@/hooks/unidades/useUnidades'

export default function UnidadesPage() {
  const {
    unidades,
    stats,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    refreshUnidades,
    toggleUnidadeStatus,
    updateUnidadeFila
  } = useUnidades()

  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [logsUnidade, setLogsUnidade] = useState<Unidade | null>(null)
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)
  const [ausenciasUnidade, setAusenciasUnidade] = useState<Unidade | null>(null)
  const [ausenciasDialogOpen, setAusenciasDialogOpen] = useState(false)

  const handleManageQueue = useCallback((unidade: Unidade) => {
    setEditingUnidade(unidade)
    setDialogOpen(true)
  }, [])

  const handleLogs = useCallback((unidade: Unidade) => {
    setLogsUnidade(unidade)
    setLogsDialogOpen(true)
  }, [])

  const handleAusencias = useCallback((unidade: Unidade) => {
    setAusenciasUnidade(unidade)
    setAusenciasDialogOpen(true)
  }, [])

  const handleSaveFila = useCallback(async (unidadeId: number, fila: any[]) => {
    await updateUnidadeFila(unidadeId, fila)
  }, [updateUnidadeFila])

  const handleToggleStatus = useCallback(async (id: number, currentStatus: boolean) => {
    try {
      await toggleUnidadeStatus(id, currentStatus)
    } catch (err) {
      // Error is already set in the hook
    }
  }, [toggleUnidadeStatus])

  const handleSyncComplete = useCallback(() => {
    refreshUnidades(false)
  }, [refreshUnidades])

  if (loading && unidades.length === 0 && !stats) {
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
          <h1 className="text-4xl font-display">Unidades</h1>
          <p className="text-muted-foreground font-body">
            Unidades sincronizadas do departamento 85 (SprintHub)
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

      {/* Cron Controls - Apenas Unidades */}
      <CronControls 
        filterJobs={['unidades-sync']} 
        onSyncComplete={handleSyncComplete}
      />

      {/* Cards de Unidades */}
      <div>
        <UnidadeFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          totalUnidades={unidades.length}
          loading={loading && unidades.length > 0}
        />

        {unidades.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma unidade encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Tente ajustar sua busca' 
                    : 'Use o agendamento automático ou execute a sincronização manualmente via CronControls'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unidades.map((unidade) => (
              <UnidadeCard
                key={unidade.id}
                unidade={unidade}
                onToggleStatus={handleToggleStatus}
                onManageQueue={handleManageQueue}
                onLogs={handleLogs}
                onRegistroAusencia={handleAusencias}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Gerenciar Fila de Leads */}
      <UnidadeFilaDialog
        unidade={editingUnidade}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveFila}
      />

      {/* Dialog de Logs */}
      <UnidadeLogsDialog
        unidade={logsUnidade}
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
      />

      {/* Dialog de Ausências */}
      <UnidadeAusenciasDialog
        unidade={ausenciasUnidade}
        open={ausenciasDialogOpen}
        onOpenChange={setAusenciasDialogOpen}
      />
    </div>
  )
}
