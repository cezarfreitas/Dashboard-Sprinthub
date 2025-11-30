/**
 * Teste - Verificar se Contato Existe
 * 
 * Execute: node scripts/test-check-contato.js
 */

const BASE_URL = 'http://localhost:3000'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testarConsulta() {
  log('\n=== 🔍 TESTE DE CONSULTA DE CONTATO ===\n', 'cyan')

  const wppFilial = '5527981920127'
  const wppContato = '5511989882867'
  const atendimento = '15454' // opcional - comente para testar sem

  try {
    log(`📞 Consultando:`, 'yellow')
    log(`   Filial: ${wppFilial}`)
    log(`   Contato: ${wppContato}`)
    if (atendimento) {
      log(`   Atendimento: ${atendimento}`)
    }
    log('')

    // Montar URL
    let url = `${BASE_URL}/api/contatos/check?wpp_filial=${wppFilial}&wpp_contato=${wppContato}`
    if (atendimento) {
      url += `&atendimento=${atendimento}`
    }

    const response = await fetch(url)

    log(`📡 Status: ${response.status} ${response.statusText}\n`, 'cyan')

    const data = await response.json()

    console.log('📄 Resposta Completa:')
    console.log(JSON.stringify(data, null, 2))

    if (data.exists) {
      log('\n✅ CONTATO EXISTE NA FILIAL!', 'green')
      log(`\n📋 Informações:`, 'cyan')
      log(`   ID: ${data.contato.id_contato}`)
      log(`   Nome: ${data.contato.nome}`)
      log(`   Vendedor: ${data.contato.vendedor} (ID: ${data.contato.vendedor_id})`)
      log(`   Status: ${data.contato.ativo ? 'Ativo' : 'Inativo'}`)
      if (data.contato.observacoes) {
        log(`   Observações: ${data.contato.observacoes}`)
      }
    } else {
      log('\n❌ CONTATO NÃO EXISTE NA FILIAL', 'red')
      log('\n💡 Você pode criar este contato usando:', 'yellow')
      log(`\ncurl -X POST http://localhost:3000/api/contatos \\
  -H "Content-Type: application/json" \\
  -d '{
    "id_contato": "65853",
    "wpp_filial": "${wppFilial}",
    "wpp_contato": "${wppContato}",
    "vendedor": "Nome do Vendedor",
    "vendedor_id": "228",
    "nome": "Nome do Contato"
  }'`)
    }

    log('\n=== ✅ TESTE CONCLUÍDO ===\n', 'cyan')

  } catch (error) {
    log('\n❌ ERRO:', 'red')
    console.error(error)
    
    if (error.message.includes('fetch')) {
      log('\n⚠️  Certifique-se que o servidor está rodando:', 'yellow')
      log('   npm run dev\n')
    }
  }
}

testarConsulta()

