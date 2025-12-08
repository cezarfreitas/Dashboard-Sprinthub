import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/headers'
import { checkMultipleRateLimits, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit-advanced'
import { logSecurityEvent, SecurityEventType, SecurityEventSeverity, extractRequestContext } from '@/lib/security/audit-log'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Aplicar rate limiting em rotas de API
  if (pathname.startsWith('/api/')) {
    const rateLimitType = pathname.includes('/login') ? 'login' :
                          pathname.includes('/auth') ? 'sensitive' :
                          ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) ? 'mutation' :
                          'api'
    
    const rateLimitResult = checkMultipleRateLimits(request, rateLimitType)
    
    if (!rateLimitResult.allowed) {
      const context = extractRequestContext(request)
      logSecurityEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: SecurityEventSeverity.WARNING,
        ...context,
        message: 'Rate limit exceeded',
        details: { retryAfter: rateLimitResult.retryAfter }
      })
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      )
    }
  }
  
  // Rotas que pertencem ao SISTEMA e precisam de autenticação
  const sistemaProtectedRoutes = [
    '/',
    '/sistema',
    '/configuracoes',
    '/unidades',
    '/vendedores',
    '/metas',
    '/oportunidades',
    '/sprinthub',
    '/analytics',
    '/funil',
    '/ranking',
    '/painel',
    '/teste'
  ]
  
  // Rotas públicas do SISTEMA
  const sistemaPublicRoutes = [
    '/sistema/login',
    '/sistema/forgot-password',
    '/sistema/reset-password'
  ]
  
  // Rotas do GESTOR e CONSULTOR (não aplicar middleware - têm sua própria lógica)
  if (pathname.startsWith('/gestor') || pathname.startsWith('/consultor')) {
    const response = NextResponse.next()
    return applySecurityHeaders(response)
  }

  // Verificar se é uma rota pública do sistema
  if (sistemaPublicRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next()
    return applySecurityHeaders(response)
  }
  
  // Verificar se é uma rota protegida do sistema
  const isRootRoute = pathname === '/'
  const isOtherProtectedRoute = sistemaProtectedRoutes
    .filter(route => route !== '/')
    .some(route => pathname.startsWith(route))
  const isSistemaRoute = isRootRoute || isOtherProtectedRoute
  
  if (isSistemaRoute) {
    // Verificar token no cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      const context = extractRequestContext(request)
      logSecurityEvent({
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecurityEventSeverity.INFO,
        ...context,
        message: 'Unauthorized access attempt - no token'
      })
      
      const loginUrl = new URL('/sistema/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  const response = NextResponse.next()
  return applySecurityHeaders(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (Next.js data files)
     * - favicon.ico (favicon file)
     * - uploads (uploaded files - servidos via API)
     * - public files (.png, .jpg, .svg, .ico, .json, etc)
     */
    '/((?!api|_next/static|_next/image|_next/data|favicon.ico|uploads|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp|.*\\.json|.*\\.xml|.*\\.txt).*)',
  ],
}
