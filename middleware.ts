import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
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
    '/ranking'
  ]
  
  // Rotas públicas do SISTEMA
  const sistemaPublicRoutes = [
    '/sistema/login',
    '/sistema/forgot-password',
    '/sistema/reset-password'
  ]
  
  // Rotas do GESTOR e CONSULTOR (não aplicar middleware - têm sua própria lógica)
  if (pathname.startsWith('/gestor') || pathname.startsWith('/consultor')) {
    return NextResponse.next()
  }

  // Verificar se é uma rota pública do sistema
  if (sistemaPublicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Verificar se é uma rota protegida do sistema
  // Tratar rota raiz '/' separadamente
  const isRootRoute = pathname === '/'
  const isOtherProtectedRoute = sistemaProtectedRoutes
    .filter(route => route !== '/')
    .some(route => pathname.startsWith(route))
  const isSistemaRoute = isRootRoute || isOtherProtectedRoute
  
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
