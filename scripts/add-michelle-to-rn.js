const { executeQuery } = require('../lib/database.ts');

async function addMichelleToRN() {
  try {
    console.log('🔍 Adicionando Michelle ao Rio Grande do Norte...');
    
    // Verificar se já existe a relação
    const existingRelation = await executeQuery(`
      SELECT * FROM vendedores_unidades 
      WHERE vendedor_id = 250 AND unidade_id = 6
    `);
    
    if (existingRelation.length > 0) {
      console.log('✅ Michelle já está no Rio Grande do Norte');
      return;
    }
    
    // Adicionar Michelle ao Rio Grande do Norte
    const result = await executeQuery(`
      INSERT INTO vendedores_unidades (vendedor_id, unidade_id) 
      VALUES (250, 6)
    `);
    
    console.log('✅ Michelle adicionada ao Rio Grande do Norte:', result);
    
    // Verificar a nova situação
    const michelleUnidades = await executeQuery(`
      SELECT 
        v.name,
        v.lastName,
        vu.unidade_id,
        u.nome as unidade_nome
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      JOIN unidades u ON vu.unidade_id = u.id
      WHERE v.id = 250
      ORDER BY u.nome
    `);
    
    console.log('🏢 Michelle agora está em:', michelleUnidades);
    
    // Testar a query da API
    const vendedoresAPI = await executeQuery(`
      SELECT v.id, v.name, v.lastName, v.username, vu.unidade_id, u.nome as unidade_nome
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      JOIN unidades u ON vu.unidade_id = u.id
      WHERE v.id = 250
      ORDER BY v.name, v.lastName, u.nome
    `);
    
    console.log('📊 Michelle na API:', vendedoresAPI);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

addMichelleToRN();

