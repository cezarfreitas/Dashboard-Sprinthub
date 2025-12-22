/**
 * Script de Depuração: Valores de Ganhos no Dashboard do Consultor
 * 
 * Execute este script para verificar se os valores de ganhos estão sendo
 * retornados corretamente pela API /api/oportunidades/stats
 * 
 * Uso:
 * node scripts/debug-ganhos-consultor.js
 */

const BASE_URL = 'http://localhost:3000'

// Configuração do vendedor e período para teste
const VENDEDOR_ID = 1 // Altere para o ID do vendedor que você está testando
const DATA_INICIO = '2024-11-01' // Altere para a data de início do período (mês passado, por exemplo)
const DATA_FIM = '2024-11-30' // Altere para a data de fim do período

async function debugGanhosConsultor() {
  console.log('\n🔍 INICIANDO DEPURAÇÃO DE GANHOS DO CONSULTOR\n')
  console.log('Configuração:')
  console.log(`  Vendedor ID: ${VENDEDOR_ID}`)
  console.log(`  Período: ${DATA_INICIO} até ${DATA_FIM}\n`)

  try {
    // Construir URL da API
    const params = new URLSearchParams()
    params.append('user_id', VENDEDOR_ID.toString())
    params.append('status', 'won')
    params.append('gain_date_start', DATA_INICIO)
    params.append('gain_date_end', DATA_FIM)
    params.append('all', '1')

    const url = `${BASE_URL}/api/oportunidades/stats?${params.toString()}`
    
    console.log('📡 Fazendo requisição para:')
    console.log(`  ${url}\n`)

    const response = await fetch(url)
    const data = await response.json()

    if (!data.success) {
      console.error('❌ API retornou erro:', data.message || 'Erro desconhecido')
      console.error('   Detalhes:', data)
      return
    }

    console.log('✅ API retornou sucesso\n')
    console.log('📊 DADOS RETORNADOS:\n')
    console.log('   Campos principais (valores que o hook busca):')
    console.log(`     - valor_ganhas_periodo: ${data.data?.valor_ganhas_periodo || 'undefined'}`)
    console.log(`     - valor_ganhas: ${data.data?.valor_ganhas || 'undefined'}`)
    console.log(`     - total_ganhas_periodo: ${data.data?.total_ganhas_periodo || 'undefined'}`)
    console.log(`     - total_ganhas: ${data.data?.total_ganhas || 'undefined'}`)
    console.log(`     - valor_ganhas_dentro_createDate: ${data.data?.valor_ganhas_dentro_createDate || 'undefined'}`)
    console.log(`     - valor_ganhas_fora_createDate: ${data.data?.valor_ganhas_fora_createDate || 'undefined'}`)
    console.log(`     - total_ganhas_dentro_createDate: ${data.data?.total_ganhas_dentro_createDate || 'undefined'}`)
    console.log(`     - total_ganhas_fora_createDate: ${data.data?.total_ganhas_fora_createDate || 'undefined'}`)

    console.log('\n   Resumos adicionais:')
    if (data.data?.resumo_periodo) {
      console.log('     resumo_periodo:')
      console.log(`       - total_oportunidades: ${data.data.resumo_periodo.total_oportunidades}`)
      console.log(`       - valor_total: ${data.data.resumo_periodo.valor_total}`)
      console.log(`       - media_valor: ${data.data.resumo_periodo.media_valor}`)
    }
    if (data.data?.resumo_dentro_createDate) {
      console.log('     resumo_dentro_createDate:')
      console.log(`       - total_oportunidades: ${data.data.resumo_dentro_createDate.total_oportunidades}`)
      console.log(`       - valor_total: ${data.data.resumo_dentro_createDate.valor_total}`)
    }
    if (data.data?.resumo_fora_createDate) {
      console.log('     resumo_fora_createDate:')
      console.log(`       - total_oportunidades: ${data.data.resumo_fora_createDate.total_oportunidades}`)
      console.log(`       - valor_total: ${data.data.resumo_fora_createDate.valor_total}`)
    }

    console.log('\n\n🎯 ANÁLISE:\n')
    
    const valorUsado = data.data?.valor_ganhas_periodo || data.data?.valor_ganhas || 0
    const totalUsado = data.data?.total_ganhas_periodo || data.data?.total_ganhas || 0

    console.log(`   O hook useConsultorDashboard vai usar:`)
    console.log(`     - ganhosValorTotal: R$ ${valorUsado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`     - ganhosTotalOportunidades: ${totalUsado} oportunidades`)

    if (data.data?.valor_ganhas_periodo) {
      console.log('\n   ✅ Campo valor_ganhas_periodo está presente (CORRETO)')
    } else if (data.data?.valor_ganhas) {
      console.log('\n   ⚠️  Campo valor_ganhas_periodo NÃO está presente!')
      console.log('       Usando fallback valor_ganhas')
      console.log('       POSSÍVEL PROBLEMA: API não está retornando campo período corretamente')
    } else {
      console.log('\n   ❌ ERRO: Nenhum campo de valor está presente!')
    }

    console.log('\n📋 Resposta completa da API:')
    console.log(JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('❌ Erro ao fazer requisição:', error.message)
    console.error('   Certifique-se de que o servidor está rodando em', BASE_URL)
  }
}

// Executar depuração
debugGanhosConsultor()









