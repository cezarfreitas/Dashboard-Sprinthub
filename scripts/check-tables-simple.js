#!/usr/bin/env node

/**
 * Script simples para verificar o estado das tabelas de metas
 */

const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dash_inteli'
};

async function checkTables() {
  let connection;
  
  try {
    console.log('🔍 Verificando tabelas de metas...');
    
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // 1. Verificar tabelas existentes
    console.log('\n📋 TABELAS EXISTENTES:');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE '%meta%'
      ORDER BY TABLE_NAME
    `);
    
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}: ${table.TABLE_ROWS} registros (criada em ${table.CREATE_TIME})`);
    });
    
    // 2. Verificar uso de cada tabela
    console.log('\n📊 ANÁLISE DE USO:');
    
    // metas_mensais
    if (tables.some(t => t.TABLE_NAME === 'metas_mensais')) {
      const [metasStats] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'ativa' THEN 1 END) as ativas,
          COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as canceladas,
          SUM(meta_valor) as valor_total
        FROM metas_mensais
      `);
      
      console.log(`  📈 metas_mensais:`);
      console.log(`     - Total: ${metasStats[0].total} metas`);
      console.log(`     - Ativas: ${metasStats[0].ativas}`);
      console.log(`     - Canceladas: ${metasStats[0].canceladas}`);
      console.log(`     - Valor total: R$ ${metasStats[0].valor_total || 0}`);
    }
    
    // metas_historico
    if (tables.some(t => t.TABLE_NAME === 'metas_historico')) {
      const [historicoStats] = await connection.execute(`
        SELECT COUNT(*) as total, MIN(created_at) as primeiro, MAX(created_at) as ultimo
        FROM metas_historico
      `);
      
      console.log(`  📚 metas_historico:`);
      console.log(`     - Total: ${historicoStats[0].total} registros`);
      if (historicoStats[0].total > 0) {
        console.log(`     - Primeiro: ${historicoStats[0].primeiro}`);
        console.log(`     - Último: ${historicoStats[0].ultimo}`);
      } else {
        console.log(`     - ⚠️ TABELA VAZIA - PODE SER REMOVIDA`);
      }
    }
    
    // metas_config
    if (tables.some(t => t.TABLE_NAME === 'metas_config')) {
      const [configStats] = await connection.execute(`
        SELECT COUNT(*) as total FROM metas_config
      `);
      
      console.log(`  ⚙️ metas_config:`);
      console.log(`     - Total: ${configStats[0].total} registros`);
      if (configStats[0].total === 0) {
        console.log(`     - ⚠️ TABELA VAZIA - PODE SER REMOVIDA`);
      }
    }
    
    // 3. Verificar estrutura da tabela principal
    console.log('\n🏗️ ESTRUTURA metas_mensais:');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'metas_mensais'
      ORDER BY ORDINAL_POSITION
    `);
    
    columns.forEach(col => {
      const key = col.COLUMN_KEY ? ` (${col.COLUMN_KEY})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const default_val = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
      
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable}${default_val}${key}`);
    });
    
    // 4. Verificar índices
    console.log('\n🔍 ÍNDICES:');
    const [indexes] = await connection.execute(`SHOW INDEX FROM metas_mensais`);
    indexes.forEach(idx => {
      console.log(`  - ${idx.Key_name}: ${idx.Column_name} (${idx.Non_unique ? 'NÃO ÚNICO' : 'ÚNICO'})`);
    });
    
    // 5. Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    
    const emptyTables = []
    if (tables.some(t => t.TABLE_NAME === 'metas_historico')) {
      const [count] = await connection.execute(`SELECT COUNT(*) as total FROM metas_historico`);
      if (count[0].total === 0) emptyTables.push('metas_historico');
    }
    
    if (tables.some(t => t.TABLE_NAME === 'metas_config')) {
      const [count] = await connection.execute(`SELECT COUNT(*) as total FROM metas_config`);
      if (count[0].total === 0) emptyTables.push('metas_config');
    }
    
    if (emptyTables.length > 0) {
      console.log('  ⚠️ TABELAS VAZIAS (podem ser removidas):');
      emptyTables.forEach(table => {
        console.log(`     - DROP TABLE ${table};`);
      });
    }
    
    console.log('  ✅ metas_mensais: MANTER - Tabela principal em uso');
    console.log('  📝 Estrutura atual está adequada para o funcionamento');
    
    console.log('\n🎉 Análise concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a análise:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Verifique as credenciais do banco de dados');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 O banco de dados não existe');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkTables();
}

module.exports = { checkTables };
