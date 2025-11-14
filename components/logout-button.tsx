"use client"

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
  className?: string
}

export function LogoutButton({ variant = "ghost", size = "default", children, className }: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/sistema', { method: 'DELETE' })
      localStorage.removeItem('user')
      router.push('/sistema/login')
      router.refresh()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      // Mesmo com erro, limpar e redirecionar
      localStorage.removeItem('user')
      router.push('/sistema/login')
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
    >
      {children || (
        <>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </>
      )}
    </Button>
  )
}

