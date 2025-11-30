/**
 * Teste Rápido - Inserir Contato via API
 * 
 * Execute: node scripts/test-insert-contato.js
 */

const BASE_URL = 'http://localhost:3000'

async function testarInsercao() {
  console.log('\n🧪 Testando inserção de contato...\n')

  const contato = {
    id_contato: '65853',
    wpp_filial: '5527981920127',
    wpp_contato: '5511989882867',
    vendedor: 'Gilmar ES OUTDOOR',
    vendedor_id: '228',
    nome: 'cezar freitas',
    observacoes: 'Teste de inserção'
  }

  console.log('📤 Enviando:', contato)
  console.log()

  try {
    const response = await fetch(`${BASE_URL}/api/contatos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contato)
    })

    console.log(`📡 Status: ${response.status} ${response.statusText}`)
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('\n✅ SUCESSO! Contato inserido:\n')
      console.log(JSON.stringify(data, null, 2))
      
      console.log('\n🔍 Verifique no phpMyAdmin: SELECT * FROM contatos_whatsapp;\n')
    } else {
      console.log('\n❌ ERRO:\n')
      console.log(JSON.stringify(data, null, 2))
      
      if (data.message?.includes('Vendedor')) {
        console.log('\n⚠️  DICA: Verifique se o vendedor ID 228 existe:')
        console.log('   SELECT * FROM vendedores WHERE id = 228;\n')
      }
    }
  } catch (error) {
    console.log('\n❌ ERRO DE CONEXÃO:')
    console.error(error.message)
    console.log('\n⚠️  Certifique-se que o servidor está rodando: npm run dev\n')
  }
}

testarInsercao()

