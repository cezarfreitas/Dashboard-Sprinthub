const mysql = require('mysql2/promise');
require('dotenv').config();

async function removeUnidadeIdColumn() {
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

    // Verificar se existem dados na tabela vendedores_unidades
    console.log('🔍 Verificando dados migrados...');
    const [checkResult] = await connection.execute('SELECT COUNT(*) as total FROM vendedores_unidades');
    console.log(`✅ Existem ${checkResult[0].total} relacionamentos na tabela vendedores_unidades`);

    // Verificar se a coluna unidade_id existe
    console.log('🔍 Verificando se coluna unidade_id existe...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'vendedores' 
      AND COLUMN_NAME = 'unidade_id'
    `);

    if (columns.length === 0) {
      console.log('ℹ️ Coluna unidade_id já foi removida ou não existe');
    } else {
      console.log('🗑️ Removendo coluna unidade_id da tabela vendedores...');
      await connection.execute('ALTER TABLE vendedores DROP COLUMN unidade_id');
      console.log('✅ Coluna unidade_id removida com sucesso!');
    }

    // Verificar estrutura final da tabela
    console.log('🔍 Verificando estrutura final da tabela vendedores...');
    const [tableStructure] = await connection.execute('DESCRIBE vendedores');
    console.log('📋 Estrutura atual da tabela vendedores:');
    tableStructure.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });

    console.log('🎉 Correção da tabela vendedores concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Conexão fechada');
    }
  }
}

removeUnidadeIdColumn();
