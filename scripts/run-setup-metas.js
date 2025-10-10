#!/usr/bin/env node

/**
 * Script para configurar o banco de dados do sistema de metas
 * Executa o arquivo SQL de setup e verifica se tudo foi criado corretamente
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dash_inteli',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🚀 Iniciando configuração do banco de dados...');
    
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Ler arquivo SQL
    const sqlFile = path.join(__dirname, 'setup-metas-database.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executando script SQL...');
    
    // Executar script SQL
    await connection.execute(sqlContent);
    console.log('✅ Script SQL executado com sucesso');
    
    // Verificar tabelas criadas
    console.log('\n📊 Verificando tabelas criadas:');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('unidades', 'vendedores', 'vendedores_unidades', 'metas_mensais', 'metas_historico')
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);
    
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}: ${table.TABLE_ROWS} registros`);
    });
    
    // Verificar dados de exemplo
    console.log('\n📈 Verificando dados de exemplo:');
    
    const [unidades] = await connection.execute('SELECT COUNT(*) as total FROM unidades');
    const [vendedores] = await connection.execute('SELECT COUNT(*) as total FROM vendedores');
    const [relacionamentos] = await connection.execute('SELECT COUNT(*) as total FROM vendedores_unidades');
    const [metas] = await connection.execute('SELECT COUNT(*) as total FROM metas_mensais');
    
    console.log(`  - Unidades: ${unidades[0].total}`);
    console.log(`  - Vendedores: ${vendedores[0].total}`);
    console.log(`  - Relacionamentos: ${relacionamentos[0].total}`);
    console.log(`  - Metas: ${metas[0].total}`);
    
    // Testar consulta de metas
    console.log('\n🔍 Testando consulta de metas:');
    const [metasTest] = await connection.execute(`
      SELECT 
        m.id,
        m.meta_valor,
        v.name as vendedor_nome,
        u.nome as unidade_nome,
        m.mes,
        m.ano
      FROM metas_mensais m
      JOIN vendedores v ON m.vendedor_id = v.id
      JOIN unidades u ON m.unidade_id = u.id
      WHERE m.status = 'ativa'
      LIMIT 5
    `);
    
    if (metasTest.length > 0) {
      console.log('  ✅ Consulta de metas funcionando:');
      metasTest.forEach(meta => {
        console.log(`    - ${meta.vendedor_nome} (${meta.unidade_nome}): R$ ${meta.meta_valor} - ${meta.mes}/${meta.ano}`);
      });
    } else {
      console.log('  ⚠️  Nenhuma meta encontrada (normal se não houver dados)');
    }
    
    console.log('\n🎉 Configuração do banco de dados concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('  1. Acesse http://localhost:3000/metas/config');
    console.log('  2. Teste a criação e edição de metas');
    console.log('  3. Verifique a matriz por unidade');
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Dica: Verifique as credenciais do banco de dados nas variáveis de ambiente:');
      console.log('   - DB_HOST');
      console.log('   - DB_USER');
      console.log('   - DB_PASSWORD');
      console.log('   - DB_NAME');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Dica: O banco de dados não existe. Crie o banco primeiro:');
      console.log(`   CREATE DATABASE ${dbConfig.database};`);
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco encerrada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
