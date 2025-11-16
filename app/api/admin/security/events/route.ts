/**
 * Security Events Endpoint
 * Retorna eventos de segurança para dashboard de administração
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSecurityEvents, SecurityEventSeverity } from '@/lib/security'
import { verifyToken } from '@/lib/auth'
import { getAPISecurityHeaders } from '@/lib/security/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401, headers: getAPISecurityHeaders() }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401, headers: getAPISecurityHeaders() }
      )
    }

    // Verificar se é admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403, headers: getAPISecurityHeaders() }
      )
    }

    // Obter parâmetros da query
    const { searchParams } = request.nextUrl
    const limit = Math.min(1000, parseInt(searchParams.get('limit') || '100'))
    const severity = searchParams.get('severity') as SecurityEventSeverity | undefined

    // Obter eventos
    const events = getSecurityEvents(limit, severity)
    
    return NextResponse.json({
      success: true,
      events,
      count: events.length
    }, {
      headers: getAPISecurityHeaders()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao obter eventos de segurança'
      },
      { status: 500, headers: getAPISecurityHeaders() }
    )
  }
}

