"use client"

import { useAuth } from "@/hooks/use-auth"

export default function MotivosPerdaPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display">Motivos de Perda</h1>
        <p className="text-muted-foreground font-body">
          Análise de motivos de perda de oportunidades
        </p>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">Página em desenvolvimento</p>
      </div>
    </div>
  )
}

