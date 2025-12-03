import { getEmpresaEmailConfig, type EmpresaEmailConfig } from './get-empresa-email-config'

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

// Verificar qual método de envio usar
function getEmailProvider() {
  // Se tiver configuração Gmail, usar Gmail
  if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
    return 'gmail'
  }
  // Gmail é obrigatório agora - não usar Resend
  return null
}

// Enviar email via Gmail SMTP
async function sendEmailViaGmail({ to, subject, html }: SendEmailParams) {
  try {
    // Validar configuração do Gmail
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
      throw new Error('Gmail não está configurado. Configure GMAIL_USER e GMAIL_PASSWORD nas variáveis de ambiente.')
    }
    
    // Importação dinâmica do nodemailer
    const nodemailer = await import('nodemailer')
    
    // Remover espaços da senha (Gmail gera senha de app com espaços)
    const gmailPassword = process.env.GMAIL_PASSWORD.replace(/\s/g, '')
    
    if (!gmailPassword) {
      throw new Error('GMAIL_PASSWORD está vazio ou inválido.')
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: gmailPassword
      }
    })

    // Verificar conexão antes de enviar
    await transporter.verify()

    // Usar EMAIL_FROM se configurado, senão usar GMAIL_USER
    // Formato: "Nome <email@domain.com>" ou apenas "email@domain.com"
    const fromEmail = process.env.EMAIL_FROM || 
                     `Sistema <${process.env.GMAIL_USER}>`
    
    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      html
    }

    const info = await transporter.sendMail(mailOptions)
    return { success: true, data: info }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Detectar erro específico de senha de app
    let friendlyError = errorMessage
    if (errorMessage.includes('Application-specific password required') || 
        errorMessage.includes('InvalidSecondFactor')) {
      friendlyError = 'Senha de app do Gmail necessária. A conta tem verificação em duas etapas ativada. Você precisa gerar uma senha de app em: https://myaccount.google.com/apppasswords'
    } else if (errorMessage.includes('Invalid login') || errorMessage.includes('EAUTH')) {
      friendlyError = 'Credenciais do Gmail inválidas. Verifique se está usando uma senha de app (não a senha normal da conta) e se a verificação em duas etapas está ativada.'
    }
    
    console.error('Erro ao enviar email via Gmail:', {
      error: errorMessage,
      friendlyError,
      gmailUser: process.env.GMAIL_USER || 'Não configurado',
      hasPassword: !!process.env.GMAIL_PASSWORD,
      helpUrl: 'https://support.google.com/mail/?p=InvalidSecondFactor'
    })
    
    return { 
      success: false, 
      error: new Error(friendlyError)
    }
  }
}


export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const provider = getEmailProvider()
  
  if (provider === 'gmail') {
    return await sendEmailViaGmail({ to, subject, html })
  } else {
    // Gmail é obrigatório - retornar erro se não estiver configurado
    return {
      success: false,
      error: new Error('Gmail não está configurado. Configure as variáveis de ambiente GMAIL_USER e GMAIL_PASSWORD.')
    }
  }
}

export async function getPasswordResetEmailTemplate(resetLink: string, userName: string, requestUrl?: string) {
  const empresaConfig = await getEmpresaEmailConfig()
  
  // Obter URL base - usar a URL do resetLink se disponível (já foi construída corretamente)
  // ou priorizar variáveis de ambiente de produção
  let appUrl = process.env.NEXT_PUBLIC_APP_URL || 
               process.env.NEXT_PUBLIC_BASE_URL || 
               process.env.APP_URL ||
               'http://localhost:3000'
  
  // Se resetLink foi fornecido, extrair a URL base dele (mais confiável)
  if (resetLink) {
    try {
      const url = new URL(resetLink)
      appUrl = `${url.protocol}//${url.host}`
    } catch (e) {
      // Se não conseguir parsear, usar o appUrl padrão
    }
  }
  
  // Construir URL completa do logotipo
  let logotipoUrl = ''
  if (empresaConfig.logotipo) {
    if (empresaConfig.logotipo.startsWith('http://') || empresaConfig.logotipo.startsWith('https://')) {
      // Já é uma URL completa
      logotipoUrl = empresaConfig.logotipo
    } else {
      // É um caminho relativo - construir URL completa
      // Garantir que começa com /
      const logoPath = empresaConfig.logotipo.startsWith('/') 
        ? empresaConfig.logotipo 
        : `/${empresaConfig.logotipo}`
      
      // Remover barra dupla se houver
      const cleanAppUrl = appUrl.replace(/\/$/, '')
      logotipoUrl = `${cleanAppUrl}${logoPath}`
    }
  }
  
  // Log para debug (sempre logar para ajudar no diagnóstico)
  console.log('Email template - Logo URL:', {
    logotipo: empresaConfig.logotipo,
    appUrl,
    logotipoUrl,
    hasLogo: !!logotipoUrl,
    isAbsolute: logotipoUrl ? (logotipoUrl.startsWith('http://') || logotipoUrl.startsWith('https://')) : false
  })

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperação de Senha - ${empresaConfig.nome}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${empresaConfig.corPrincipal}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        ${logotipoUrl ? `
          <img src="${logotipoUrl}" 
               alt="${empresaConfig.nome}" 
               style="max-height: 60px; max-width: 200px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; border: 0; outline: none; text-decoration: none;" 
               width="200" 
               height="60" 
               border="0" />
        ` : ''}
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Recuperação de Senha</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Olá <strong>${userName}</strong>,</p>
        
        <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
          Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${empresaConfig.nome}</strong>.
        </p>
        
        <p style="font-size: 14px; color: #555; margin-bottom: 30px;">
          Clique no botão abaixo para criar uma nova senha:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background: ${empresaConfig.corPrincipal}; 
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
          <a href="${resetLink}" style="color: ${empresaConfig.corPrincipal}; word-break: break-all;">${resetLink}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${empresaConfig.nome}. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `
}
