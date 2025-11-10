"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from './header'
import { LoginForm } from './login-form'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname()
  
  // TEMPORÁRIO: Login desabilitado - sempre mostrar conteúdo
  const isLoginPage = pathname === '/login'
  const isGestorPage = pathname.startsWith('/gestor')

  // Se estiver na página de login ou gestor, mostrar apenas o conteúdo
  if (isLoginPage || isGestorPage) {
    return <>{children}</>
  }

  // Mostrar o layout com header para todas as outras páginas
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
