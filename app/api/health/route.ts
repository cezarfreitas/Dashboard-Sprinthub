/**
 * Health Check Endpoint
 * Para Docker healthcheck e monitoramento
 */

import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: {
    database: 'up' | 'down'
    memory: {
      used: number
      total: number
      percentage: number
    }
  }
  version: string
}

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check database
    let dbStatus: 'up' | 'down' = 'down'
    try {
      await executeQuery('SELECT 1')
      dbStatus = 'up'
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
    const isHealthy = dbStatus === 'up'

    const health: HealthStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      checks: {
        database: dbStatus,
        memory: memoryInfo
      },
      version: process.env.npm_package_version || '1.0.0'
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        ...health,
        responseTime: `${responseTime}ms`
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal error'
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

