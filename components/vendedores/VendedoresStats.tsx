import React, { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Database, Phone, Shield, Clock } from 'lucide-react'
import type { VendedoresStats } from '@/hooks/vendedores/useVendedores'

interface VendedoresStatsProps {
  stats: VendedoresStats
}

export const VendedoresStatsComponent = memo(function VendedoresStatsComponent({
  stats
}: VendedoresStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Database className="h-6 w-6 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Com Telefone</p>
              <p className="text-2xl font-bold">{stats.com_telefone}</p>
            </div>
            <Phone className="h-6 w-6 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{stats.admins}</p>
            </div>
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Última Sync</p>
              <p className="text-xs font-medium">
                {stats.ultima_sincronizacao 
                  ? new Date(stats.ultima_sincronizacao).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo'
                    }).split(' ')[1]
                  : 'Nunca'
                }
              </p>
            </div>
            <Clock className="h-6 w-6 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

