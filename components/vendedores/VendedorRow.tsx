import React, { memo, useCallback } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Phone, Shield } from 'lucide-react'
import type { VendedorMySQL } from '@/hooks/vendedores/useVendedores'

interface VendedorRowProps {
  vendedor: VendedorMySQL
  onToggleStatus: (id: number, currentStatus: boolean) => void
}

const formatPhone = (phone: string | null): string => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

const getStatusBadge = (status: string) => {
  const variants = {
    active: { variant: 'default' as const, text: 'Ativo' },
    inactive: { variant: 'secondary' as const, text: 'Inativo' },
    blocked: { variant: 'destructive' as const, text: 'Bloqueado' }
  }
  const config = variants[status as keyof typeof variants] || variants.active
  return <Badge variant={config.variant}>{config.text}</Badge>
}

export const VendedorRow = memo(function VendedorRow({
  vendedor,
  onToggleStatus
}: VendedorRowProps) {
  const handleToggleStatus = useCallback(() => {
    onToggleStatus(vendedor.id, vendedor.ativo)
  }, [vendedor.id, vendedor.ativo, onToggleStatus])

  return (
    <TableRow>
      <TableCell>
        <div className="font-mono text-sm font-medium">
          {vendedor.id}
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">
            {vendedor.name} {vendedor.lastName}
          </div>
          <div className="text-sm text-muted-foreground">
            @{vendedor.username}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {vendedor.telephone ? (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatPhone(vendedor.telephone)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        {getStatusBadge(vendedor.status)}
      </TableCell>
      <TableCell>
        {vendedor.admin ? (
          <Badge variant="default" className="bg-orange-100 text-orange-800">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        <Switch
          checked={vendedor.ativo}
          onCheckedChange={handleToggleStatus}
        />
      </TableCell>
    </TableRow>
  )
})

