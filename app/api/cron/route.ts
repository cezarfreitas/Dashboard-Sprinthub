import { NextRequest, NextResponse } from 'next/server'
import { cronScheduler } from '@/lib/cron-scheduler'
import { executeQuery } from '@/lib/database'

// GET - Listar status dos jobs
export async function GET() {
  try {
    let jobs
    try {
      jobs = cronScheduler.getAllJobs()
    } catch (error) {
      console.error('Erro ao obter jobs do cronScheduler:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao obter jobs: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
        },
        { status: 500 }
      )
    }
    
    // ⚡ OTIMIZADO: 1 query ao invés de N queries (uma por job)
    const jobNames = jobs.map(j => j.name)
    
    if (jobNames.length === 0) {
      return NextResponse.json({
        success: true,
        jobs: []
      })
    }

    // Buscar histórico de todos os jobs de uma vez
    const placeholders = jobNames.map(() => '?').join(',')
    const historyResults = await executeQuery(`
      SELECT h1.* 
      FROM cron_sync_history h1
      INNER JOIN (
        SELECT job_name, MAX(started_at) as max_started
        FROM cron_sync_history
        WHERE job_name IN (${placeholders})
        GROUP BY job_name
      ) h2 ON h1.job_name = h2.job_name AND h1.started_at = h2.max_started
    `, jobNames) as any[]

    // Criar mapa para acesso rápido
    const historyMap = new Map(
      historyResults.map(h => [h.job_name, h])
    )

    // Combinar dados dos jobs com histórico
    const jobsWithHistory = jobs.map(job => {
      const lastExecution = historyMap.get(job.name)
      
      return {
        name: job.name,
        schedule: job.schedule,
        isRunning: job.isRunning,
        isExecuting: job.isExecuting,
        lastRun: lastExecution ? lastExecution.completed_at || lastExecution.started_at : null,
        nextRun: job.nextRun,
        lastStatus: lastExecution ? lastExecution.status : null,
        lastError: lastExecution ? lastExecution.error_message : null,
        lastType: lastExecution ? lastExecution.type : null,
        lastStats: lastExecution ? {
          inserted: lastExecution.records_inserted,
          updated: lastExecution.records_updated,
          errors: lastExecution.records_errors
        } : null
      }
    })
    
    return NextResponse.json({
      success: true,
      jobs: jobsWithHistory
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao obter status dos jobs'
      },
      { status: 500 }
    )
  }
}

// POST - Controlar jobs
export async function POST(request: NextRequest) {
  try {
    const { action, jobName } = await request.json()

    switch (action) {
      case 'start':
        if (jobName) {
          cronScheduler.startJob(jobName)
        } else {
          cronScheduler.startAll()
        }
        break

      case 'stop':
        if (jobName) {
          cronScheduler.stopJob(jobName)
        } else {
          cronScheduler.stopAll()
        }
        break

      case 'run-now':
        if (!jobName) {
          return NextResponse.json(
            { success: false, error: 'Nome do job é obrigatório para execução manual' },
            { status: 400 }
          )
        }
        await cronScheduler.runJobNow(jobName)
        break

      case 'add':
        const { schedule, taskName } = await request.json()
        if (!schedule || !taskName) {
          return NextResponse.json(
            { success: false, error: 'Schedule e nome da task são obrigatórios' },
            { status: 400 }
          )
        }
        // Aqui você pode adicionar lógica para adicionar jobs dinamicamente
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Ação não reconhecida' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Ação '${action}' executada com sucesso`
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    )
  }
}
