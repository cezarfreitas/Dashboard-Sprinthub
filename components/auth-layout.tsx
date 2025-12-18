"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Header } from './header'
import { LoginForm } from './login-form'
import { AppFooter } from './app-footer'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname()
  
  // Páginas que não devem ter o header (todas as páginas de autenticação)
  const isAuthPage = pathname.startsWith('/sistema/') // Todas as páginas /sistema/* (login, forgot-password, reset-password, etc)
  const isLoginPage = pathname === '/login'
  const isGestorPage = pathname.startsWith('/gestor')
  const isConsultorPage = pathname.startsWith('/consultor')
  const isPainelPage = pathname === '/painel'

  // Se estiver nas páginas sem layout, mostrar apenas o conteúdo
  if (isAuthPage || isLoginPage || isGestorPage || isConsultorPage || isPainelPage) {
    return <>{children}</>
  }

  // Mostrar o layout com header para todas as outras páginas autenticadas
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="w-full px-6 py-6 flex-1">
        {children}
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  )
}
