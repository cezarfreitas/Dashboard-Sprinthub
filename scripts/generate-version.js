#!/usr/bin/env node

/**
 * Script para gerar informações de versão durante o build
 * Extrai SHA do Git e timestamp para versionamento automático
 * 
 * Uso: node scripts/generate-version.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitSHA() {
  try {
    // Tenta obter SHA do Git
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    return sha;
  } catch (error) {
    console.warn('[Version] Não foi possível obter Git SHA, usando fallback');
    // Fallback: usar timestamp se Git não disponível
    return Date.now().toString(36).substring(0, 7);
  }
}

function getGitBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    return branch;
  } catch (error) {
    return 'unknown';
  }
}

function getPackageVersion() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );
    return packageJson.version || '0.1.0';
  } catch (error) {
    return '0.1.0';
  }
}

function generateVersion() {
  const version = getPackageVersion();
  const sha = getGitSHA();
  const branch = getGitBranch();
  const buildDate = new Date().toISOString();
  const environment = process.env.NODE_ENV || 'development';

  const versionInfo = {
    version,
    buildNumber: sha,
    branch,
    buildDate,
    environment,
    generatedAt: buildDate
  };

  // Salvar em arquivo JSON (opcional, para debug)
  const outputPath = path.join(process.cwd(), 'public', 'version.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

  // Imprimir variáveis de ambiente para serem usadas no build
  console.log('\n📦 Version Information Generated:');
  console.log(`   Version: ${version}`);
  console.log(`   Build: ${sha}`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Date: ${buildDate}`);
  console.log(`   Environment: ${environment}`);
  console.log('\n✅ Version file created at: public/version.json\n');

  // Retornar variáveis para uso em scripts
  return versionInfo;
}

// Executar se chamado diretamente
if (require.main === module) {
  generateVersion();
}

module.exports = { generateVersion };

