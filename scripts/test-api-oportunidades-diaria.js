#!/usr/bin/env node

/**
 * Testar a API /api/oportunidades/diaria com os mesmos parâmetros do componente
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

async function testAPI() {
  const unidadeId = 92 // CE OUTDOOR
  const dataInicio = '2025-11-01'
  const dataFim = '2025-11-27'
  const tipo = 'criadas'

  const url = `http://localhost:3000/api/oportunidades/diaria?tipo=${tipo}&data_inicio=${dataInicio}&data_fim=${dataFim}&unidade_id=${unidadeId}&all=1`

  console.log('\n🧪 TESTANDO API /api/oportunidades/diaria\n')
  console.log('URL:', url)
  console.log('='.repeat(80))

  try {
    const response = await fetch(url)
    const data = await response.json()

    console.log('\n✅ Resposta da API:')
    console.log('Status:', response.status)
    console.log('Success:', data.success)
    
    if (data.success) {
      console.log('\n📊 Dados Gerais (por dia):')
      console.log(`Total de dias com dados: ${data.dados?.length || 0}`)
      
      if (data.dados) {
        // Mostrar últimos 10 dias
        const ultimos10 = data.dados.slice(-10)
        ultimos10.forEach(d => {
          console.log(`  ${d.data}: ${d.total} oportunidades`)
        })
      }

      console.log('\n👥 Dados Por Vendedor:')
      console.log(`Total de registros: ${data.dados_por_vendedor?.length || 0}`)
      
      if (data.dados_por_vendedor) {
        // Filtrar apenas dia 27/11
        const dia27 = data.dados_por_vendedor.filter(d => d.data === '2025-11-27')
        
        console.log(`\n🎯 Dia 27/11/2025:`)
        if (dia27.length > 0) {
          console.log(`  ✅ ENCONTRADO! ${dia27.length} vendedores com dados`)
          dia27.forEach(v => {
            console.log(`    - ${v.vendedor_nome} (ID: ${v.vendedor_id}): ${v.total} oportunidades`)
          })
        } else {
          console.log(`  ❌ NENHUM dado encontrado para 27/11!`)
          
          // Mostrar as últimas datas disponíveis
          console.log('\n  📅 Últimas datas disponíveis:')
          const datasUnicas = [...new Set(data.dados_por_vendedor.map(d => d.data))].sort().slice(-5)
          datasUnicas.forEach(data => {
            const total = data.dados_por_vendedor.filter(d => d.data === data).reduce((sum, d) => sum + d.total, 0)
            console.log(`    ${data}: ${total} oportunidades`)
          })
        }
      }

      console.log('\n📋 Período Retornado:')
      console.log('  Início:', data.periodo?.data_inicio)
      console.log('  Fim:', data.periodo?.data_fim)
      if (data.periodo?.data_corrigida) {
        console.log('  ⚠️  Datas foram corrigidas pela API!')
      }

    } else {
      console.log('\n❌ Erro na API:')
      console.log('Message:', data.message)
      console.log('Error:', data.error)
    }

  } catch (error) {
    console.error('\n❌ Erro ao chamar API:', error.message)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ Teste concluído!\n')
}

testAPI()

















