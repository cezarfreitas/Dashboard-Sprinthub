"use client"

import { useState, useEffect } from 'react'
import { useAuthSistema } from '@/hooks/use-auth-sistema'

type Theme = 'light' | 'dark'

interface UseThemeReturn {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isLoading: boolean
}

export function useTheme(): UseThemeReturn {
  const { user, loading: authLoading } = useAuthSistema()
  const [theme, setThemeState] = useState<Theme>('light')
  const [isLoading, setIsLoading] = useState(true)

  // Carregar tema do banco de dados
  const loadTheme = async () => {
    // Não carregar tema se não estiver autenticado
    if (authLoading || !user) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/configuracoes?chave=theme')
      
      // Verificar se a resposta é válida
      if (!response.ok) {
        // Se não for 200, usar tema padrão
        setThemeState('light')
        applyTheme('light')
        setIsLoading(false)
        return
      }

      const data = await response.json()
      
      if (data.success && data.configuracao && data.configuracao.valor) {
        const savedTheme = data.configuracao.valor as Theme
        setThemeState(savedTheme)
        applyTheme(savedTheme)
      } else {
        // Configuração não existe ainda, usar tema padrão
        setThemeState('light')
        applyTheme('light')
      }
    } catch (error) {
      // Silenciosamente usar tema padrão em caso de erro
      setThemeState('light')
      applyTheme('light')
    } finally {
      setIsLoading(false)
    }
  }

  // Aplicar tema no DOM
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // Salvar tema no banco de dados
  const saveTheme = async (newTheme: Theme) => {
    try {
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chave: 'theme',
          valor: newTheme
        })
      })

      if (!response.ok) {
        console.error('Erro ao salvar tema no banco')
      }
    } catch (error) {
      console.error('Erro ao salvar tema:', error)
    }
  }

  // Alternar tema
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Definir tema específico
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    saveTheme(newTheme)
  }

  // Carregar tema na inicialização (apenas se autenticado)
  useEffect(() => {
    if (!authLoading && user) {
      loadTheme()
    } else if (!authLoading && !user) {
      // Se não estiver autenticado, apenas aplicar tema padrão
      applyTheme('light')
      setIsLoading(false)
    }
  }, [authLoading, user])

  return {
    theme,
    toggleTheme,
    setTheme,
    isLoading
  }
}
