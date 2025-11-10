"use client"

import { useState, useEffect } from 'react'
import CronControls from '@/components/cron-controls'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Clock, Database, Users, GitBranch, XCircle, Columns, Target } from 'lucide-react'
import { RefreshCw } from 'lucide-react'

interface Stats {
  vendedores: number
  unidades: number
  funis: number
  motivosPerda: number
  colunasFunil: number
  oportunidades: number
}

export default function SprintHubPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sprinthub/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display">SprintHub</h1>
          <p className="text-muted-foreground font-body">
            Integração e sincronização com SprintHub
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Atualizar estatísticas"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Estatísticas de Sincronização */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Vendedores</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{stats?.vendedores || 0}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Database className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Unidades</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{stats?.unidades || 0}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <GitBranch className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Funis</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{stats?.funis || 0}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Motivos Perda</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{stats?.motivosPerda || 0}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Columns className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Colunas Funil</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{stats?.colunasFunil || 0}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Target className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Oportunidades</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold">{stats?.oportunidades || 0}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <CronControls onSyncComplete={fetchStats} />
        </CardContent>
      </Card>
    </div>
  )
}

