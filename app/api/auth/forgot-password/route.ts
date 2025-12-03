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

    // Obter URL base do servidor
    const getBaseUrl = () => {
      // Tentar obter do header do request (mais confiável em produção)
      const host = request.headers.get('host')
      
      if (host) {
        // Detectar protocolo: usar HTTPS em produção, HTTP apenas em localhost
        const protocol = host.includes('localhost') 
          ? 'http' 
          : (request.headers.get('x-forwarded-proto') || 'https')
        return `${protocol}://${host}`
      }
      
      // Fallback para variáveis de ambiente
      return process.env.NEXT_PUBLIC_APP_URL || 
             process.env.NEXT_PUBLIC_BASE_URL || 
             process.env.APP_URL ||
             'http://localhost:3000'
    }
    
    const baseUrl = getBaseUrl()
    const resetLink = `${baseUrl}/sistema/reset-password?token=${resetToken}`

    // Buscar configurações da empresa para o email
    const { getEmpresaEmailConfig } = await import('@/lib/get-empresa-email-config')
    const empresaConfig = await getEmpresaEmailConfig()

    // Gerar template do email
    const emailHtml = await getPasswordResetEmailTemplate(resetLink, usuario.nome)
    
    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email de recuperação de senha:', {
        to: usuario.email,
        empresaNome: empresaConfig.nome,
        logotipo: empresaConfig.logotipo,
        resetLink
      })
    }

    // Enviar email
    const emailResult = await sendEmail({
      to: usuario.email,
      subject: `Recuperação de Senha - ${empresaConfig.nome}`,
      html: emailHtml
    })

    if (!emailResult.success) {
      const errorMessage = emailResult.error instanceof Error 
        ? emailResult.error.message 
        : 'Erro desconhecido ao enviar email'
      
      console.error('Erro ao enviar email:', {
        error: emailResult.error,
        message: errorMessage,
        gmailUser: process.env.GMAIL_USER ? 'Configurado' : 'Não configurado',
        gmailPassword: process.env.GMAIL_PASSWORD ? 'Configurado' : 'Não configurado'
      })
      
      // Por segurança, retornar sucesso mesmo se houver erro no envio
      // Mas logar o erro para debug
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para recuperar sua senha.'
      })
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

