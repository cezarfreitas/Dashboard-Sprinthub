"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface CronJob {
  name: string
  schedule: string
  isRunning: boolean
  lastRun: string | null
  nextRun: string | null
  lastStatus?: 'success' | 'error' | null
  lastError?: string | null
}

interface CronControlsProps {
  className?: string
  filterJobs?: string[] // Array de nomes de jobs para filtrar
  onSyncComplete?: () => void // Callback chamado após sincronização bem-sucedida
}

export default function CronControls({ className, filterJobs, onSyncComplete }: CronControlsProps) {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/cron')
      const data = await response.json()
      
      if (data.success) {
        // Filtrar jobs se filterJobs estiver definido
        const filteredJobs = filterJobs 
          ? data.jobs.filter((job: CronJob) => filterJobs.includes(job.name))
          : data.jobs
        
        setJobs(filteredJobs)
      } else {
        setError('Erro ao carregar status dos jobs')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const executeAction = async (action: string, jobName?: string) => {
    setActionLoading(`${action}-${jobName || 'all'}`)
    setError('')
    
    try {
      const response = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobName })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchJobs() // Recarregar status
        
        // Chamar callback se existir
        if (onSyncComplete) {
          onSyncComplete()
        }
      } else {
        setError(data.error || 'Erro na operação')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchJobs()
    
    // Atualizar status a cada 30 segundos
    const interval = setInterval(fetchJobs, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    // O banco salva em UTC, converter para São Paulo (-3h)
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getScheduleDescription = (schedule: string) => {
    // Descrições personalizadas
    const descriptions: { [key: string]: string } = {
      '0 8,14,20 * * *': 'Diariamente às 8h, 14h e 20h',
      '40 11 * * *': 'Diariamente às 11h40',
      '0 8 * * *': 'Diariamente às 8h',
      '0 12 * * *': 'Diariamente ao meio-dia',
      '0 0 * * *': 'Diariamente à meia-noite',
      '0 */6 * * *': 'A cada 6 horas',
      '0 */3 * * *': 'A cada 3 horas',
      '0 */2 * * *': 'A cada 2 horas',
      '*/30 * * * *': 'A cada 30 minutos',
      '*/15 * * * *': 'A cada 15 minutos',
      '*/10 * * * *': 'A cada 10 minutos',
      '*/5 * * * *': 'A cada 5 minutos'
    }
    
    if (descriptions[schedule]) {
      return descriptions[schedule]
    }
    
    // Tentar interpretar o schedule automaticamente
    const parts = schedule.split(' ')
    if (parts.length === 5) {
      const [minute, hour, day, month, weekday] = parts
      
      // Padrão: minuto hora * * * (execução diária)
      if (day === '*' && month === '*' && weekday === '*') {
        // Se tem múltiplas horas separadas por vírgula
        if (hour.includes(',')) {
          const hours = hour.split(',').map(h => `${h}h`).join(', ')
          if (minute === '0') {
            return `Diariamente às ${hours}`
          } else {
            return `Diariamente às ${hours.split(', ').map(h => h.replace('h', `:${minute}`)).join(', ')}`
          }
        }
        
        // Se tem hora específica
        if (!hour.includes('*') && !hour.includes('/')) {
          if (minute === '0') {
            return `Diariamente às ${hour}h`
          } else {
            return `Diariamente às ${hour}h${minute}`
          }
        }
        
        // Se tem intervalo de horas (*/N)
        if (hour.startsWith('*/')) {
          const interval = hour.replace('*/', '')
          return `A cada ${interval} horas`
        }
      }
      
      // Padrão: */N * * * * (a cada N minutos)
      if (minute.startsWith('*/') && hour === '*' && day === '*' && month === '*' && weekday === '*') {
        const interval = minute.replace('*/', '')
        return `A cada ${interval} minutos`
      }
    }
    
    return schedule
  }

  const getStatusIcon = (isRunning: boolean, lastStatus?: 'success' | 'error' | null) => {
    if (isRunning) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (lastStatus === 'error') {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    return <XCircle className="h-4 w-4 text-gray-400" />
  }
  
  const getLastStatusBadge = (lastStatus?: 'success' | 'error' | null) => {
    if (!lastStatus) return null
    
    if (lastStatus === 'success') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
          ✓ Sucesso
        </Badge>
      )
    }
    
    return (
      <Badge variant="destructive" className="text-xs">
        ✗ Erro
      </Badge>
    )
  }

  const getStatusBadge = (isRunning: boolean) => {
    return (
      <Badge variant={isRunning ? 'default' : 'secondary'}>
        {isRunning ? 'Ativo' : 'Inativo'}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg mb-4">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Lista de Jobs */}
      <div className="space-y-2">
        {jobs.map((job) => (
          <div key={job.name} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-3 flex-1">
              {getStatusIcon(job.isRunning, job.lastStatus)}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium capitalize text-sm">
                    {job.name.replace('-', ' ')}
                  </span>
                  {getStatusBadge(job.isRunning)}
                  {getLastStatusBadge(job.lastStatus)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getScheduleDescription(job.schedule)} • Última: {formatDate(job.lastRun)}
                </div>
                {job.lastStatus === 'error' && job.lastError && (
                  <div className="text-xs text-red-600 mt-1 max-w-md truncate" title={job.lastError}>
                    ⚠️ {job.lastError}
                  </div>
                )}
              </div>
            </div>
            
            <Button
              onClick={() => executeAction('run-now', job.name)}
              disabled={actionLoading === `run-now-${job.name}`}
              size="sm"
              variant="outline"
              className="h-8 px-3"
            >
              {actionLoading === `run-now-${job.name}` ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1 text-xs">Executar</span>
            </Button>
          </div>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum job de agendamento configurado</p>
        </div>
      )}
    </div>
  )
}
