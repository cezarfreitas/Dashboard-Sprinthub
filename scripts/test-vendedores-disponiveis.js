// Teste simples para verificar vendedores disponíveis
const BASE_URL = 'http://localhost:3002';

async function testVendedoresDisponiveis() {
  console.log('🧪 Testando listagem de vendedores disponíveis...\n');

  try {
    // 1. Buscar todas as unidades
    console.log('1️⃣ Buscando unidades...');
    const unidadesResponse = await fetch(`${BASE_URL}/api/unidades`);
    const unidadesData = await unidadesResponse.json();
    
    if (!unidadesData.success) {
      throw new Error('Erro ao buscar unidades: ' + unidadesData.message);
    }
    
    console.log(`✅ Encontradas ${unidadesData.unidades.length} unidades`);

    if (unidadesData.unidades.length > 0) {
      const unidade = unidadesData.unidades[0];
      console.log(`\n2️⃣ Testando com unidade: ${unidade.nome} (ID: ${unidade.id})`);
      
      // 2. Buscar vendedores disponíveis para esta unidade
      console.log('   Buscando vendedores disponíveis...');
      const vendedoresResponse = await fetch(`${BASE_URL}/api/unidades/vendedores?unidade_id=${unidade.id}`);
      const vendedoresData = await vendedoresResponse.json();
      
      if (!vendedoresData.success) {
        throw new Error('Erro ao buscar vendedores: ' + vendedoresData.message);
      }
      
      console.log(`   ✅ Vendedores na unidade: ${vendedoresData.vendedores_da_unidade.length}`);
      console.log(`   ✅ Vendedores disponíveis: ${vendedoresData.vendedores_disponiveis.length}`);
      
      if (vendedoresData.vendedores_disponiveis.length > 0) {
        console.log('\n   📋 Vendedores disponíveis:');
        vendedoresData.vendedores_disponiveis.slice(0, 3).forEach(v => {
          console.log(`      - ${v.name} ${v.lastName} (${v.email})`);
        });
        if (vendedoresData.vendedores_disponiveis.length > 3) {
          console.log(`      ... e mais ${vendedoresData.vendedores_disponiveis.length - 3} vendedores`);
        }
      } else {
        console.log('   ⚠️ Nenhum vendedor disponível encontrado');
      }
    }

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Usar fetch nativo do Node.js 18+ ou importar fetch
if (typeof fetch === 'undefined') {
  console.log('⚠️ Fetch não disponível. Execute este teste no navegador ou atualize o Node.js');
} else {
  testVendedoresDisponiveis();
}
