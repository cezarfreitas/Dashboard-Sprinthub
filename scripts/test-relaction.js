/**
 * Script de Teste - API Relaction com SprintHub
 * 
 * Execute: node scripts/test-relaction.js
 */

const BASE_URL = 'http://localhost:3000'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testarRelaction() {
  log('\n=== 🧪 TESTE API RELACTION ===\n', 'cyan')

  const payload = {
    wpp_filial: '5527981920127',
    wpp_contato: '5511989882867',
    atendimento: '15454'
  }

  log('📤 Payload Enviado:', 'yellow')
  console.log(JSON.stringify(payload, null, 2))
  log('')

  try {
    const response = await fetch(`${BASE_URL}/api/contatos/relaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    log(`📡 Status HTTP: ${response.status} ${response.statusText}\n`, 'cyan')

    const data = await response.json()

    log('📄 RESPOSTA COMPLETA DA NOSSA API:', 'cyan')
    console.log(JSON.stringify(data, null, 2))
    log('')

    if (data.exists) {
      log('✅ CONTATO ENCONTRADO NO BANCO', 'green')
      log(`   ID Contato: ${data.contato.id_contato}`, 'green')
      log(`   Nome: ${data.contato.nome}`, 'green')
      log(`   Vendedor: ${data.contato.vendedor} (ID: ${data.contato.vendedor_id})`, 'green')
      log('')

      log('🔗 CHAMADA À API SPRINTHUB:', 'magenta')
      log(`   URL: https://sprinthub-api-master.sprinthub.app/sac360/relaction`, 'yellow')
      log(`   Status Code: ${data.sprinthub.status_code}`, 'yellow')
      log('')
      
      log('📤 Payload Enviado ao SprintHub:', 'yellow')
      console.log(JSON.stringify(data.sprinthub.payload_sent, null, 2))
      log('')

      log('📥 RESPOSTA DO SPRINTHUB:', 'magenta')
      console.log(JSON.stringify(data.sprinthub.response, null, 2))
      log('')

      if (data.sprinthub.success) {
        log('✅ SPRINTHUB RETORNOU SUCESSO!', 'green')
      } else {
        log('❌ SPRINTHUB RETORNOU ERRO:', 'red')
        log(`   ${data.sprinthub.error}`, 'red')
      }
    } else {
      log('❌ CONTATO NÃO ENCONTRADO NO BANCO', 'red')
      log(`   Filial: ${data.parametros.wpp_filial}`, 'yellow')
      log(`   Contato: ${data.parametros.wpp_contato}`, 'yellow')
    }

    log('\n=== ✅ TESTE CONCLUÍDO ===\n', 'cyan')

  } catch (error) {
    log('\n❌ ERRO NO TESTE:', 'red')
    console.error(error)
    
    if (error.message.includes('fetch')) {
      log('\n⚠️  Certifique-se que o servidor está rodando:', 'yellow')
      log('   npm run dev\n', 'yellow')
    }
  }
}

testarRelaction()

