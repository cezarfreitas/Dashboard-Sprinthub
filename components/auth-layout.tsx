"use client"

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from './sidebar'
import { LoginForm } from './login-form'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (response.ok) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não estiver autenticado e não estiver na página de login, mostrar login
  if (!isAuthenticated && !isLoginPage) {
    return <LoginForm onSuccess={() => setIsAuthenticated(true)} />
  }

  // Se estiver na página de login, mostrar apenas o formulário
  if (isLoginPage) {
    return <>{children}</>
  }

  // Se estiver autenticado, mostrar o layout com sidebar
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar className="h-full" />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
