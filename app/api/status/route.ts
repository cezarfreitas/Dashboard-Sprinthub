/**
 * Status Endpoint - MONITORAMENTO DETALHADO
 * Endpoint para verificação completa de saúde da aplicação
 * Inclui: banco de dados, memória, uptime
 * 
 * Use este endpoint para dashboards de monitoramento e alertas.
 * Diferente de /api/health, este pode retornar status "degraded" sem matar o app.
 */

import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface StatusResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: {
    database: {
      status: 'up' | 'down'
      responseTime?: string
    }
    memory: {
      used: number
      total: number
      percentage: number
    }
  }
  version: string
  env: string
}

export async function GET() {
  const startTime = Date.now()
  
  // Check database
  let dbStatus: 'up' | 'down' = 'down'
  let dbResponseTime: string | undefined
  try {
    const dbStart = Date.now()
    await executeQuery('SELECT 1')
    dbStatus = 'up'
    dbResponseTime = `${Date.now() - dbStart}ms`
  } catch (error) {
    dbStatus = 'down'
  }

  // Check memory
  const memUsage = process.memoryUsage()
  const memoryInfo = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
  }

  // Calculate uptime
  const uptime = process.uptime()

  // Determinar status geral
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (dbStatus === 'down') {
    overallStatus = 'unhealthy'
  } else if (memoryInfo.percentage > 90) {
    overallStatus = 'degraded'
  }

  const status: StatusResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(uptime),
    checks: {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime
      },
      memory: memoryInfo
    },
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'unknown'
  }

  const responseTime = Date.now() - startTime

  // Sempre retorna 200, mas com status interno indicando saúde
  return NextResponse.json(
    {
      ...status,
      responseTime: `${responseTime}ms`
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    }
  )
}

