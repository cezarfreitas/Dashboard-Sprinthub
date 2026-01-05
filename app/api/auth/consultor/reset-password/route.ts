import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, senha } = await request.json()

    if (!token || !senha) {
      return NextResponse.json(
        { success: false, message: 'Token e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar senha
    if (senha.length < 6) {
      return NextResponse.json(
        { success: false, message: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar vendedor pelo token
    const vendedores = await executeQuery(
      `SELECT id, name, email, reset_token_expires 
       FROM vendedores 
       WHERE reset_token = ? AND reset_token_expires > NOW()`,
      [token]
    ) as any[]

    if (vendedores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Token inválido ou expirado. Solicite uma nova recuperação de senha.' },
        { status: 400 }
      )
    }

    const vendedor = vendedores[0]

    // Gerar hash da nova senha
    const senhaHash = await bcrypt.hash(senha, 10)

    // Atualizar senha e limpar token
    await executeQuery(
      `UPDATE vendedores 
       SET senha = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() 
       WHERE id = ?`,
      [senhaHash, vendedor.id]
    )

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso! Você já pode fazer login.'
    })

  } catch (error) {
    console.error('Erro ao redefinir senha:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}

