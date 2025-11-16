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


  const checkAuth = useCallback(async () => {
    setAuthState({
      user: null,
      loading: false,
      isAuthenticated: true
    })
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

  useEffect(() => {
    setAuthState({
      user: null,
      loading: false,
      isAuthenticated: true
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch {
      // Silently fail
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
