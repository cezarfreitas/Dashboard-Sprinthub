#!/usr/bin/env node

/**
 * Teste da API /api/contatos/check (FORMATO SIMPLIFICADO)
 * 
 * Execução: node scripts/test-check-simplificado.js
 */

const BASE_URL = 'http://localhost:3000'

// Cores para o terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, ...args) {
  console.log(color, ...args, colors.reset)
}

async function testAPI(description, url, expectedExists) {
  log(colors.cyan, '\n' + '='.repeat(60))
  log(colors.blue, `📋 TESTE: ${description}`)
  log(colors.cyan, '='.repeat(60))
  console.log('URL:', url)
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('\n📊 Resposta:')
    console.log(JSON.stringify(data, null, 2))
    
    // Validação
    if (data.exists === expectedExists) {
      log(colors.green, '\n✅ PASSOU: exists =', data.exists)
    } else {
      log(colors.red, '\n❌ FALHOU: Esperado exists =', expectedExists, ', Recebido:', data.exists)
    }
    
    // Análise da resposta
    if (data.exists) {
      console.log('\n📝 Dados do contato:')
      console.log('  - ID:', data.id_contato)
      console.log('  - Nome:', data.nome)
      console.log('  - Vendedor ID:', data.vendedor_id)
      
      if (data.sprinthub) {
        console.log('\n🔄 Chamada SprintHub:')
        console.log('  - Success:', data.sprinthub_success)
        console.log('  - Status:', data.sprinthub_status)
        console.log('  - Resposta:', JSON.stringify(data.sprinthub))
        
        if (data.sprinthub_success) {
          log(colors.green, '  ✅ SprintHub processado com sucesso')
        } else {
          log(colors.yellow, '  ⚠️ SprintHub retornou erro:', data.sprinthub.msg || data.sprinthub.message || 'Erro desconhecido')
        }
      }
    }
    
    return data
    
  } catch (error) {
    log(colors.red, '\n❌ Erro na requisição:', error.message)
    throw error
  }
}

async function runTests() {
  log(colors.green, '\n🚀 INICIANDO TESTES - API SIMPLIFICADA\n')
  
  try {
    // Teste 1: Contato existe - SEM atendimento
    await testAPI(
      'Contato EXISTE - SEM atendimento (não chama SprintHub)',
      `${BASE_URL}/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867`,
      true
    )
    
    // Aguardar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Teste 2: Contato existe - COM atendimento (chama SprintHub)
    await testAPI(
      'Contato EXISTE - COM atendimento (chama SprintHub)',
      `${BASE_URL}/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454`,
      true
    )
    
    // Aguardar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Teste 3: Contato NÃO existe
    await testAPI(
      'Contato NÃO EXISTE',
      `${BASE_URL}/api/contatos/check?wpp_filial=5527981920127&wpp_contato=9999999999999`,
      false
    )
    
    // Aguardar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Teste 4: Parâmetros faltando
    await testAPI(
      'ERRO - Parâmetros faltando',
      `${BASE_URL}/api/contatos/check?wpp_filial=5527981920127`,
      false
    )
    
    log(colors.green, '\n✅ TODOS OS TESTES CONCLUÍDOS!\n')
    
  } catch (error) {
    log(colors.red, '\n❌ ERRO GERAL:', error.message)
    process.exit(1)
  }
}

// Executar testes
runTests()

