/**
 * Script de Teste - API de Contatos WhatsApp
 * 
 * Para executar:
 * node scripts/test-contatos-api.js
 * 
 * Pré-requisitos:
 * - Servidor rodando em http://localhost:3000
 * - Vendedor com ID 228 deve existir no banco
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testarAPI() {
  log('\n=== 🧪 TESTE DA API DE CONTATOS ===\n', 'cyan')

  const idContato = `test_${Date.now()}`
  
  try {
    // 1. CRIAR CONTATO
    log('1️⃣  Testando POST /api/contatos...', 'blue')
    const novoContato = {
      id_contato: idContato,
      wpp_filial: '5527981920127',
      wpp_contato: '5511989882867',
      vendedor: 'Gilmar ES OUTDOOR',
      vendedor_id: '228',
      nome: 'Contato Teste',
      observacoes: 'Criado via script de teste'
    }

    const createResponse = await fetch(`${BASE_URL}/api/contatos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoContato)
    })

    const createData = await createResponse.json()
    
    if (createResponse.status === 201) {
      log('✅ Contato criado com sucesso!', 'green')
      console.log(JSON.stringify(createData, null, 2))
    } else {
      log(`❌ Erro ao criar contato: ${createData.message}`, 'red')
      return
    }

    // 2. BUSCAR CONTATO ESPECÍFICO
    log('\n2️⃣  Testando GET /api/contatos/[id]...', 'blue')
    const getResponse = await fetch(`${BASE_URL}/api/contatos/${idContato}`)
    const getData = await getResponse.json()
    
    if (getResponse.status === 200) {
      log('✅ Contato encontrado!', 'green')
      console.log(JSON.stringify(getData, null, 2))
    } else {
      log(`❌ Erro ao buscar contato: ${getData.message}`, 'red')
    }

    // 3. ATUALIZAR CONTATO
    log('\n3️⃣  Testando PATCH /api/contatos/[id]...', 'blue')
    const updatePayload = {
      nome: 'Contato Teste Atualizado',
      observacoes: 'Atualizado via script de teste'
    }

    const patchResponse = await fetch(`${BASE_URL}/api/contatos/${idContato}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    })

    const patchData = await patchResponse.json()
    
    if (patchResponse.status === 200) {
      log('✅ Contato atualizado!', 'green')
      console.log(JSON.stringify(patchData, null, 2))
    } else {
      log(`❌ Erro ao atualizar contato: ${patchData.message}`, 'red')
    }

    // 4. LISTAR CONTATOS
    log('\n4️⃣  Testando GET /api/contatos (listagem)...', 'blue')
    const listResponse = await fetch(`${BASE_URL}/api/contatos?vendedor_id=228&limit=5`)
    const listData = await listResponse.json()
    
    if (listResponse.status === 200) {
      log(`✅ Listagem bem-sucedida! Total: ${listData.pagination.total}`, 'green')
      console.log(JSON.stringify(listData, null, 2))
    } else {
      log(`❌ Erro ao listar contatos: ${listData.message}`, 'red')
    }

    // 5. SOFT DELETE
    log('\n5️⃣  Testando DELETE /api/contatos/[id] (soft delete)...', 'blue')
    const deleteResponse = await fetch(`${BASE_URL}/api/contatos/${idContato}`, {
      method: 'DELETE'
    })

    const deleteData = await deleteResponse.json()
    
    if (deleteResponse.status === 200) {
      log('✅ Contato desativado (soft delete)!', 'green')
      console.log(JSON.stringify(deleteData, null, 2))
    } else {
      log(`❌ Erro ao desativar contato: ${deleteData.message}`, 'red')
    }

    // 6. VERIFICAR SE FOI DESATIVADO
    log('\n6️⃣  Verificando se contato foi desativado...', 'blue')
    const verifyResponse = await fetch(`${BASE_URL}/api/contatos/${idContato}`)
    const verifyData = await verifyResponse.json()
    
    if (verifyResponse.status === 200) {
      if (verifyData.contato.ativo === false) {
        log('✅ Contato está desativado (ativo: false)!', 'green')
      } else {
        log('⚠️  Contato ainda está ativo!', 'yellow')
      }
      console.log(JSON.stringify(verifyData, null, 2))
    }

    // 7. HARD DELETE
    log('\n7️⃣  Testando DELETE /api/contatos/[id]?hard=true (hard delete)...', 'blue')
    const hardDeleteResponse = await fetch(`${BASE_URL}/api/contatos/${idContato}?hard=true`, {
      method: 'DELETE'
    })

    const hardDeleteData = await hardDeleteResponse.json()
    
    if (hardDeleteResponse.status === 200) {
      log('✅ Contato removido permanentemente!', 'green')
      console.log(JSON.stringify(hardDeleteData, null, 2))
    } else {
      log(`❌ Erro ao remover contato: ${hardDeleteData.message}`, 'red')
    }

    // 8. VERIFICAR SE FOI REMOVIDO
    log('\n8️⃣  Verificando se contato foi removido...', 'blue')
    const finalVerifyResponse = await fetch(`${BASE_URL}/api/contatos/${idContato}`)
    const finalVerifyData = await finalVerifyResponse.json()
    
    if (finalVerifyResponse.status === 404) {
      log('✅ Contato não existe mais (404)!', 'green')
    } else {
      log('⚠️  Contato ainda existe!', 'yellow')
    }
    console.log(JSON.stringify(finalVerifyData, null, 2))

    log('\n=== ✅ TODOS OS TESTES CONCLUÍDOS ===\n', 'cyan')

  } catch (error) {
    log(`\n❌ ERRO GERAL: ${error.message}\n`, 'red')
    console.error(error)
  }
}

// Executar testes
log('Aguarde...', 'yellow')
testarAPI()

