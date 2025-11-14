"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus, RefreshCw } from 'lucide-react'
import { useUsuariosSistema, Usuario } from '@/hooks/use-usuarios-sistema'
import { UsuarioFormDialog } from '@/components/usuario-form-dialog'
import { UsuariosTabela } from '@/components/usuarios-tabela'

export default function UsuariosSistema() {
  const { usuarios, loading, loadUsuarios, createUsuario, updateUsuario, deleteUsuario } = useUsuariosSistema()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)

  useEffect(() => {
    loadUsuarios()
  }, [loadUsuarios])

  const handleOpenDialog = (usuario?: Usuario) => {
    setEditingUser(usuario || null)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: any) => {
    if (editingUser) {
      return await updateUsuario(editingUser.id, data)
    } else {
      return await createUsuario(data)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Usuários do Sistema</span>
              </CardTitle>
              <CardDescription>
                Gerencie os usuários que têm acesso ao sistema
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <UsuariosTabela
            usuarios={usuarios}
            onEdit={handleOpenDialog}
            onDelete={deleteUsuario}
          />
        </CardContent>
      </Card>

      <UsuarioFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        usuario={editingUser}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

