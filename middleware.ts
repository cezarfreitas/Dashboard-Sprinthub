import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rotas que pertencem ao SISTEMA e precisam de autenticação
  const sistemaProtectedRoutes = [
    '/sistema',
    '/configuracoes',
    '/unidades',
    '/vendedores',
    '/metas',
    '/oportunidades',
    '/sprinthub',
    '/analytics',
    '/funil',
    '/ranking'
  ]
  
  // Rotas públicas do SISTEMA
  const sistemaPublicRoutes = [
    '/sistema/login',
    '/sistema/forgot-password',
    '/sistema/reset-password'
  ]
  
  // Verificar se é uma rota pública do sistema
  if (sistemaPublicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Verificar se é uma rota protegida do sistema
  const isSistemaRoute = sistemaProtectedRoutes.some(route => pathname.startsWith(route))
  
  if (isSistemaRoute) {
    // Verificar token no cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Redirecionar para login do sistema
      const loginUrl = new URL('/sistema/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Para rotas do GESTOR e CONSULTOR, não aplicar middleware
  // Elas têm sua própria lógica de autenticação via localStorage
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
