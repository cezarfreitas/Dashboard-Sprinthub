"use client"

import CronControls from '@/components/cron-controls'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Clock, Database, Users } from 'lucide-react'

export default function SprintHubPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-display">SprintHub</h1>
        <p className="text-muted-foreground font-body">
          Integração e sincronização com SprintHub
        </p>
      </div>

      {/* Cron Controls - Jobs de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Sincronizações Automáticas</span>
          </CardTitle>
          <CardDescription>
            Gerencie os jobs de sincronização com o SprintHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CronControls />
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendedores</p>
                <p className="text-xs text-muted-foreground">
                  Sincronização diária às 8h, 14h e 20h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Database className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unidades</p>
                <p className="text-xs text-muted-foreground">
                  Sincronização diária às 8h, 14h e 20h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Configurações</p>
                <p className="text-xs text-muted-foreground">
                  Timezone: America/Sao_Paulo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

