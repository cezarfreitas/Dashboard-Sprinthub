import React, { memo } from 'react'
import { ListOrdered } from 'lucide-react'

export const GestorFilaHeader = memo(function GestorFilaHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold flex items-center gap-3 mb-2">
        <ListOrdered className="h-7 w-7 text-primary" />
        Gestão de Fila de Leads
      </h1>
      <p className="text-muted-foreground text-sm">
        Configure a distribuição rotativa de leads por unidade
      </p>
    </div>
  )
})





