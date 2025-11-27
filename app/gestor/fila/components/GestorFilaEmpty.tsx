import React, { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ListOrdered } from 'lucide-react'

export const GestorFilaEmpty = memo(function GestorFilaEmpty() {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="text-center">
          <ListOrdered className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma fila encontrada</h3>
          <p className="text-muted-foreground text-sm">
            Configure as filas de leads para começar a distribuir oportunidades automaticamente
          </p>
        </div>
      </CardContent>
    </Card>
  )
})





