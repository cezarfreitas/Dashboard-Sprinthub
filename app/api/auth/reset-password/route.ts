import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Token e nova senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar senha
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar usuário pelo token
    const usuarios = await executeQuery(
      `SELECT id, nome, email, reset_token, reset_token_expires 
       FROM usuarios_sistema 
       WHERE reset_token = ? AND ativo = true`,
      [token]
    ) as any[]

    if (usuarios.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Token inválido ou expirado' },
        { status: 400 }
      )
    }

    const usuario = usuarios[0]

    // Verificar se o token expirou
    const now = new Date()
    const expiresAt = new Date(usuario.reset_token_expires)

    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, message: 'Token expirado. Solicite uma nova recuperação de senha.' },
        { status: 400 }
      )
    }

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(newPassword, 10)

    // Atualizar senha e limpar token
    await executeQuery(
      `UPDATE usuarios_sistema 
       SET senha = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = ?`,
      [senhaHash, usuario.id]
    )

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode fazer login.'
    })

  } catch (error) {
    console.error('Erro ao redefinir senha:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}







