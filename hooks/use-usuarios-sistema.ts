import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface Usuario {
  id: number
  nome: string
  email: string
  whatsapp: string | null
  permissoes: string[]
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface UsuarioForm {
  nome: string
  email: string
  whatsapp: string
  senha: string
  permissoes: string[]
  ativo: boolean
}

export function useUsuariosSistema() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadUsuarios = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/usuarios-sistema')
      const data = await response.json()

      if (data.success) {
        setUsuarios(data.usuarios)
      } else {
        toast({
          title: "Erro",
          description: data.message || "Erro ao carregar usuários",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const createUsuario = useCallback(async (data: UsuarioForm) => {
    try {
      const response = await fetch('/api/usuarios-sistema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message
        })
        await loadUsuarios()
        return true
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
        return false
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar usuário",
        variant: "destructive"
      })
      return false
    }
  }, [toast, loadUsuarios])

  const updateUsuario = useCallback(async (id: number, data: UsuarioForm) => {
    try {
      const response = await fetch('/api/usuarios-sistema', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message
        })
        await loadUsuarios()
        return true
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
        return false
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário",
        variant: "destructive"
      })
      return false
    }
  }, [toast, loadUsuarios])

  const deleteUsuario = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/usuarios-sistema?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message
        })
        await loadUsuarios()
        return true
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
        return false
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário",
        variant: "destructive"
      })
      return false
    }
  }, [toast, loadUsuarios])

  return {
    usuarios,
    loading,
    loadUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario
  }
}

