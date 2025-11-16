import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { resetRateLimit } from '@/lib/security/rate-limit-advanced'
import { analyzeInput } from '@/lib/security/input-sanitization'
import { logLoginSuccess, logLoginFailure, logSuspiciousInput } from '@/lib/security/audit-log'
import { getAPISecurityHeaders } from '@/lib/security/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting é aplicado pelo middleware
    
    const body = await request.json()
    const { username, password } = body

    // Validação básica
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username e senha são obrigatórios' },
        { status: 400, headers: getAPISecurityHeaders() }
      )
    }

    // Análise de segurança do input
    const usernameAnalysis = analyzeInput(username.toString())
    if (!usernameAnalysis.isSafe) {
      logSuspiciousInput(request, 'username', usernameAnalysis.threats.join(', '))
      return NextResponse.json(
        { success: false, message: 'Input inválido detectado' },
        { status: 400, headers: getAPISecurityHeaders() }
      )
    }

    // Limpar e normalizar username
    const cleanUsername = usernameAnalysis.sanitized.trim().toLowerCase()
    const cleanPassword = password.toString()

    // Validação de formato
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return NextResponse.json(
        { success: false, message: 'Username deve ter entre 3 e 30 caracteres' },
        { status: 400, headers: getAPISecurityHeaders() }
      )
    }

    // Tentar fazer login
    const result = await login({ username: cleanUsername, password: cleanPassword })

    if (!result.success) {
      logLoginFailure(request, cleanUsername, result.message || 'Invalid credentials')
      
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 401, headers: getAPISecurityHeaders() }
      )
    }

    // Login bem-sucedido
    logLoginSuccess(request, result.user!.id, result.user!.username)
    
    // Resetar rate limit após login bem-sucedido
    resetRateLimit(`login:user:${result.user!.id}`)

    // Criar resposta com cookie de autenticação
    const response = NextResponse.json({
      success: true,
      user: result.user,
      message: 'Login realizado com sucesso'
    }, {
      headers: getAPISecurityHeaders()
    })

    // Definir cookie HTTP-only para segurança máxima
    response.cookies.set('auth-token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 1000, // 1 hora
      path: '/',
      priority: 'high'
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500, headers: getAPISecurityHeaders() }
    )
  }
}
