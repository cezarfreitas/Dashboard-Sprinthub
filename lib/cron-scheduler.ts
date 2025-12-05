import cron from 'node-cron'
import { syncVendedoresFromSprintHub } from './vendedores-sync'
import { syncUnidadesFromSprintHub } from './unidades-sync'
import { syncFunis } from './funis-sync'
import { syncMotivosPerda } from './motivos-perda-sync'
import { syncColunasFunil } from './colunas-funil-sync'
import { syncOportunidades } from './oportunidades-sync'

interface CronJob {
  name: string
  task: any // node-cron ScheduledTask
  isRunning: boolean // Se o job está ATIVO/AGENDADO
  isExecuting: boolean // Se o job está executando NESTE MOMENTO
  lastRun: Date | null
  nextRun: Date | null
  schedule: string
}

interface SyncFunction {
  (type?: 'manual' | 'scheduled'): Promise<any>
}

// ⚡ OTIMIZADO: Mapa de jobs para eliminar duplicação
const SYNC_JOBS_CONFIG: Record<string, { envVar: string; fn: SyncFunction; requiresType?: boolean }> = {
  'vendedores-sync': {
    envVar: 'VENDEDORES_SYNC_SCHEDULE',
    fn: syncVendedoresFromSprintHub,
    requiresType: true
  },
  'unidades-sync': {
    envVar: 'UNIDADES_SYNC_SCHEDULE',
    fn: syncUnidadesFromSprintHub,
    requiresType: true
  },
  'funis-sync': {
    envVar: 'FUNIS_SYNC_SCHEDULE',
    fn: syncFunis,
    requiresType: false
  },
  'motivos-perda-sync': {
    envVar: 'MOTIVOS_PERDA_SYNC_SCHEDULE',
    fn: syncMotivosPerda,
    requiresType: false
  },
  'colunas-funil-sync': {
    envVar: 'COLUNAS_FUNIL_SYNC_SCHEDULE',
    fn: syncColunasFunil,
    requiresType: false
  },
  'oportunidades-sync': {
    envVar: 'OPORTUNIDADES_SYNC_SCHEDULE',
    fn: syncOportunidades,
    requiresType: false
  }
}

class CronScheduler {
  private jobs: Map<string, CronJob> = new Map()
  private isEnabled: boolean = true
  private executionLocks: Map<string, boolean> = new Map() // ⚡ Mutex para prevenir concorrência

  constructor() {
    try {
      this.initializeDefaultJobs()
    } catch (error) {
      console.error('Erro ao inicializar jobs do cron:', error)
    }
  }

  private initializeDefaultJobs() {
    try {
      const timezone = process.env.CRON_TIMEZONE || 'America/Sao_Paulo'
      const defaultSchedule = '0 8,14,20 * * *'
      const oportunidadesSchedule = '0 * * * *' // A cada hora

      // ⚡ OTIMIZADO: Criar jobs usando configuração centralizada
      Object.entries(SYNC_JOBS_CONFIG).forEach(([jobName, config]) => {
        try {
          const schedule = process.env[config.envVar] || 
            (jobName === 'oportunidades-sync' ? oportunidadesSchedule : defaultSchedule)
          
          this.addJob(jobName, schedule, async () => {
            await this.executeSync(jobName, config.fn, config.requiresType ? 'scheduled' : undefined)
          })
        } catch (error) {
          console.error(`Erro ao criar job ${jobName}:`, error)
        }
      })
    } catch (error) {
      console.error('Erro ao inicializar jobs padrão:', error)
    }
  }

  // ⚡ NOVO: Função centralizada de execução com mutex
  private async executeSync(
    jobName: string, 
    syncFn: SyncFunction, 
    type?: 'manual' | 'scheduled'
  ): Promise<void> {
    // Verificar lock para prevenir execução concorrente
    if (this.executionLocks.get(jobName)) {
      return
    }

    this.executionLocks.set(jobName, true)

    try {
      if (type) {
        await syncFn(type)
      } else {
        await syncFn()
      }
    } finally {
      this.executionLocks.delete(jobName)
    }
  }

