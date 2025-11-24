import React, { memo } from 'react'
import { FilaLeadsCard } from '@/components/fila/FilaLeadsCard'
import type { FilaLeads } from '@/hooks/fila/useFilaLeads'

interface GestorFilaGridProps {
  filas: FilaLeads[]
  onManageQueue: (fila: FilaLeads) => void
  onRegistroAusencia: (fila: FilaLeads) => void
  onLogs: (fila: FilaLeads) => void
}

export const GestorFilaGrid = memo(function GestorFilaGrid({
  filas,
  onManageQueue,
  onRegistroAusencia,
  onLogs
}: GestorFilaGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {filas.map((fila) => (
        <FilaLeadsCard
          key={fila.id}
          fila={fila}
          onManageQueue={onManageQueue}
          onRegistroAusencia={onRegistroAusencia}
          onLogs={onLogs}
        />
      ))}
    </div>
  )
})



