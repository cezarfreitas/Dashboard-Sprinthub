import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, generateToken, getUserById } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh-token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token não encontrado' },
        { status: 401 }
      )
    }

    // Verificar refresh token
    const decoded = verifyToken(refreshToken)
    
    if (!decoded || decoded.type !== 'refresh') {
      return NextResponse.json(
        { success: false, message: 'Refresh token inválido' },
        { status: 401 }
      )
    }

    // Buscar usuário
    const user = await getUserById(decoded.id)
    
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado ou inativo' },
        { status: 401 }
      )
    }

    // Gerar novo token
    const newToken = generateToken(user)

    // Criar resposta
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })

    // Definir novo cookie
    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hora
      path: '/',
      priority: 'high'
    })

    return response
  } catch (error) {
    console.error('Erro na API de refresh:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
