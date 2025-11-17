"use client"

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Clock } from 'lucide-react'
import CronControls from '@/components/cron-controls'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SprintHubStats } from '@/components/sprinthub/SprintHubStats'

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

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sprinthub/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      // Error handling silencioso - não crítico para UX
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

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
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Atualizar estatísticas"
          aria-label="Atualizar estatísticas"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Estatísticas de Sincronização */}
      <SprintHubStats stats={stats} loading={loading} />

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

