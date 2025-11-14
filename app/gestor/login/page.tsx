"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GestorLoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/gestor')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground">Redirecionando...</div>
    </div>
  )
}
