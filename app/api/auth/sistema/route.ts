import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

export const dynamic = 'force-dynamic'

interface UsuarioSistema {
  id: number
  nome: string
  email: string
  senha: string
  permissoes: string | string[]
  ativo: boolean
}

// POST - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, senha } = body

    // Validações
    if (!email || !senha) {
      return NextResponse.json(
        { success: false, message: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar usuário por email
    const usuarios = await executeQuery(
      'SELECT id, nome, email, senha, permissoes, ativo FROM usuarios_sistema WHERE email = ?',
      [email]
    ) as UsuarioSistema[]

    if (usuarios.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    const usuario = usuarios[0]

    // Verificar se está ativo
    if (!usuario.ativo) {
      return NextResponse.json(
        { success: false, message: 'Usuário inativo. Entre em contato com o administrador.' },
        { status: 403 }
      )
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha)

    if (!senhaValida) {
      return NextResponse.json(
        { success: false, message: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    // Parsear permissões
    let permissoes: string[] = []
    if (usuario.permissoes) {
      if (typeof usuario.permissoes === 'string') {
        try {
          permissoes = JSON.parse(usuario.permissoes)
        } catch {
          permissoes = []
        }
      } else {
        permissoes = usuario.permissoes
      }
    }

    // Criar token JWT
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'seu-secret-super-secreto'
    )

    const token = await new SignJWT({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      permissoes: permissoes,
      role: 'admin'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(process.env.JWT_EXPIRES_IN || '24h')
      .sign(secret)

    // Preparar resposta
    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        permissoes: permissoes,
        role: 'admin'
      }
    })

    // Setar cookie com token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 horas
    })

    return response

  } catch (error) {
    console.error('❌ Erro no login:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// GET - Verificar sessão atual
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'seu-secret-super-secreto'
    )

    const { jwtVerify } = await import('jose')
    const { payload } = await jwtVerify(token, secret)

    return NextResponse.json({
      success: true,
      user: {
        id: payload.id,
        nome: payload.nome,
        email: payload.email,
        permissoes: payload.permissoes,
        role: payload.role
      }
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Token inválido ou expirado' },
      { status: 401 }
    )
  }
}

// DELETE - Logout
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Logout realizado com sucesso'
  })

  response.cookies.delete('auth-token')

  return response
}

