import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { sendEmail } from '@/lib/email'
import { getEmpresaEmailConfig } from '@/lib/get-empresa-email-config'
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

    // Buscar vendedor pelo email
    const vendedores = await executeQuery(
      'SELECT id, name, email, ativo, status FROM vendedores WHERE email = ?',
      [email]
    ) as any[]

    if (vendedores.length === 0) {
      // Por segurança, sempre retornar sucesso mesmo se o email não existir
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para recuperar sua senha.'
      })
    }

    const vendedor = vendedores[0]

    // Verificar se está ativo
    if (!vendedor.ativo || vendedor.status === 'inactive' || vendedor.status === 'blocked') {
      return NextResponse.json(
        { success: false, message: 'Usuário inativo. Entre em contato com o administrador.' },
        { status: 403 }
      )
    }

    // Verificar se é gestor
    const unidadesGestor = await executeQuery(
      `SELECT u.id FROM unidades u
       WHERE u.ativo = 1
       AND JSON_CONTAINS(u.user_gestao, ?)`,
      [JSON.stringify(vendedor.id)]
    ) as any[]

    if (unidadesGestor.length === 0) {
      // Por segurança, retornar sucesso mesmo se não for gestor
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para recuperar sua senha.'
      })
    }

    // Gerar token único
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date(Date.now() + 3600000) // 1 hora

    // Salvar token no banco
    await executeQuery(
      'UPDATE vendedores SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, vendedor.id]
    )

    // Obter URL base do servidor
    const getBaseUrl = () => {
      const host = request.headers.get('host')
      
      if (host) {
        const protocol = host.includes('localhost') 
          ? 'http' 
          : (request.headers.get('x-forwarded-proto') || 'https')
        return `${protocol}://${host}`
      }
      
      return process.env.NEXT_PUBLIC_APP_URL || 
             process.env.NEXT_PUBLIC_BASE_URL || 
             'http://localhost:3000'
    }
    
    const baseUrl = getBaseUrl()
    const resetLink = `${baseUrl}/gestor/reset-password?token=${resetToken}`

    // Buscar configurações da empresa
    const empresaConfig = await getEmpresaEmailConfig()

    // Template do email
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha - ${empresaConfig.nome}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); padding: 30px; text-align: center;">
              ${empresaConfig.logotipo ? `<img src="${empresaConfig.logotipo}" alt="${empresaConfig.nome}" style="max-height: 50px; max-width: 200px;">` : `<h1 style="color: white; margin: 0; font-size: 24px;">${empresaConfig.nome}</h1>`}
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Olá, ${vendedor.name}!</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Recebemos uma solicitação para redefinir a senha da sua conta de gestor.
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #374151; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Redefinir Senha
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Este link expira em <strong>1 hora</strong>. Se você não solicitou a recuperação de senha, ignore este email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${resetLink}" style="color: #374151; word-break: break-all;">${resetLink}</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${empresaConfig.nome}. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    // Enviar email
    const emailResult = await sendEmail({
      to: vendedor.email,
      subject: `Recuperação de Senha (Gestor) - ${empresaConfig.nome}`,
      html: emailHtml
    })

    if (!emailResult.success) {
      console.error('Erro ao enviar email de recuperação:', emailResult.error)
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