  addJob(name: string, schedule: string, task: () => Promise<void> | void) {
    if (this.jobs.has(name)) {
      this.removeJob(name)
    }

    const cronTask = cron.schedule(schedule, async () => {
      const job = this.jobs.get(name)
      if (job) {
        job.isExecuting = true
        job.lastRun = new Date()
        this.jobs.set(name, job)
      }

      try {
        await task()
      } finally {
        if (job) {
          job.isExecuting = false
          job.nextRun = this.getNextRunTime(schedule)
          this.jobs.set(name, job)
        }
      }
    }, {
      timezone: process.env.CRON_TIMEZONE || 'America/Sao_Paulo'
    })

    this.jobs.set(name, {
      name,
      task: cronTask,
      isRunning: false,
      isExecuting: false,
      lastRun: null,
      nextRun: this.getNextRunTime(schedule),
      schedule
    })
  }

  removeJob(name: string) {
    const job = this.jobs.get(name)
    if (job) {
      job.task.destroy()
      this.jobs.delete(name)
    }
  }

  startJob(name: string) {
    const job = this.jobs.get(name)
    if (job) {
      job.task.start()
      job.isRunning = true
      this.jobs.set(name, job)
    }
  }

  stopJob(name: string) {
    const job = this.jobs.get(name)
    if (job) {
      job.task.stop()
      job.isRunning = false
      this.jobs.set(name, job)
    }
  }

  startAll() {
    this.isEnabled = true
    this.jobs.forEach((job, name) => {
      job.task.start()
      job.isRunning = true
      this.jobs.set(name, job)
    })
  }

  stopAll() {
    this.isEnabled = false
    this.jobs.forEach((job, name) => {
      job.task.stop()
      job.isRunning = false
      this.jobs.set(name, job)
    })
  }

  getJobStatus(name: string) {
    return this.jobs.get(name) || null
  }

  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      name: job.name,
      schedule: job.schedule,
      isRunning: job.isRunning,
      isExecuting: job.isExecuting,
      lastRun: job.lastRun,
      nextRun: job.nextRun
    }))
  }

  // Calcular próximo horário de execução baseado no schedule
  private getNextRunTime(schedule: string): Date | null {
    try {
      const parts = schedule.split(' ')
      if (parts.length !== 5) return null
      
      const [minute, hour, day, month, weekday] = parts
      const now = new Date()
      const tz = process.env.CRON_TIMEZONE || 'America/Sao_Paulo'
      
      // Converter para o timezone correto (simplificado)
      // Para schedules simples como "0 * * * *" (a cada hora)
      if (minute !== '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
        // A cada hora no minuto especificado
        const next = new Date(now)
        next.setMinutes(parseInt(minute) || 0, 0, 0)
        if (next <= now) {
          next.setHours(next.getHours() + 1)
        }
        return next
      }
      
      // Para schedules como "0 9,15,21 * * *" (horários específicos)
      if (minute !== '*' && hour.includes(',') && day === '*' && month === '*' && weekday === '*') {
        const hours = hour.split(',').map(h => parseInt(h)).filter(h => !isNaN(h))
        const min = parseInt(minute) || 0
        const next = new Date(now)
        next.setMinutes(min, 0, 0)
        
        // Encontrar próximo horário válido
        for (const h of hours.sort((a, b) => a - b)) {
          next.setHours(h)
          if (next > now) {
            return next
          }
        }
        // Se não encontrou hoje, usar o primeiro horário de amanhã
        next.setDate(next.getDate() + 1)
        next.setHours(hours[0], min, 0, 0)
        return next
      }
      
      // Fallback: retornar null e deixar o cron calcular
      return null
    } catch (error) {
      console.error('Erro ao calcular próximo horário de execução:', error)
      return null
    }
  }

  // ⚡ OTIMIZADO: Usar mapa de funções ao invés de if/else gigante
  async runJobNow(name: string) {
    const job = this.jobs.get(name)
    if (!job) {
      throw new Error(`Job '${name}' não encontrado`)
    }

    const config = SYNC_JOBS_CONFIG[name]
    if (!config) {
      throw new Error(`Função para job '${name}' não implementada`)
    }

    // Verificar se já está executando
    if (this.executionLocks.get(name)) {
      throw new Error(`Job '${name}' já está em execução`)
    }

    job.isExecuting = true
    job.lastRun = new Date()
    this.jobs.set(name, job)
    
    try {
      await this.executeSync(name, config.fn, config.requiresType ? 'manual' : undefined)
    } finally {
      job.isExecuting = false
      job.nextRun = this.getNextRunTime(job.schedule)
      this.jobs.set(name, job)
    }
  }
}

// Instância singleton
export const cronScheduler = new CronScheduler()

// Inicializar automaticamente
if (process.env.NODE_ENV === 'production') {
  cronScheduler.startAll()
} else if (process.env.ENABLE_CRON === 'true') {
  cronScheduler.startAll()
}
