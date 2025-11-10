import { NextRequest, NextResponse } from 'next/server'
import { cronScheduler } from '@/lib/cron-scheduler'
import { executeQuery } from '@/lib/database'

// GET - Listar status dos jobs
export async function GET() {
  try {
    const jobs = cronScheduler.getAllJobs()
    
    // Buscar últimas execuções do banco de dados para cada job
    const jobsWithHistory = await Promise.all(jobs.map(async (job) => {
      try {
        const history = await executeQuery(`
          SELECT started_at, completed_at, status, type, records_inserted, records_updated, records_errors
          FROM cron_sync_history
          WHERE job_name = ?
          ORDER BY started_at DESC
          LIMIT 1
        `, [job.name]) as any[]
        
        const lastExecution = history.length > 0 ? history[0] : null
        
        return {
          name: job.name,
          schedule: job.schedule,
          isRunning: job.isRunning,
          isExecuting: job.isExecuting,
          lastRun: lastExecution ? lastExecution.completed_at || lastExecution.started_at : null,
          nextRun: job.nextRun,
          lastStatus: lastExecution ? lastExecution.status : null,
          lastType: lastExecution ? lastExecution.type : null,
          lastStats: lastExecution ? {
            inserted: lastExecution.records_inserted,
            updated: lastExecution.records_updated,
            errors: lastExecution.records_errors
          } : null
        }
      } catch (error) {
        // Se houver erro ao buscar histórico, retornar dados básicos
        return {
          name: job.name,
          schedule: job.schedule,
          isRunning: job.isRunning,
          isExecuting: job.isExecuting,
          lastRun: job.lastRun,
          nextRun: job.nextRun,
          lastStatus: null,
          lastType: null,
          lastStats: null
        }
      }
    }))
    
    return NextResponse.json({
      success: true,
      jobs: jobsWithHistory
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao obter status dos jobs' },
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
