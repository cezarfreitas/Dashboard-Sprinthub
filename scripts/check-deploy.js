#!/usr/bin/env node

/**
 * Script para verificar se o projeto está pronto para deploy no Easypanel
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando preparação para deploy no Easypanel...\n');

const checks = [
  {
    name: 'Dockerfile',
    path: 'Dockerfile',
    required: true,
    description: 'Arquivo Dockerfile para containerização'
  },
  {
    name: '.dockerignore',
    path: '.dockerignore',
    required: true,
    description: 'Arquivo para ignorar arquivos no Docker build'
  },
  {
    name: 'next.config.js (standalone)',
    path: 'next.config.js',
    required: true,
    description: 'Configuração Next.js com output standalone',
    check: (content) => content.includes("output: 'standalone'")
  },
  {
    name: 'Build standalone',
    path: '.next/standalone',
    required: true,
    description: 'Diretório standalone gerado pelo build'
  },
  {
    name: 'server.js',
    path: '.next/standalone/server.js',
    required: true,
    description: 'Arquivo server.js gerado pelo Next.js'
  },
  {
    name: 'package.json (build)',
    path: 'package.json',
    required: true,
    description: 'Scripts de build configurados',
    check: (content) => {
      const pkg = JSON.parse(content);
      return pkg.scripts && pkg.scripts.build;
    }
  },
  {
    name: 'env.production.example',
    path: 'env.production.example',
    required: false,
    description: 'Exemplo de variáveis de ambiente para produção'
  },
  {
    name: 'easypanel.json',
    path: 'easypanel.json',
    required: false,
    description: 'Configuração específica do Easypanel'
  },
  {
    name: 'deploy.md',
    path: 'deploy.md',
    required: false,
    description: 'Documentação de deploy'
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const fullPath = path.join(process.cwd(), check.path);
  const exists = fs.existsSync(fullPath);
  
  if (!exists) {
    if (check.required) {
      console.log(`❌ ${check.name}: FALTANDO (obrigatório)`);
      console.log(`   ${check.description}\n`);
      failed++;
    } else {
      console.log(`⚠️  ${check.name}: FALTANDO (opcional)`);
      console.log(`   ${check.description}\n`);
    }
    return;
  }

  if (check.check) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (check.check(content)) {
        console.log(`✅ ${check.name}: OK`);
        console.log(`   ${check.description}\n`);
        passed++;
      } else {
        console.log(`❌ ${check.name}: FALHOU (verificação específica)`);
        console.log(`   ${check.description}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ERRO ao verificar`);
      console.log(`   ${error.message}\n`);
      failed++;
    }
  } else {
    console.log(`✅ ${check.name}: OK`);
    console.log(`   ${check.description}\n`);
    passed++;
  }
});

console.log('📊 Resumo da Verificação:');
console.log(`✅ Passou: ${passed}`);
console.log(`❌ Falhou: ${failed}`);
console.log(`📝 Total: ${checks.length}\n`);

if (failed === 0) {
  console.log('🎉 Projeto está pronto para deploy no Easypanel!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Configure as variáveis de ambiente no Easypanel');
  console.log('2. Conecte o repositório Git');
  console.log('3. Execute o deploy');
  console.log('4. Verifique a aplicação funcionando\n');
} else {
  console.log('⚠️  Algumas verificações falharam. Corrija os problemas antes do deploy.');
  process.exit(1);
}

// Verificar variáveis de ambiente críticas
console.log('🔧 Variáveis de Ambiente Críticas:');
const criticalEnvVars = [
  'DB_HOST',
  'DB_PORT', 
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

criticalEnvVars.forEach(envVar => {
  console.log(`   ${envVar}: ${process.env[envVar] ? '✅ Configurada' : '⚠️  Não configurada'}`);
});

console.log('\n💡 Dica: Configure todas as variáveis de ambiente no Easypanel antes do deploy.');
