"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ConsultorPage() {
  const router = useRouter()

  useEffect(() => {
    // Verificar se consultor está logado
    const consultorData = localStorage.getItem('consultor')
    
    if (consultorData) {
      // Se já está logado, redirecionar para dashboard
      router.push('/consultor/dashboard')
    } else {
      // Se não está logado, redirecionar para login
      router.push('/consultor/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground">Redirecionando...</div>
    </div>
  )
}






























