const http = require('http')

async function testAPI(url, description) {
  return new Promise((resolve) => {
    const urlObj = new URL(url)
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 5000
    }

    console.log(`🧪 Testando: ${description}`)
    console.log(`   URL: ${url}`)

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          console.log(`   ✅ Status: ${res.statusCode}`)
          console.log(`   ✅ Resposta:`, json.success ? 'success: true' : json)
        } catch (e) {
          console.log(`   ✅ Status: ${res.statusCode}`)
          console.log(`   ⚠️ Resposta não é JSON:`, data.substring(0, 100))
        }
        console.log()
        resolve(true)
      })
    })

    req.on('error', (error) => {
      console.log(`   ❌ ERRO: ${error.message}`)
      console.log()
      resolve(false)
    })

    req.on('timeout', () => {
      console.log(`   ❌ TIMEOUT: A requisição demorou mais de 5 segundos`)
      console.log()
      req.destroy()
      resolve(false)
    })

    req.end()
  })
}

async function runTests() {
  console.log('🔍 Testando APIs do sistema...\n')

  const baseUrl = 'http://localhost:3000'

  const tests = [
    { url: `${baseUrl}/api/health`, description: 'Health Check' },
    { url: `${baseUrl}/api/status`, description: 'Status da API' },
    { url: `${baseUrl}/api/vendedores`, description: 'Lista de Vendedores' },
    { url: `${baseUrl}/api/unidades`, description: 'Lista de Unidades' },
    { url: `${baseUrl}/api/funil/colunas?funil_id=4`, description: 'Colunas do Funil' },
    { url: `${baseUrl}/api/oportunidades/stats`, description: 'Stats de Oportunidades' },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    const result = await testAPI(test.url, test.description)
    if (result) {
      passed++
    } else {
      failed++
    }
  }

  console.log('📊 Resumo dos Testes:')
  console.log(`   ✅ Passou: ${passed}`)
  console.log(`   ❌ Falhou: ${failed}`)
  console.log()

  if (failed === tests.length) {
    console.log('❌ NENHUMA API RESPONDEU!')
    console.log('💡 Possíveis causas:')
    console.log('   1. Servidor Next.js não está rodando (npm run dev)')
    console.log('   2. Porta 3000 está bloqueada ou em uso')
    console.log('   3. Firewall bloqueando localhost')
  } else if (failed > 0) {
    console.log('⚠️ Algumas APIs falharam. Verifique os logs acima.')
  } else {
    console.log('🎉 Todas as APIs estão funcionando!')
  }
}

runTests()

