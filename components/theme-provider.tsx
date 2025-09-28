"use client"

import { useEffect } from 'react'
import { useTheme } from '@/hooks/use-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, isLoading } = useTheme()

  useEffect(() => {
    // Aplicar tema no HTML root
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Mostrar loading enquanto carrega o tema
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="mt-2 text-muted-foreground">Carregando tema...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
