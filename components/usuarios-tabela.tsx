"use client"

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Mail, Phone, Pencil, Trash2 } from 'lucide-react'
import { Usuario } from '@/hooks/use-usuarios-sistema'

interface UsuariosTableProps {
  usuarios: Usuario[]
  onEdit: (usuario: Usuario) => void
  onDelete: (id: number) => void
}

export function UsuariosTabela({ usuarios, onEdit, onDelete }: UsuariosTableProps) {
  const handleDelete = (id: number, nome: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${nome}"?`)) {
      onDelete(id)
    }
  }

  if (usuarios.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum usuário cadastrado
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>WhatsApp</TableHead>
          <TableHead>Permissões</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((usuario) => (
          <TableRow key={usuario.id}>
            <TableCell className="font-medium">{usuario.nome}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                {usuario.email}
              </div>
            </TableCell>
            <TableCell>
              {usuario.whatsapp ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {usuario.whatsapp}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">-</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {!usuario.permissoes || usuario.permissoes.length === 0 ? (
                  <span className="text-muted-foreground text-sm">Nenhuma</span>
                ) : (
                  <>
                    {usuario.permissoes.slice(0, 2).map(permissao => (
                      <Badge key={permissao} variant="secondary" className="text-xs">
                        {permissao}
                      </Badge>
                    ))}
                    {usuario.permissoes.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{usuario.permissoes.length - 2}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={usuario.ativo ? "default" : "secondary"}>
                {usuario.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(usuario)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(usuario.id, usuario.nome)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

