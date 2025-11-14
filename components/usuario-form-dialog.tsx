"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { Usuario, UsuarioForm } from '@/hooks/use-usuarios-sistema'

interface UsuarioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: Usuario | null
  onSubmit: (data: UsuarioForm) => Promise<boolean>
}

const PERMISSOES_DISPONIVEIS = [
  { id: 'admin', label: 'Administrador', description: 'Acesso total ao sistema' },
  { id: 'dashboard', label: 'Dashboard', description: 'Visualizar dashboard' },
  { id: 'usuarios', label: 'Usuários', description: 'Gerenciar usuários' },
  { id: 'configuracoes', label: 'Configurações', description: 'Acessar configurações' },
  { id: 'relatorios', label: 'Relatórios', description: 'Gerar relatórios' },
  { id: 'vendedores', label: 'Vendedores', description: 'Gerenciar vendedores' },
  { id: 'unidades', label: 'Unidades', description: 'Gerenciar unidades' },
  { id: 'metas', label: 'Metas', description: 'Gerenciar metas' },
]

export function UsuarioFormDialog({ open, onOpenChange, usuario, onSubmit }: UsuarioFormDialogProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<UsuarioForm>({
    nome: '',
    email: '',
    whatsapp: '',
    senha: '',
    permissoes: [],
    ativo: true
  })

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        whatsapp: usuario.whatsapp || '',
        senha: '',
        permissoes: usuario.permissoes || [],
        ativo: usuario.ativo
      })
    } else {
      setFormData({
        nome: '',
        email: '',
        whatsapp: '',
        senha: '',
        permissoes: [],
        ativo: true
      })
    }
  }, [usuario, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (!formData.nome || !formData.email) {
      return
    }

    if (!usuario && !formData.senha) {
      return
    }

    setSubmitting(true)
    const success = await onSubmit(formData)
    setSubmitting(false)

    if (success) {
      onOpenChange(false)
      setShowPassword(false)
    }
  }

  const togglePermissao = (permissaoId: string) => {
    setFormData(prev => ({
      ...prev,
      permissoes: prev.permissoes.includes(permissaoId)
        ? prev.permissoes.filter(p => p !== permissaoId)
        : [...prev.permissoes, permissaoId]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {usuario ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogDescription>
            {usuario 
              ? 'Atualize as informações do usuário' 
              : 'Preencha os dados do novo usuário'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">
                Senha {usuario ? '(deixe em branco para manter a atual)' : '*'}
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="••••••••"
                  required={!usuario}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Permissões */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <Label>Permissões</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
              {PERMISSOES_DISPONIVEIS.map((permissao) => (
                <div key={permissao.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={permissao.id}
                    checked={formData.permissoes.includes(permissao.id)}
                    onCheckedChange={() => togglePermissao(permissao.id)}
                  />
                  <div className="grid gap-1">
                    <label
                      htmlFor={permissao.id}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {permissao.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {permissao.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Status do Usuário</Label>
              <p className="text-sm text-muted-foreground">
                Usuários inativos não podem acessar o sistema
              </p>
            </div>
            <Switch
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : (usuario ? 'Salvar Alterações' : 'Criar Usuário')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

