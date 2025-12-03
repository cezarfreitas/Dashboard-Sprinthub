import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

// GET - Buscar dados do perfil
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'seu-secret-super-secreto'
    )

    const { payload } = await jwtVerify(token, secret)
    const userId = payload.id as number

    const usuarios = await executeQuery(
      'SELECT id, nome, email, whatsapp FROM usuarios_sistema WHERE id = ?',
      [userId]
    ) as Array<{
      id: number
      nome: string
      email: string
      whatsapp: string | null
    }>

    if (usuarios.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: usuarios[0]
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar perfil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PUT - Atualizar perfil
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'seu-secret-super-secreto'
    )

    const { payload } = await jwtVerify(token, secret)
    const userId = payload.id as number

    const body = await request.json()
    const { nome, email, whatsapp } = body

    if (!nome || !email) {
      return NextResponse.json(
        { success: false, message: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      )
    }

    // Verificar se email já está em uso por outro usuário
    const emailCheck = await executeQuery(
      'SELECT id FROM usuarios_sistema WHERE email = ? AND id != ?',
      [email, userId]
    ) as Array<{ id: number }>

    if (emailCheck.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Este email já está em uso' },
        { status: 400 }
      )
    }

    // Atualizar perfil
    await executeQuery(
      'UPDATE usuarios_sistema SET nome = ?, email = ?, whatsapp = ?, updated_at = NOW() WHERE id = ?',
      [nome, email, whatsapp || null, userId]
    )

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao atualizar perfil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

