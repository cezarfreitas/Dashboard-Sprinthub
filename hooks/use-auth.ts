"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  id: number
  username: string
  email: string
  name?: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AuthState {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false
  })
  const router = useRouter()

  // Verificar autenticação ao carregar
  useEffect(() => {
    // TEMPORÁRIO: Autenticação desabilitada (não usa mais tabela users)
    // Os usuários são do Bitrix24/linhas
    setAuthState({
      user: null,
      loading: false,
      isAuthenticated: true // Considera sempre autenticado
    })
    // checkAuth() // DESABILITADO - não tenta acessar tabela users
  }, [])

  const checkAuth = useCallback(async () => {
    // TEMPORÁRIO: Autenticação desabilitada
    // Retorna sempre como autenticado sem verificar tabela users
    setAuthState({
      user: null,
      loading: false,
      isAuthenticated: true
    })
    
    /* CÓDIGO ORIGINAL COMENTADO - NÃO USA MAIS TABELA USERS
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAuthState({
          user: data.user,
          loading: false,
          isAuthenticated: true
        })
      } else {
        setAuthState({
          user: null,
          loading: false,
          isAuthenticated: false
        })
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false
      })
    }
    */
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        setAuthState({
          user: data.user,
          loading: false,
          isAuthenticated: true
        })
        return { success: true }
      } else {
        return { success: false, message: data.message }
      }
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, message: 'Erro de conexão' }
    }
  }

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false
      })
      router.push('/login')
    }
  }, [router])

  const authValues = useMemo(() => ({
    ...authState,
    login,
    logout,
    checkAuth
  }), [authState, login, logout, checkAuth])

  return authValues
}
