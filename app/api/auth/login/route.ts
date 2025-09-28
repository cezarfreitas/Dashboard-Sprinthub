import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { validateLoginData, sanitizeString, detectSuspiciousActivity } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting para prevenir ataques de força bruta
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(`login:${clientIP}`)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { username, password } = body

    // Validação robusta
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Sanitização
    const cleanUsername = sanitizeString(username.toString().trim().toLowerCase())
    const cleanPassword = password.toString()

    // Validação usando o sistema robusto
    const validation = validateLoginData(cleanUsername, cleanPassword)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Dados inválidos',
          errors: validation.errors
        },
        { status: 400 }
      )
    }

    // Detectar atividade suspeita
    const suspiciousWarnings = detectSuspiciousActivity(cleanUsername, cleanPassword)
    if (suspiciousWarnings.length > 0) {
      console.warn('⚠️ Atividade suspeita detectada:', suspiciousWarnings)
    }

    // Tentar fazer login
    const result = await login({ username: cleanUsername, password: cleanPassword })

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 401 }
      )
    }

    // Criar resposta com cookie de autenticação
    const response = NextResponse.json({
      success: true,
      user: result.user,
      message: 'Login realizado com sucesso'
    })

    // Definir cookie HTTP-only para segurança
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
    console.error('Erro na API de login:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
