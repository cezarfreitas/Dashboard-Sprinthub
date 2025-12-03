import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// PUT - Trocar senha
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
    const { senhaAtual, senhaNova, senhaNovaConfirmacao } = body

    if (!senhaAtual || !senhaNova || !senhaNovaConfirmacao) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (senhaNova !== senhaNovaConfirmacao) {
      return NextResponse.json(
        { success: false, message: 'As novas senhas não coincidem' },
        { status: 400 }
      )
    }

    if (senhaNova.length < 6) {
      return NextResponse.json(
        { success: false, message: 'A nova senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar usuário e senha atual
    const usuarios = await executeQuery(
      'SELECT senha FROM usuarios_sistema WHERE id = ?',
      [userId]
    ) as Array<{ senha: string }>

    if (usuarios.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar senha atual
    const senhaValida = await bcrypt.compare(senhaAtual, usuarios[0].senha)

    if (!senhaValida) {
      return NextResponse.json(
        { success: false, message: 'Senha atual incorreta' },
        { status: 401 }
      )
    }

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(senhaNova, 10)

    // Atualizar senha
    await executeQuery(
      'UPDATE usuarios_sistema SET senha = ?, updated_at = NOW() WHERE id = ?',
      [senhaHash, userId]
    )

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao alterar senha',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

