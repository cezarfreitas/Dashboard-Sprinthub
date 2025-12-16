#!/usr/bin/env node

/**
 * Script para enviar email de teste
 * Uso: node scripts/send-test-email.js email@example.com
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const emailDestino = process.argv[2]

if (!emailDestino) {
  console.log('\n❌ Email de destino não fornecido\n')
  console.log('Uso: node scripts/send-test-email.js email@example.com\n')
  process.exit(1)
}

async function sendTestEmail() {
  console.log('\n📧 Enviando Email de Teste...\n')
  console.log('════════════════════════════════════════\n')

  const gmailUser = process.env.GMAIL_USER
  const gmailPassword = process.env.GMAIL_PASSWORD
  const emailFrom = process.env.EMAIL_FROM || `Sistema <${gmailUser}>`

  try {
    const nodemailer = require('nodemailer')
    
    const cleanPassword = gmailPassword.replace(/\s/g, '')
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: cleanPassword
      }
    })

    const codigoTeste = '123456'
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Teste - Código de Acesso</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Email de Teste</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Olá,</p>
          
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            Este é um <strong>email de teste</strong> do sistema OTP do Dash Inteli.
          </p>
          
          <p style="font-size: 14px; color: #555; margin-bottom: 30px;">
            Se você está vendo este email, significa que a configuração do Gmail está correta!
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: white; 
                        border: 3px dashed #2563eb; 
                        padding: 20px 40px; 
                        border-radius: 10px;
                        display: inline-block;">
              <span style="font-size: 42px; 
                           font-weight: bold; 
                           letter-spacing: 8px;
                           color: #2563eb;
                           font-family: 'Courier New', monospace;">
                ${codigoTeste}
              </span>
            </div>
          </div>
          
          <p style="font-size: 13px; color: #777; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            ✅ <strong>Configuração Gmail: OK</strong>
          </p>
          
          <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 5px; padding: 15px; margin-top: 25px;">
            <p style="font-size: 13px; color: #065f46; margin: 0;">
              <strong>✅ Sucesso!</strong> Sua configuração de email está funcionando perfeitamente.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Dash Inteli - Sistema OTP</p>
        </div>
      </body>
      </html>
    `

    console.log(`   De: ${emailFrom}`)
    console.log(`   Para: ${emailDestino}`)
    console.log(`   Assunto: Teste - Código de Acesso OTP\n`)
    console.log('   Enviando...\n')

    const info = await transporter.sendMail({
      from: emailFrom,
      to: emailDestino,
      subject: 'Teste - Código de Acesso OTP',
      html: htmlContent
    })

    console.log('✅ Email enviado com sucesso!\n')
    console.log(`   Message ID: ${info.messageId}\n`)
    console.log('════════════════════════════════════════\n')
    console.log('📬 Verifique a caixa de entrada do email:\n')
    console.log(`   ${emailDestino}\n`)
    console.log('   (Se não encontrar, verifique a pasta Spam)\n')

  } catch (error) {
    console.log('❌ Erro ao enviar email:\n')
    console.log(`   ${error.message}\n`)
    console.log('════════════════════════════════════════\n')
    process.exit(1)
  }
}

sendTestEmail().catch(console.error)

