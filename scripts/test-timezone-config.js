/**
 * Script para testar se as configurações de timezone estão corretas
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

console.log('\n🌍 Teste de Configuração de Timezone GMT-3\n')
console.log('=' .repeat(60))

// 1. Verificar variáveis de ambiente
console.log('\n📋 Variáveis de Ambiente:')
console.log('  NEXT_PUBLIC_TIMEZONE:', process.env.NEXT_PUBLIC_TIMEZONE || '❌ NÃO DEFINIDA')
console.log('  TZ:', process.env.TZ || '❌ NÃO DEFINIDA')

// 2. Verificar timezone do Node.js
console.log('\n🕐 Timezone do Node.js:')
const now = new Date()
console.log('  Date.toString():', now.toString())
console.log('  Timezone offset (minutos):', now.getTimezoneOffset())
console.log('  Timezone esperado GMT-3: offset = 180 minutos')

// 3. Testar conversão de data
console.log('\n🔄 Teste de Conversão:')
const testDate = new Date('2024-12-08T02:30:00Z') // UTC
console.log('  Data UTC:', testDate.toISOString())
console.log('  Data toString():', testDate.toString())
console.log('  Data pt-BR:', testDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))

// 4. Verificar se está aplicando GMT-3
const expectedGMT3 = new Date('2024-12-07T23:30:00-03:00')
const saoPauloString = testDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
const saoPauloDate = new Date(saoPauloString)

console.log('\n✅ Resultado da Conversão:')
console.log('  Esperado (GMT-3): 2024-12-07 23:30:00')
console.log('  Obtido:', saoPauloString)

// 5. Testar dia atual
console.log('\n📅 Data Atual:')
const hoje = new Date()
const hojeSP = hoje.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
const hojeUTC = hoje.toISOString()

console.log('  UTC:', hojeUTC)
console.log('  São Paulo (GMT-3):', hojeSP)

// Extrair dia de ambos
const diaUTC = new Date(hojeUTC).getUTCDate()
const diaSP = parseInt(hojeSP.split('/')[0])

console.log('  Dia UTC:', diaUTC)
console.log('  Dia SP:', diaSP)

if (diaUTC !== diaSP && Math.abs(diaUTC - diaSP) === 1) {
  console.log('  ⚠️  DIFERENÇA DETECTADA! (Problema de timezone)')
} else {
  console.log('  ✅ Datas consistentes')
}

// 6. Recomendações
console.log('\n💡 Recomendações:')
if (!process.env.NEXT_PUBLIC_TIMEZONE) {
  console.log('  ❌ Adicione ao .env.local: NEXT_PUBLIC_TIMEZONE=America/Sao_Paulo')
}
if (!process.env.TZ) {
  console.log('  ❌ Adicione ao .env.local: TZ=America/Sao_Paulo')
}
if (process.env.NEXT_PUBLIC_TIMEZONE && process.env.TZ) {
  console.log('  ✅ Variáveis de ambiente configuradas corretamente!')
}

console.log('\n' + '='.repeat(60))
console.log('✅ Teste concluído!\n')

// 7. Teste de query MySQL simulada
console.log('📊 Query MySQL Sugerida para Teste:')
console.log(`
  -- Teste a conversão no MySQL:
  SELECT 
    NOW() as utc_now,
    CONVERT_TZ(NOW(), '+00:00', '-03:00') as sp_now,
    DATE(NOW()) as utc_date,
    DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00')) as sp_date,
    HOUR(NOW()) as utc_hour,
    HOUR(CONVERT_TZ(NOW(), '+00:00', '-03:00')) as sp_hour;
`)

