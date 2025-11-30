#!/usr/bin/env node

/**
 * Teste da API /api/contatos/check usando POST
 * 
 * Execução: node scripts/test-check-post.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Cores para o terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(color, ...args) {
  console.log(color, ...args, colors.reset)
}

async function testPOST(description, body, expectedExists = null) {
  log(colors.cyan, '\n' + '='.repeat(60))
  log(colors.blue, `📋 TESTE: ${description}`)
  log(colors.cyan, '='.repeat(60))
  console.log('URL:', `${BASE_URL}/api/contatos/check`)
  console.log('Method: POST')
  console.log('Body:', JSON.stringify(body, null, 2))
  
  try {
    const response = await fetch(`${BASE_URL}/api/contatos/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    const data = await response.json()
    
    console.log('\n📊 Status HTTP:', response.status)
    console.log('\n📦 Resposta:')
    console.log(JSON.stringify(data, null, 2))
    
    // Validação
    if (expectedExists !== null) {
      if (data.exists === expectedExists) {
        log(colors.green, '\n✅ PASSOU: exists =', data.exists)
      } else {
        log(colors.red, '\n❌ FALHOU: Esperado exists =', expectedExists, ', Recebido:', data.exists)
      }
    }
    
    // Análise da resposta
    if (data.exists) {
      console.log('\n📝 Dados do contato:')
      console.log('  - ID:', data.id_contato)
      console.log('  - Nome:', data.nome)
      console.log('  - Vendedor ID:', data.vendedor_id)
      
      if (data.sprinthub !== undefined) {
        console.log('\n🔄 Chamada SprintHub:')
        console.log('  - Success:', data.sprinthub_success)
        console.log('  - Status:', data.sprinthub_status)
        console.log('  - Resposta:', JSON.stringify(data.sprinthub, null, 2))
        
        if (data.sprinthub_success) {
          log(colors.green, '  ✅ SprintHub processado com sucesso')
        } else {
          log(colors.yellow, '  ⚠️ SprintHub retornou erro')
        }
      } else {
        log(colors.magenta, '\nℹ️ SprintHub não foi chamado (atendimento não fornecido)')
      }
    }
    
    return data
    
  } catch (error) {
    log(colors.red, '\n❌ Erro na requisição:', error.message)
    throw error
  }
}

async function runTests() {
  log(colors.green, '\n🚀 INICIANDO TESTES - API POST\n')
  log(colors.yellow, `Base URL: ${BASE_URL}\n`)
  
  try {
    // Teste 1: POST com todos os parâmetros (incluindo atendimento)
    await testPOST(
      'POST - Contato com atendimento (chama SprintHub)',
      {
        wpp_filial: '554792616714',
        wpp_contato: '5511989882867',
        atendimento: '6163'
      },
      true
    )
    
    // Aguardar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Teste 2: POST sem atendimento
    await testPOST(
      'POST - Contato sem atendimento (não chama SprintHub)',
      {
        wpp_filial: '5527981920127',
        wpp_contato: '5511989882867'
      },
      true
    )
    
    // Aguardar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Teste 3: Contato que não existe
    await testPOST(
      'POST - Contato NÃO EXISTE',
      {
        wpp_filial: '5527981920127',
        wpp_contato: '9999999999999',
        atendimento: '123'
      },
      false
    )
    
    // Aguardar 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Teste 4: Parâmetros faltando
    await testPOST(
      'POST - ERRO: Parâmetros faltando',
      {
        wpp_filial: '5527981920127'
        // wpp_contato faltando
      },
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

