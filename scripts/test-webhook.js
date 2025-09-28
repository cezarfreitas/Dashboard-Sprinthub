// Script para testar o webhook de notificações
// Execute com: node scripts/test-webhook.js

const vendedores = [
  'João Silva',
  'Maria Santos', 
  'Pedro Oliveira',
  'Ana Costa',
  'Carlos Mendes',
  'Lucia Ferreira',
  'Roberto Lima',
  'Fernanda Souza'
]

const clientes = [
  'Empresa ABC',
  'Loja XYZ', 
  'Corporação 123',
  'Negócios Plus',
  'Indústria Nova',
  'Comercial Ltda',
  'Serviços SA',
  'Tecnologia Inc'
]

const produtos = [
  'Plano Premium',
  'Pacote Completo',
  'Serviço Especial',
  'Solução Avançada',
  'Consultoria Plus',
  'Sistema Integrado',
  'Suporte Técnico',
  'Licença Enterprise'
]

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomValue() {
  return Math.floor(Math.random() * 80000) + 10000 // Entre R$ 10.000 e R$ 90.000
}

async function enviarVenda() {
  const venda = {
    vendedor: getRandomItem(vendedores),
    valor: getRandomValue(),
    cliente: getRandomItem(clientes),
    produto: getRandomItem(produtos)
  }

  try {
    console.log('🚀 Enviando venda:', venda)
    
    const response = await fetch('http://localhost:3000/api/chamada', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(venda)
    })

    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Venda enviada com sucesso!')
      console.log('📊 Valor:', `R$ ${venda.valor.toLocaleString('pt-BR')}`)
      console.log('👤 Vendedor:', venda.vendedor)
      console.log('🏢 Cliente:', venda.cliente)
      console.log('📦 Produto:', venda.produto)
    } else {
      console.log('❌ Erro:', result.message)
    }
  } catch (error) {
    console.error('💥 Erro ao enviar:', error.message)
  }
}

async function enviarVendasSequenciais() {
  console.log('🎯 Iniciando teste de vendas sequenciais...\n')
  
  for (let i = 1; i <= 3; i++) {
    console.log(`--- Venda ${i}/3 ---`)
    await enviarVenda()
    console.log('')
    
    // Aguardar 3 segundos entre vendas
    if (i < 3) {
      console.log('⏳ Aguardando 3 segundos...\n')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }
  
  console.log('🎉 Teste concluído!')
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2)

if (args.includes('--sequencial') || args.includes('-s')) {
  enviarVendasSequenciais()
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Teste de Webhook - Notificações Globais

Uso:
  node scripts/test-webhook.js          # Enviar uma venda
  node scripts/test-webhook.js -s       # Enviar 3 vendas sequenciais
  node scripts/test-webhook.js --help   # Mostrar esta ajuda

Exemplos:
  node scripts/test-webhook.js
  node scripts/test-webhook.js --sequencial
  `)
} else {
  // Enviar uma venda única
  enviarVenda()
}
