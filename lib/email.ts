import { Resend } from 'resend'

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

// Lazy initialization para evitar erros durante o build
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const resend = getResendClient()
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Sistema <onboarding@resend.dev>',
      to,
      subject,
      html
    })
    
    return { success: true, data }
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return { success: false, error }
  }
}

export function getPasswordResetEmailTemplate(resetLink: string, userName: string) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperação de Senha</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #000000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Recuperação de Senha</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Olá <strong>${userName}</strong>,</p>
        
        <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
          Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${process.env.NEXT_PUBLIC_APP_TITLE || 'GrupoInteli'}</strong>.
        </p>
        
        <p style="font-size: 14px; color: #555; margin-bottom: 30px;">
          Clique no botão abaixo para criar uma nova senha:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background: #000000; 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold;
                    font-size: 16px;
                    display: inline-block;">
            Redefinir Senha
          </a>
        </div>
        
        <p style="font-size: 13px; color: #777; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <strong>⏱️ Este link expira em 1 hora.</strong>
        </p>
        
        <p style="font-size: 13px; color: #777; margin-top: 15px;">
          Se você não solicitou a recuperação de senha, ignore este email. Sua senha permanecerá a mesma.
        </p>
        
        <p style="font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          Se o botão não funcionar, copie e cole este link no navegador:<br>
          <a href="${resetLink}" style="color: #000000; word-break: break-all;">${resetLink}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_APP_TITLE || 'GrupoInteli'}. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `
}
