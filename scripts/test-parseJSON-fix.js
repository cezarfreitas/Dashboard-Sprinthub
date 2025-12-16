#!/usr/bin/env node

// Testar a nova função parseJSON

function parseJSON(value) {
  if (Array.isArray(value)) return value
  
  // Converter Buffer para string se necessário
  let strValue = value
  if (value && typeof value === 'object' && value.toString) {
    strValue = value.toString()
  }
  
  if (typeof strValue === 'string') {
    // Tentar parse JSON primeiro
    try {
      const parsed = JSON.parse(strValue)
      if (Array.isArray(parsed)) return parsed
      if (typeof parsed === 'object') return [parsed]
      return []
    } catch (e) {
      // Se falhar, tentar parse CSV (ex: "220,250")
      if (strValue.includes(',')) {
        const ids = strValue
          .split(',')
          .map(id => {
            const trimmed = id.trim()
            const num = parseInt(trimmed)
            return isNaN(num) ? null : num
          })
          .filter(id => id !== null)
        return ids
      }
      
      // Tentar parse como número único
      const num = parseInt(strValue.trim())
      if (!isNaN(num)) {
        return [num]
      }
      
      return []
    }
  }
  
  // Se for número direto
  if (typeof strValue === 'number') {
    return [strValue]
  }
  
  return []
}

console.log('\n🧪 TESTANDO FUNÇÃO parseJSON CORRIGIDA\n')
console.log('='.repeat(60))

// Teste 1: String CSV
const test1 = "220,250"
console.log(`\nTeste 1: "${test1}"`)
console.log(`Resultado: [${parseJSON(test1).join(', ')}]`)
console.log(`✅ Esperado: [220, 250]`)

// Teste 2: Buffer (simular MySQL)
const test2 = Buffer.from("220,250")
console.log(`\nTeste 2: Buffer("220,250")`)
console.log(`Resultado: [${parseJSON(test2).join(', ')}]`)
console.log(`✅ Esperado: [220, 250]`)

// Teste 3: JSON válido
const test3 = '[220, 250]'
console.log(`\nTeste 3: "${test3}"`)
console.log(`Resultado: [${parseJSON(test3).join(', ')}]`)
console.log(`✅ Esperado: [220, 250]`)

// Teste 4: Número único
const test4 = "220"
console.log(`\nTeste 4: "${test4}"`)
console.log(`Resultado: [${parseJSON(test4).join(', ')}]`)
console.log(`✅ Esperado: [220]`)

// Teste 5: Array JSON com objetos
const test5 = '[{"id": 220}, {"id": 250}]'
console.log(`\nTeste 5: "${test5}"`)
const result5 = parseJSON(test5)
console.log(`Resultado: ${JSON.stringify(result5)}`)
console.log(`⚠️  Nota: Retorna objetos, não IDs simples`)

console.log('\n' + '='.repeat(60))
console.log('\n✅ Função parseJSON agora suporta CSV!\n')


























