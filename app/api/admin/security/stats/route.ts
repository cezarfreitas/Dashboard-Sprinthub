/**
 * Security Stats Endpoint
 * Retorna estatísticas de segurança para dashboard de administração
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSecurityStats, getSecurityEvents } from '@/lib/security'
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

    // Obter estatísticas
    const stats = getSecurityStats()
    
    return NextResponse.json({
      success: true,
      stats
    }, {
      headers: getAPISecurityHeaders()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao obter estatísticas de segurança'
      },
      { status: 500, headers: getAPISecurityHeaders() }
    )
  }
}

