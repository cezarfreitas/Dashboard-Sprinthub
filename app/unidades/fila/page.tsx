"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"

export default function FilaDeOportunidadesPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fila de Oportunidades</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Em breve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            Esta tela será usada para configurar e visualizar a fila de distribuição de oportunidades por unidade.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


