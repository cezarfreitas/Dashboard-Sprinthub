"use client"

import { useEffect } from 'react'
import { useTheme } from '@/hooks/use-theme'
import { useEmpresaConfig } from '@/hooks/use-empresa-config'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, isLoading } = useTheme()
  const { config: empresaConfig } = useEmpresaConfig()

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
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
