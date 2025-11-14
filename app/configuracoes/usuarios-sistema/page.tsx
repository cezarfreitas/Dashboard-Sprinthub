"use client"

import UsuariosSistema from '@/components/usuarios-sistema'
import { Settings, Users } from 'lucide-react'

export default function UsuariosSistemaPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Usuários do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários que têm acesso ao sistema
          </p>
        </div>
      </div>

      <UsuariosSistema />
    </div>
  )
}

