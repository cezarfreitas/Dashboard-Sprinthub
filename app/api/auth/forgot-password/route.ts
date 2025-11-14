import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { sendEmail, getPasswordResetEmailTemplate } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário existe
    const usuarios = await executeQuery(
      'SELECT id, nome, email, ativo FROM usuarios_sistema WHERE email = ?',
      [email]
    ) as any[]

    if (usuarios.length === 0) {
      // Por segurança, sempre retornar sucesso mesmo se o email não existir
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para recuperar sua senha.'
      })
    }

    const usuario = usuarios[0]

    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      return NextResponse.json(
        { success: false, message: 'Usuário inativo. Entre em contato com o administrador.' },
        { status: 403 }
      )
    }

    // Gerar token único
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date(Date.now() + 3600000) // 1 hora

    // Salvar token no banco
    await executeQuery(
      'UPDATE usuarios_sistema SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, usuario.id]
    )

    // Criar link de recuperação
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sistema/reset-password?token=${resetToken}`

    // Enviar email
    const emailResult = await sendEmail({
      to: usuario.email,
      subject: `Recuperação de Senha - ${process.env.NEXT_PUBLIC_APP_TITLE || 'GrupoInteli'}`,
      html: getPasswordResetEmailTemplate(resetLink, usuario.nome)
    })

    if (!emailResult.success) {
      console.error('Erro ao enviar email:', emailResult.error)
      return NextResponse.json(
        { success: false, message: 'Erro ao enviar email. Tente novamente mais tarde.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá instruções para recuperar sua senha.'
    })

  } catch (error) {
    console.error('Erro ao processar recuperação de senha:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}





