#!/usr/bin/env tsx

/**
 * Script para gerar secrets de segurança
 * 
 * Uso:
 *   npx tsx scripts/generate-security-secrets.ts
 *   npm run generate-secrets
 */

import { randomBytes } from 'crypto'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ENV_FILE = join(process.cwd(), '.env')
const ENV_EXAMPLE = join(process.cwd(), '.env.security.example')

function generateSecret(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

function updateEnvFile() {
  let envContent = ''
  
  // Ler .env existente se houver
  if (existsSync(ENV_FILE)) {
    envContent = readFileSync(ENV_FILE, 'utf-8')
    console.log('✅ Arquivo .env encontrado')
  } else {
    console.log('ℹ️ Arquivo .env não encontrado, criando novo...')
  }

  // Verificar se JWT_SECRET já existe
  if (!envContent.includes('JWT_SECRET=') || envContent.match(/JWT_SECRET=$/m)) {
    const jwtSecret = generateSecret(32)
    if (envContent.includes('JWT_SECRET=')) {
      envContent = envContent.replace(/JWT_SECRET=.*$/m, `JWT_SECRET=${jwtSecret}`)
      console.log('🔄 JWT_SECRET atualizado')
    } else {
      envContent += `\n# Security\nJWT_SECRET=${jwtSecret}\n`
      console.log('✅ JWT_SECRET gerado')
    }
  } else {
    console.log('✓ JWT_SECRET já existe')
  }

  // Verificar se CSRF_SECRET já existe
  if (!envContent.includes('CSRF_SECRET=') || envContent.match(/CSRF_SECRET=$/m)) {
    const csrfSecret = generateSecret(32)
    if (envContent.includes('CSRF_SECRET=')) {
      envContent = envContent.replace(/CSRF_SECRET=.*$/m, `CSRF_SECRET=${csrfSecret}`)
      console.log('🔄 CSRF_SECRET atualizado')
    } else {
      envContent += `CSRF_SECRET=${csrfSecret}\n`
      console.log('✅ CSRF_SECRET gerado')
    }
  } else {
    console.log('✓ CSRF_SECRET já existe')
  }

  // Adicionar JWT_EXPIRES_IN se não existir
  if (!envContent.includes('JWT_EXPIRES_IN=')) {
    envContent += `JWT_EXPIRES_IN=1h\n`
    console.log('✅ JWT_EXPIRES_IN adicionado (1h)')
  }

  // Salvar arquivo
  writeFileSync(ENV_FILE, envContent)
  console.log('\n✅ Arquivo .env atualizado com sucesso!\n')
}

function displaySecrets() {
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║       🔐 GERADOR DE SECRETS DE SEGURANÇA             ║')
  console.log('╚═══════════════════════════════════════════════════════╝\n')

  updateEnvFile()

  console.log('📝 PRÓXIMOS PASSOS:\n')
  console.log('1. Revisar o arquivo .env')
  console.log('2. NÃO commitar o arquivo .env no git')
  console.log('3. Reiniciar a aplicação: npm run build && npm start')
  console.log('4. Verificar logs de segurança\n')

  console.log('⚠️  IMPORTANTE:\n')
  console.log('- Mantenha os secrets em local seguro')
  console.log('- Não compartilhe os secrets')
  console.log('- Rotacione os secrets periodicamente')
  console.log('- Use secrets diferentes para dev e produção\n')

  console.log('✅ Configuração de segurança concluída!\n')
}

// Executar
displaySecrets()

