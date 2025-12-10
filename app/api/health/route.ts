/**
 * Health Check Endpoint - MINIMALISTA
 * Apenas confirma que o processo Node.js está vivo
 * NÃO valida banco, autenticação ou recursos externos
 * 
 * Este endpoint é usado pelo EasyPanel/Docker para healthcheck.
 * SEMPRE retorna 200 OK se o processo está rodando.
 * 
 * Para monitoramento detalhado (banco, memória, etc), use /api/status
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'unknown'
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

