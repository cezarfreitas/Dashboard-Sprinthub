"use client"

import { useAuth } from "@/hooks/use-auth"

export default function Home() {
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
        <h1 className="text-4xl font-display">Dashboard</h1>
        <p className="text-muted-foreground font-body">
          Bem-vindo ao sistema{user ? `, ${user.name || user.username}` : ''}.
        </p>
      </div>
    </div>
  )
}