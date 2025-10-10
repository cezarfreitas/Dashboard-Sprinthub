const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testMultiUnidade() {
  console.log('🧪 Testando funcionalidade de vendedores em múltiplas unidades...\n');

  try {
    // 1. Listar unidades existentes
    console.log('1️⃣ Buscando unidades existentes...');
    const unidadesResponse = await fetch(`${BASE_URL}/api/unidades`);
    const unidadesData = await unidadesResponse.json();
    
    if (!unidadesData.success) {
      throw new Error('Erro ao buscar unidades: ' + unidadesData.message);
    }
    
    console.log(`✅ Encontradas ${unidadesData.unidades.length} unidades:`);
    unidadesData.unidades.forEach(u => {
      console.log(`   - ${u.nome} (ID: ${u.id}) - ${u.vendedores.length} vendedores`);
    });

    // 2. Buscar vendedores disponíveis
    console.log('\n2️⃣ Buscando vendedores disponíveis...');
    const vendedoresResponse = await fetch(`${BASE_URL}/api/unidades/vendedores`);
    const vendedoresData = await vendedoresResponse.json();
    
    if (!vendedoresData.success) {
      throw new Error('Erro ao buscar vendedores: ' + vendedoresData.message);
    }
    
    console.log(`✅ Encontrados ${vendedoresData.vendedores_disponiveis.length} vendedores disponíveis`);

    if (unidadesData.unidades.length >= 2 && vendedoresData.vendedores_disponiveis.length >= 1) {
      const unidade1 = unidadesData.unidades[0];
      const unidade2 = unidadesData.unidades[1];
      const vendedor = vendedoresData.vendedores_disponiveis[0];

      console.log(`\n3️⃣ Testando adicionar vendedor ${vendedor.name} ${vendedor.lastName} à unidade ${unidade1.nome}...`);
      
      // Adicionar vendedor à primeira unidade
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
        throw new Error('Erro ao adicionar vendedor à primeira unidade: ' + addData1.message);
      }
      console.log(`✅ ${addData1.message}`);

      console.log(`\n4️⃣ Testando adicionar o mesmo vendedor à unidade ${unidade2.nome}...`);
      
      // Adicionar o mesmo vendedor à segunda unidade
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
      } else {
        console.log(`✅ ${addData2.message}`);
      }

      // 5. Verificar unidades do vendedor
      console.log(`\n5️⃣ Verificando unidades do vendedor ${vendedor.name}...`);
      const vendedorUnidadesResponse = await fetch(`${BASE_URL}/api/vendedores/unidades?vendedor_id=${vendedor.id}`);
      const vendedorUnidadesData = await vendedorUnidadesResponse.json();
      
      if (vendedorUnidadesData.success) {
        console.log(`✅ Vendedor está em ${vendedorUnidadesData.total_unidades} unidades:`);
        vendedorUnidadesData.unidades.forEach(u => {
          console.log(`   - ${u.nome}`);
        });
      }

      // 6. Remover vendedor de uma unidade específica
      console.log(`\n6️⃣ Removendo vendedor da unidade ${unidade1.nome}...`);
      const removeResponse = await fetch(`${BASE_URL}/api/unidades/vendedores?vendedor_id=${vendedor.id}&unidade_id=${unidade1.id}`, {
        method: 'DELETE'
      });
      
      const removeData = await removeResponse.json();
      if (!removeData.success) {
        throw new Error('Erro ao remover vendedor: ' + removeData.message);
      }
      console.log(`✅ ${removeData.message}`);

      // 7. Verificar se ainda está na outra unidade
      console.log(`\n7️⃣ Verificando se vendedor ainda está na unidade ${unidade2.nome}...`);
      const finalCheckResponse = await fetch(`${BASE_URL}/api/vendedores/unidades?vendedor_id=${vendedor.id}`);
      const finalCheckData = await finalCheckResponse.json();
      
      if (finalCheckData.success) {
        console.log(`✅ Vendedor ainda está em ${finalCheckData.total_unidades} unidades:`);
        finalCheckData.unidades.forEach(u => {
          console.log(`   - ${u.nome}`);
        });
      }

      console.log('\n🎉 Teste concluído com sucesso! Funcionalidade de múltiplas unidades está funcionando.');
      
    } else {
      console.log('⚠️ Não há unidades suficientes ou vendedores disponíveis para o teste');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testMultiUnidade();
