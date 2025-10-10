const mysql = require('mysql2/promise');

const connectionConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'inteli_db',
  port: 3306
};

async function fixRoletasVendedores() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    connection = await mysql.createConnection(connectionConfig);
    
    console.log('📊 Verificando roletas existentes...');
    
    // Buscar todas as roletas
    const [roletas] = await connection.execute(`
      SELECT r.id, r.unidade_id, u.nome as unidade_nome
      FROM roletas r
      JOIN unidades u ON r.unidade_id = u.id
      ORDER BY u.nome
    `);
    
    console.log(`✅ Encontradas ${roletas.length} roletas:`);
    roletas.forEach(roleta => {
      console.log(`   - ${roleta.unidade_nome} (ID: ${roleta.id})`);
    });
    
    console.log('\n🔄 Recriando filas com todos os vendedores...');
    
    for (const roleta of roletas) {
      console.log(`\n📋 Processando ${roleta.unidade_nome}...`);
      
      // Buscar todos os vendedores da unidade (incluindo os que estão em múltiplas unidades)
      const [vendedores] = await connection.execute(`
        SELECT v.id, v.name, v.lastName
        FROM vendedores v
        JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
        WHERE vu.unidade_id = ? AND v.ativo = 1
        ORDER BY v.name
      `, [roleta.unidade_id]);
      
      console.log(`   📝 Encontrados ${vendedores.length} vendedores:`);
      vendedores.forEach((v, index) => {
        console.log(`      ${index + 1}. ${v.name} ${v.lastName} (ID: ${v.id})`);
      });
      
      // Limpar fila atual
      await connection.execute('DELETE FROM fila_roleta WHERE roleta_id = ?', [roleta.id]);
      console.log(`   🗑️  Fila anterior removida`);
      
      // Adicionar todos os vendedores na nova fila
      for (let i = 0; i < vendedores.length; i++) {
        await connection.execute(`
          INSERT INTO fila_roleta (roleta_id, vendedor_id, ordem)
          VALUES (?, ?, ?)
        `, [roleta.id, vendedores[i].id, i + 1]);
      }
      
      console.log(`   ✅ Nova fila criada com ${vendedores.length} vendedores`);
    }
    
    console.log('\n🎉 Processo concluído! Todas as roletas foram atualizadas.');
    
    // Verificação final
    console.log('\n📊 Verificação final:');
    for (const roleta of roletas) {
      const [fila] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM fila_roleta
        WHERE roleta_id = ?
      `, [roleta.id]);
      
      console.log(`   - ${roleta.unidade_nome}: ${fila[0].total} vendedores na fila`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada.');
    }
  }
}

// Executar o script
fixRoletasVendedores();
