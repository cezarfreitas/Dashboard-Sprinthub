#!/usr/bin/env node

/**
 * Script para testar configuração do Gmail
 * Verifica se as credenciais estão corretas antes de usar no sistema
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

async function testGmailConfig() {
  console.log('\n📧 Testando Configuração do Gmail...\n')
  console.log('════════════════════════════════════════\n')

  // Verificar variáveis de ambiente
  console.log('1️⃣  Verificando variáveis de ambiente...')
  
  const gmailUser = process.env.GMAIL_USER
  const gmailPassword = process.env.GMAIL_PASSWORD
  const emailFrom = process.env.EMAIL_FROM

  if (!gmailUser) {
    console.log('❌ GMAIL_USER não configurado')
    console.log('   Adicione no .env.local: GMAIL_USER=seu-email@gmail.com\n')
    process.exit(1)
  }
  console.log(`✅ GMAIL_USER: ${gmailUser}`)

  if (!gmailPassword) {
    console.log('❌ GMAIL_PASSWORD não configurado')
    console.log('   Adicione no .env.local: GMAIL_PASSWORD=sua-senha-de-app\n')
    console.log('   🔗 Gere uma senha de app em: https://myaccount.google.com/apppasswords\n')
    process.exit(1)
  }
  
  // Verificar se senha tem espaços (comum em senhas de app)
  const hasSpaces = gmailPassword.includes(' ')
  if (hasSpaces) {
    console.log('⚠️  GMAIL_PASSWORD contém espaços (será removido automaticamente)')
  } else {
    console.log(`✅ GMAIL_PASSWORD: ${'*'.repeat(gmailPassword.length)} (${gmailPassword.length} caracteres)`)
  }

  if (emailFrom) {
    console.log(`✅ EMAIL_FROM: ${emailFrom}`)
  } else {
    console.log(`ℹ️  EMAIL_FROM: Não configurado (usará ${gmailUser})`)
  }

  console.log('\n2️⃣  Testando conexão com Gmail SMTP...\n')

  try {
    const nodemailer = require('nodemailer')
    
    // Remover espaços da senha
    const cleanPassword = gmailPassword.replace(/\s/g, '')
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: cleanPassword
      }
    })

    // Testar conexão
    console.log('   Conectando ao servidor SMTP do Gmail...')
    await transporter.verify()
    
    console.log('✅ Conexão com Gmail estabelecida com sucesso!\n')

    // Perguntar se deseja enviar email de teste
    console.log('3️⃣  Deseja enviar um email de teste? (opcional)\n')
    console.log('   Para testar, execute:')
    console.log(`   node scripts/send-test-email.js ${gmailUser}\n`)

    console.log('════════════════════════════════════════')
    console.log('✅ Configuração do Gmail está CORRETA!\n')
    console.log('   Você pode usar o sistema OTP agora.\n')

  } catch (error) {
    console.log('❌ Erro ao conectar com Gmail:\n')
    
    if (error.message.includes('Invalid login')) {
      console.log('   CAUSA: Credenciais inválidas')
      console.log('   SOLUÇÃO:')
      console.log('   1. Verifique se está usando SENHA DE APP (não senha da conta)')
      console.log('   2. Gere nova senha de app: https://myaccount.google.com/apppasswords')
      console.log('   3. Certifique-se de ter verificação em 2 etapas ativada\n')
    } else if (error.message.includes('Application-specific password required')) {
      console.log('   CAUSA: Senha de app necessária')
      console.log('   SOLUÇÃO:')
      console.log('   1. Ative verificação em 2 etapas: https://myaccount.google.com/security')
      console.log('   2. Gere senha de app: https://myaccount.google.com/apppasswords')
      console.log('   3. Use essa senha no GMAIL_PASSWORD\n')
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('   CAUSA: Problema de rede/firewall')
      console.log('   SOLUÇÃO:')
      console.log('   1. Verifique sua conexão com internet')
      console.log('   2. Verifique firewall')
      console.log('   3. Tente em outra rede\n')
    } else {
      console.log(`   ERRO: ${error.message}\n`)
    }

    console.log('════════════════════════════════════════\n')
    process.exit(1)
  }
}

testGmailConfig().catch(console.error)

