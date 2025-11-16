"use client"

import { useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, RotateCcw } from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import CronControls from '@/components/cron-controls'
import { VendedorRow } from '@/components/vendedores/VendedorRow'
import { VendedoresFilters } from '@/components/vendedores/VendedoresFilters'
import { VendedoresStatsComponent } from '@/components/vendedores/VendedoresStats'
import { useVendedores } from '@/hooks/vendedores/useVendedores'

export default function VendedoresPage() {
  const {
    vendedores,
    stats,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    refreshVendedores,
    toggleVendedorStatus
  } = useVendedores()

  const handleToggleStatus = useCallback(async (id: number, currentStatus: boolean) => {
    try {
      await toggleVendedorStatus(id, currentStatus)
    } catch (err) {
      // Error is already set in the hook
    }
  }, [toggleVendedorStatus])

  const handleSyncComplete = useCallback(() => {
    refreshVendedores(false)
  }, [refreshVendedores])

  if (loading && vendedores.length === 0 && !stats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg border p-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="animate-pulse">
          <div className="bg-white rounded-lg border">
            <div className="p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display">Vendedores</h1>
          <p className="text-muted-foreground font-body">
            Gerencie sua equipe de vendas sincronizada com SprintHub
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cron Controls - Apenas Vendedores */}
      <CronControls 
        filterJobs={['vendedores-sync']} 
        onSyncComplete={handleSyncComplete}
      />

      {/* Stats Cards */}
      {stats && <VendedoresStatsComponent stats={stats} />}

      {/* Tabela de Vendedores */}
      <Card>
        <CardHeader>
          <VendedoresFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            totalVendedores={vendedores.length}
          />
        </CardHeader>
        <CardContent>
          {vendedores.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum vendedor encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Tente ajustar sua busca' 
                  : 'Execute a sincronização para importar vendedores da SprintHub'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => refreshVendedores()}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Sincronizar Agora
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID SH</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedores.map((vendedor) => (
                    <VendedorRow
                      key={vendedor.id}
                      vendedor={vendedor}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
