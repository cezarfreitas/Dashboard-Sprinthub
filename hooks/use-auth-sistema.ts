import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface UserSistema {
  id: number
  nome: string
  email: string
  permissoes: string[]
  role: string
}

export function useAuthSistema() {
  const [user, setUser] = useState<UserSistema | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadUser = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/sistema')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setUser(data.user)
          localStorage.setItem('user', JSON.stringify(data.user))
        } else {
          setUser(null)
          localStorage.removeItem('user')
        }
      } else {
        setUser(null)
        localStorage.removeItem('user')
      }
    } catch (error) {
      setUser(null)
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Tentar carregar do localStorage primeiro (mais rápido)
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('user')
      }
    }

    // Depois validar com o servidor
    loadUser()
  }, [loadUser])

  const login = useCallback(async (email: string, senha: string) => {
    try {
      const response = await fetch('/api/auth/sistema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        return { success: true }
      } else {
        return { success: false, message: data.message }
      }
    } catch (error) {
      return { success: false, message: 'Erro ao conectar com o servidor' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/sistema', { method: 'DELETE' })
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('user')
      router.push('/sistema/login')
    }
  }, [router])

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false
    return user.permissoes.includes(permission) || user.permissoes.includes('admin')
  }, [user])

  return {
    user,
    loading,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user
  }
}

