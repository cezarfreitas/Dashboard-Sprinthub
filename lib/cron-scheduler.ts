import cron from 'node-cron'
import { syncVendedoresFromSprintHub } from './vendedores-sync'
import { syncUnidadesFromSprintHub } from './unidades-sync'
import { syncFunis } from './funis-sync'
import { syncMotivosPerda } from './motivos-perda-sync'
import { syncColunasFunil } from './colunas-funil-sync'

interface CronJob {
  name: string
  task: any // node-cron ScheduledTask
  isRunning: boolean // Se o job está ATIVO/AGENDADO (não se está executando neste momento)
  isExecuting: boolean // Se o job está executando NESTE MOMENTO
  lastRun: Date | null
  nextRun: Date | null
  schedule: string
}

class CronScheduler {
  private jobs: Map<string, CronJob> = new Map()
  private isEnabled: boolean = true

  constructor() {
    this.initializeDefaultJobs()
  }

  private initializeDefaultJobs() {
    // Obter configurações das variáveis de ambiente
    const vendedoresSyncSchedule = process.env.VENDEDORES_SYNC_SCHEDULE || '0 8,14,20 * * *'
    const unidadesSyncSchedule = process.env.UNIDADES_SYNC_SCHEDULE || '0 8,14,20 * * *'
    const funisSyncSchedule = process.env.FUNIS_SYNC_SCHEDULE || '0 8,14,20 * * *'
    const motivosPerdaSyncSchedule = process.env.MOTIVOS_PERDA_SYNC_SCHEDULE || '0 8,14,20 * * *'
    const colunasFunilSyncSchedule = process.env.COLUNAS_FUNIL_SYNC_SCHEDULE || '0 8,14,20 * * *'
    const timezone = process.env.CRON_TIMEZONE || 'America/Sao_Paulo'

    // Sincronização de vendedores
    this.addJob('vendedores-sync', vendedoresSyncSchedule, async () => {
      console.log('🔄 [CRON] Iniciando sincronização automática de vendedores...')
      try {
        await syncVendedoresFromSprintHub('scheduled')
        console.log('✅ [CRON] Sincronização de vendedores concluída com sucesso')
      } catch (error) {
        console.error('❌ [CRON] Erro na sincronização de vendedores:', error)
      }
    })

    // Sincronização de unidades
    this.addJob('unidades-sync', unidadesSyncSchedule, async () => {
      console.log('🔄 [CRON] Iniciando sincronização automática de unidades...')
      try {
        await syncUnidadesFromSprintHub('scheduled')
        console.log('✅ [CRON] Sincronização de unidades concluída com sucesso')
      } catch (error) {
        console.error('❌ [CRON] Erro na sincronização de unidades:', error)
      }
    })

    // Sincronização de funis
    this.addJob('funis-sync', funisSyncSchedule, async () => {
      console.log('🔄 [CRON] Iniciando sincronização automática de funis...')
      try {
        await syncFunis()
        console.log('✅ [CRON] Sincronização de funis concluída com sucesso')
      } catch (error) {
        console.error('❌ [CRON] Erro na sincronização de funis:', error)
      }
    })

    // Sincronização de motivos de perda
    this.addJob('motivos-perda-sync', motivosPerdaSyncSchedule, async () => {
      console.log('🔄 [CRON] Iniciando sincronização automática de motivos de perda...')
      try {
        await syncMotivosPerda()
        console.log('✅ [CRON] Sincronização de motivos de perda concluída com sucesso')
      } catch (error) {
        console.error('❌ [CRON] Erro na sincronização de motivos de perda:', error)
      }
    })

    // Sincronização de colunas de funil
    this.addJob('colunas-funil-sync', colunasFunilSyncSchedule, async () => {
      console.log('🔄 [CRON] Iniciando sincronização automática de colunas de funil...')
      try {
        await syncColunasFunil()
        console.log('✅ [CRON] Sincronização de colunas de funil concluída com sucesso')
      } catch (error) {
        console.error('❌ [CRON] Erro na sincronização de colunas de funil:', error)
      }
    })

    console.log(`📅 [CRON] Jobs configurados com timezone: ${timezone}`)
    console.log(`📅 [CRON] Sincronização vendedores: ${vendedoresSyncSchedule}`)
    console.log(`📅 [CRON] Sincronização unidades: ${unidadesSyncSchedule}`)
    console.log(`📅 [CRON] Sincronização funis: ${funisSyncSchedule}`)
    console.log(`📅 [CRON] Sincronização motivos perda: ${motivosPerdaSyncSchedule}`)
    console.log(`📅 [CRON] Sincronização colunas funil: ${colunasFunilSyncSchedule}`)
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
      } catch (error) {
        console.error(`❌ [CRON] Erro no job ${name}:`, error)
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
      isRunning: false, // Inicialmente não está rodando
      isExecuting: false, // Inicialmente não está executando
      lastRun: null,
      nextRun: this.getNextRunTime(schedule),
      schedule
    })

    console.log(`📅 [CRON] Job '${name}' adicionado com schedule: ${schedule}`)
  }

  removeJob(name: string) {
    const job = this.jobs.get(name)
    if (job) {
      job.task.destroy()
      this.jobs.delete(name)
      console.log(`🗑️ [CRON] Job '${name}' removido`)
    }
  }

  startJob(name: string) {
    const job = this.jobs.get(name)
    if (job) {
      job.task.start()
      job.isRunning = true
      this.jobs.set(name, job)
      console.log(`▶️ [CRON] Job '${name}' iniciado`)
    }
  }

  stopJob(name: string) {
    const job = this.jobs.get(name)
    if (job) {
      job.task.stop()
      job.isRunning = false
      this.jobs.set(name, job)
      console.log(`⏸️ [CRON] Job '${name}' pausado`)
    }
  }

  startAll() {
    this.isEnabled = true
    this.jobs.forEach((job, name) => {
      job.task.start()
      job.isRunning = true
      this.jobs.set(name, job)
    })
    console.log('🚀 [CRON] Todos os jobs iniciados')
  }

  stopAll() {
    this.isEnabled = false
    this.jobs.forEach((job, name) => {
      job.task.stop()
      job.isRunning = false
      this.jobs.set(name, job)
    })
    console.log('⏹️ [CRON] Todos os jobs pausados')
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

  private getNextRunTime(schedule: string): Date | null {
    try {
      // Esta é uma implementação simplificada
      // Em produção, você pode usar uma biblioteca como 'cron-parser' para cálculos mais precisos
      return new Date(Date.now() + 30 * 60 * 1000) // Próxima execução em 30 minutos
    } catch {
      return null
    }
  }

  // Executar job manualmente
  async runJobNow(name: string) {
    const job = this.jobs.get(name)
    if (!job) {
      throw new Error(`Job '${name}' não encontrado`)
    }

    console.log(`🔄 [CRON] Executando job '${name}' manualmente...`)
    job.isExecuting = true
    job.lastRun = new Date()
    this.jobs.set(name, job)
    
    try {
      // Executar a função baseada no nome do job
      if (name === 'vendedores-sync') {
        await syncVendedoresFromSprintHub('manual')
      } else if (name === 'unidades-sync') {
        await syncUnidadesFromSprintHub('manual')
      } else if (name === 'funis-sync') {
        await syncFunis()
      } else if (name === 'motivos-perda-sync') {
        await syncMotivosPerda()
      } else if (name === 'colunas-funil-sync') {
        await syncColunasFunil()
      } else {
        // Para outros jobs, você pode adicionar mais condições aqui
        throw new Error(`Função para job '${name}' não implementada`)
      }
      console.log(`✅ [CRON] Job '${name}' executado com sucesso`)
    } catch (error) {
      console.error(`❌ [CRON] Erro na execução manual do job '${name}':`, error)
      throw error
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
console.log('🚀 [CRON] Inicializando jobs automaticamente...')
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 [CRON] Modo produção - iniciando todos os jobs')
  cronScheduler.startAll()
} else {
  // Em desenvolvimento, apenas iniciar se explicitamente habilitado
  console.log('🚀 [CRON] Modo desenvolvimento - ENABLE_CRON:', process.env.ENABLE_CRON)
  if (process.env.ENABLE_CRON === 'true') {
    console.log('🚀 [CRON] ENABLE_CRON=true - iniciando todos os jobs')
    cronScheduler.startAll()
  } else {
    console.log('⚠️ [CRON] ENABLE_CRON não está definido como true - jobs não iniciados')
  }
}
