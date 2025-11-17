import cron from 'node-cron'
import parser from 'cron-parser'
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
    this.initializeDefaultJobs()
  }

  private initializeDefaultJobs() {
    const timezone = process.env.CRON_TIMEZONE || 'America/Sao_Paulo'
    const defaultSchedule = '0 8,14,20 * * *'
    const oportunidadesSchedule = '0 9,15,21 * * *'

    // ⚡ OTIMIZADO: Criar jobs usando configuração centralizada
    Object.entries(SYNC_JOBS_CONFIG).forEach(([jobName, config]) => {
      const schedule = process.env[config.envVar] || 
        (jobName === 'oportunidades-sync' ? oportunidadesSchedule : defaultSchedule)
      
      this.addJob(jobName, schedule, async () => {
        await this.executeSync(jobName, config.fn, config.requiresType ? 'scheduled' : undefined)
      })
    })
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

  // ⚡ OTIMIZADO: Usar cron-parser para cálculo correto
  private getNextRunTime(schedule: string): Date | null {
    try {
      const cronParser = parser as any
      const interval = cronParser.parseExpression(schedule, {
        tz: process.env.CRON_TIMEZONE || 'America/Sao_Paulo'
      })
      return interval.next().toDate()
    } catch {
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
