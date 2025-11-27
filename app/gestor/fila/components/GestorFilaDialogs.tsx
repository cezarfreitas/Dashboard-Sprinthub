import React, { memo } from 'react'
import { FilaLeadsConfigDialog } from '@/components/fila/FilaLeadsConfigDialog'
import { FilaAusenciasDialog } from '@/components/fila/FilaAusenciasDialog'
import { FilaLogsDialog } from '@/components/fila/FilaLogsDialog'
import type { FilaLeads, VendedorFila } from '@/hooks/fila/useFilaLeads'

interface GestorFilaDialogsProps {
  editingFila: FilaLeads | null
  configDialogOpen: boolean
  onConfigDialogChange: (open: boolean) => void
  onSaveFila: (unidadeId: number, vendedores: VendedorFila[]) => Promise<void>
  ausenciasFila: FilaLeads | null
  ausenciasDialogOpen: boolean
  onAusenciasDialogChange: (open: boolean) => void
  logsFila: FilaLeads | null
  logsDialogOpen: boolean
  onLogsDialogChange: (open: boolean) => void
}

export const GestorFilaDialogs = memo(function GestorFilaDialogs({
  editingFila,
  configDialogOpen,
  onConfigDialogChange,
  onSaveFila,
  ausenciasFila,
  ausenciasDialogOpen,
  onAusenciasDialogChange,
  logsFila,
  logsDialogOpen,
  onLogsDialogChange
}: GestorFilaDialogsProps) {
  return (
    <>
      <FilaLeadsConfigDialog
        fila={editingFila}
        open={configDialogOpen}
        onOpenChange={onConfigDialogChange}
        onSave={onSaveFila}
      />

      <FilaAusenciasDialog
        fila={ausenciasFila}
        open={ausenciasDialogOpen}
        onOpenChange={onAusenciasDialogChange}
      />

      <FilaLogsDialog
        fila={logsFila}
        open={logsDialogOpen}
        onOpenChange={onLogsDialogChange}
      />
    </>
  )
})





