const { executeQuery } = require('../lib/database.ts');

async function testMultiUnitVendedores() {
  try {
    console.log('🔍 Testando vendedores em múltiplas unidades...');
    
    // Verificar vendedores que estão em múltiplas unidades
    const vendedoresMultiUnidades = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.username,
        COUNT(vu.unidade_id) as total_unidades,
        GROUP_CONCAT(u.nome ORDER BY u.nome SEPARATOR ', ') as unidades
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      JOIN unidades u ON vu.unidade_id = u.id
      GROUP BY v.id, v.name, v.lastName, v.username
      HAVING COUNT(vu.unidade_id) > 1
      ORDER BY v.name
    `);
    
    console.log('👥 Vendedores em múltiplas unidades:', vendedoresMultiUnidades);
    
    // Testar a query atual da API (sem DISTINCT)
    const vendedoresAPI = await executeQuery(`
      SELECT v.id, v.name, v.lastName, v.username, vu.unidade_id, u.nome as unidade_nome
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      JOIN unidades u ON vu.unidade_id = u.id
      ORDER BY v.name, v.lastName, u.nome
    `);
    
    console.log('\n📊 Query da API (sem DISTINCT):');
    console.log(`Total de registros: ${vendedoresAPI.length}`);
    
    // Agrupar por vendedor para verificar duplicatas
    const agrupados = vendedoresAPI.reduce((acc, vendedor) => {
      const key = `${vendedor.name} ${vendedor.lastName}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(vendedor);
      return acc;
    }, {});
    
    console.log('\n👤 Vendedores na matriz:');
    Object.entries(agrupados).forEach(([nome, registros]) => {
      if (registros.length > 1) {
        console.log(`✅ ${nome}: ${registros.length} registros (${registros.map(r => r.unidade_nome).join(', ')})`);
      } else {
        console.log(`📝 ${nome}: 1 registro (${registros[0].unidade_nome})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testMultiUnitVendedores();

