import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // TEMPORÁRIO: Login desabilitado para facilitar desenvolvimento
  // TODO: Reativar autenticação quando necessário
  return NextResponse.next()
  
  /* CÓDIGO ORIGINAL COMENTADO - DESATIVAR QUANDO PRECISAR DE LOGIN
  const { pathname } = request.nextUrl
  
  // Rotas que não precisam de autenticação
  const publicRoutes = [
    '/login', 
    '/api/auth/login', 
    '/api/auth/refresh',
    '/api/test-db',
    '/_next',
    '/favicon.ico'
  ]
  
  // Se for uma rota pública, permitir acesso
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Verificar token no cookie
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    // Redirecionar para login se não tiver token
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Para Edge Runtime, apenas verificar se o token existe
  // A validação completa será feita nas APIs
  return NextResponse.next()
  */
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
