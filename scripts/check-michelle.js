const { executeQuery } = require('../lib/database.ts');

async function checkMichelle() {
  try {
    console.log('🔍 Verificando Michelle CE e RN...');
    
    // Buscar Michelle especificamente
    const michelle = await executeQuery(`
      SELECT * FROM vendedores WHERE name = 'Michelle' OR username LIKE '%michele%'
    `);
    
    console.log('👤 Dados da Michelle:', michelle);
    
    // Verificar em quais unidades ela está
    const unidadesMichelle = await executeQuery(`
      SELECT 
        v.id as vendedor_id,
        v.name,
        v.lastName,
        v.username,
        vu.unidade_id,
        u.nome as unidade_nome
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      JOIN unidades u ON vu.unidade_id = u.id
      WHERE v.name = 'Michelle' OR v.username LIKE '%michele%'
      ORDER BY u.nome
    `);
    
    console.log('🏢 Unidades da Michelle:', unidadesMichelle);
    
    // Verificar se há unidade RN (Rio Grande do Norte)
    const unidadesRN = await executeQuery(`
      SELECT * FROM unidades WHERE nome LIKE '%RN%' OR nome LIKE '%Rio Grande%' OR nome LIKE '%Norte%'
    `);
    
    console.log('🌎 Unidades RN encontradas:', unidadesRN);
    
    // Listar todas as unidades disponíveis
    const todasUnidades = await executeQuery(`
      SELECT * FROM unidades ORDER BY nome
    `);
    
    console.log('📋 Todas as unidades disponíveis:', todasUnidades);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkMichelle();

