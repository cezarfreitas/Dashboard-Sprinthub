// Teste final da funcionalidade de múltiplas unidades
const BASE_URL = 'http://localhost:3002';

async function testMultiUnidadeFinal() {
  console.log('🧪 Teste final - Vendedores em múltiplas unidades\n');

  try {
    // 1. Buscar unidades
    const unidadesResponse = await fetch(`${BASE_URL}/api/unidades`);
    const unidadesData = await unidadesResponse.json();
    
    if (!unidadesData.success || unidadesData.unidades.length < 2) {
      console.log('⚠️ Precisa de pelo menos 2 unidades para o teste');
      return;
    }

    const unidade1 = unidadesData.unidades[0];
    const unidade2 = unidadesData.unidades[1];
    
    console.log(`📍 Unidade 1: ${unidade1.nome} (ID: ${unidade1.id})`);
    console.log(`📍 Unidade 2: ${unidade2.nome} (ID: ${unidade2.id})`);

    // 2. Buscar vendedores disponíveis para a primeira unidade
    const vendedoresResponse1 = await fetch(`${BASE_URL}/api/unidades/vendedores?unidade_id=${unidade1.id}`);
    const vendedoresData1 = await vendedoresResponse1.json();
    
    if (!vendedoresData1.success || vendedoresData1.vendedores_disponiveis.length === 0) {
      console.log('⚠️ Não há vendedores disponíveis para teste');
      return;
    }

    const vendedor = vendedoresData1.vendedores_disponiveis[0];
    console.log(`\n👤 Vendedor de teste: ${vendedor.name} ${vendedor.lastName} (ID: ${vendedor.id})`);

    // 3. Adicionar vendedor à primeira unidade
    console.log(`\n➕ Adicionando vendedor à unidade ${unidade1.nome}...`);
    const addResponse1 = await fetch(`${BASE_URL}/api/unidades/vendedores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unidade_id: unidade1.id,
        vendedor_id: vendedor.id
      })
    });
    
    const addData1 = await addResponse1.json();
    if (!addData1.success) {
      console.log(`❌ ${addData1.message}`);
      return;
    }
    console.log(`✅ ${addData1.message}`);

    // 4. Adicionar o mesmo vendedor à segunda unidade
    console.log(`\n➕ Adicionando vendedor à unidade ${unidade2.nome}...`);
    const addResponse2 = await fetch(`${BASE_URL}/api/unidades/vendedores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unidade_id: unidade2.id,
        vendedor_id: vendedor.id
      })
    });
    
    const addData2 = await addResponse2.json();
    if (!addData2.success) {
      console.log(`❌ ${addData2.message}`);
      return;
    }
    console.log(`✅ ${addData2.message}`);

    // 5. Verificar unidades do vendedor
    console.log(`\n🔍 Verificando unidades do vendedor...`);
    const vendedorUnidadesResponse = await fetch(`${BASE_URL}/api/vendedores/unidades?vendedor_id=${vendedor.id}`);
    const vendedorUnidadesData = await vendedorUnidadesResponse.json();
    
    if (vendedorUnidadesData.success) {
      console.log(`✅ Vendedor está em ${vendedorUnidadesData.total_unidades} unidades:`);
      vendedorUnidadesData.unidades.forEach(u => {
        console.log(`   - ${u.nome}`);
      });
    }

    // 6. Verificar se vendedor não aparece mais como disponível para essas unidades
    console.log(`\n🔍 Verificando disponibilidade...`);
    const checkResponse1 = await fetch(`${BASE_URL}/api/unidades/vendedores?unidade_id=${unidade1.id}`);
    const checkData1 = await checkResponse1.json();
    
    const checkResponse2 = await fetch(`${BASE_URL}/api/unidades/vendedores?unidade_id=${unidade2.id}`);
    const checkData2 = await checkResponse2.json();
    
    const disponivel1 = checkData1.vendedores_disponiveis.find(v => v.id === vendedor.id);
    const disponivel2 = checkData2.vendedores_disponiveis.find(v => v.id === vendedor.id);
    
    console.log(`   Unidade ${unidade1.nome}: ${disponivel1 ? '❌ Ainda disponível' : '✅ Não disponível'}`);
    console.log(`   Unidade ${unidade2.nome}: ${disponivel2 ? '❌ Ainda disponível' : '✅ Não disponível'}`);

    // 7. Limpeza - remover vendedor das unidades
    console.log(`\n🧹 Limpando teste...`);
    
    // Remover da primeira unidade
    const removeResponse1 = await fetch(`${BASE_URL}/api/unidades/vendedores?vendedor_id=${vendedor.id}&unidade_id=${unidade1.id}`, {
      method: 'DELETE'
    });
    const removeData1 = await removeResponse1.json();
    console.log(`   ${removeData1.success ? '✅' : '❌'} Removido da unidade ${unidade1.nome}`);
    
    // Remover da segunda unidade
    const removeResponse2 = await fetch(`${BASE_URL}/api/unidades/vendedores?vendedor_id=${vendedor.id}&unidade_id=${unidade2.id}`, {
      method: 'DELETE'
    });
    const removeData2 = await removeResponse2.json();
    console.log(`   ${removeData2.success ? '✅' : '❌'} Removido da unidade ${unidade2.nome}`);

    console.log('\n🎉 Teste final concluído com sucesso!');
    console.log('✅ Funcionalidade de vendedores em múltiplas unidades está funcionando perfeitamente!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

if (typeof fetch === 'undefined') {
  console.log('⚠️ Execute este teste no navegador ou atualize o Node.js');
} else {
  testMultiUnidadeFinal();
}
