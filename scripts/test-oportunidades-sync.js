/**
 * Script de teste para sincronização de oportunidades
 * Executa a função syncOportunidades e exibe os resultados
 */

require('dotenv').config({ path: '.env.local' })

async function testSync() {
  console.log('🧪 Iniciando teste de sincronização de oportunidades...\n')
  
  try {
    // Importar a função de sincronização
    const { syncOportunidades } = require('../lib/oportunidades-sync')
    
    console.log('📋 Configurações:')
    console.log(`   - APITOKEN: ${process.env.APITOKEN ? '✅ Configurado' : '❌ Não configurado'}`)
    console.log(`   - I (Group ID): ${process.env.I ? '✅ Configurado' : '❌ Não configurado'}`)
    console.log(`   - URLPATCH: ${process.env.URLPATCH ? '✅ Configurado' : '❌ Não configurado'}`)
    console.log('')
    
    if (!process.env.APITOKEN || !process.env.I || !process.env.URLPATCH) {
      console.error('❌ Variáveis de ambiente não configuradas!')
      console.error('   Configure APITOKEN, I e URLPATCH no arquivo .env.local')
      process.exit(1)
    }
    
    console.log('🔄 Executando sincronização...\n')
    const startTime = Date.now()
    
    const result = await syncOportunidades()
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESULTADO DO TESTE')
    console.log('='.repeat(60))
    console.log(`✅ Sucesso: ${result.success ? 'SIM' : 'NÃO'}`)
    console.log(`📝 Mensagem: ${result.message}`)
    console.log(`⏱️  Duração: ${duration}s`)
    
    if (result.stats) {
      console.log('\n📈 Estatísticas:')
      console.log(`   - Funis processados: ${result.stats.totalFunis}`)
      console.log(`   - Colunas processadas: ${result.stats.totalColunas}`)
      console.log(`   - Total de oportunidades: ${result.stats.totalOportunidades}`)
      console.log(`   - Novas oportunidades: ${result.stats.novos}`)
      console.log(`   - Oportunidades atualizadas: ${result.stats.atualizados}`)
      console.log(`   - Erros: ${result.stats.erros}`)
    }
    
    console.log('='.repeat(60))
    
    if (result.success) {
      console.log('✅ Teste concluído com sucesso!')
      process.exit(0)
    } else {
      console.log('❌ Teste falhou!')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao executar teste:', error)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
}

// Executar teste
testSync()

