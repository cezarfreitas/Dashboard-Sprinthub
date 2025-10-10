const mysql = require('mysql2/promise');
require('dotenv').config();

async function createRelationTable() {
  let connection;
  
  try {
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
      user: process.env.DB_USER || 'inteli_db',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inteli_db',
      port: process.env.DB_PORT || 3359
    });

    console.log('✅ Conectado ao banco de dados');

    // Criar tabela de relacionamento
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS vendedores_unidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendedor_id INT NOT NULL,
        unidade_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_vendedor_id (vendedor_id),
        INDEX idx_unidade_id (unidade_id),
        INDEX idx_vendedor_unidade (vendedor_id, unidade_id),
        UNIQUE KEY unique_vendedor_unidade (vendedor_id, unidade_id),
        
        CONSTRAINT fk_vendedores_unidades_vendedor 
          FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
          ON DELETE CASCADE ON UPDATE CASCADE,
          
        CONSTRAINT fk_vendedores_unidades_unidade 
          FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
          ON DELETE CASCADE ON UPDATE CASCADE
          
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Tabela vendedores_unidades criada');

    // Migrar dados existentes
    const migrateSQL = `
      INSERT IGNORE INTO vendedores_unidades (vendedor_id, unidade_id)
      SELECT id, unidade_id 
      FROM vendedores 
      WHERE unidade_id IS NOT NULL
    `;

    const [result] = await connection.execute(migrateSQL);
    console.log(`✅ Migrados ${result.affectedRows} relacionamentos existentes`);

    console.log('🎉 Estrutura de banco atualizada com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Conexão fechada');
    }
  }
}

createRelationTable();
