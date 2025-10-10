#!/usr/bin/env node

/**
 * Script para testar se o banco de dados está funcionando corretamente
 */

const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dash_inteli',
  multipleStatements: true
};

async function testDatabase() {
  let connection;
  
  try {
    console.log('🧪 Testando conexão com banco de dados...');
    
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');
    
    // Teste 1: Verificar se as tabelas existem
    console.log('\n📋 Verificando tabelas...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('unidades', 'vendedores', 'vendedores_unidades', 'metas_mensais')
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);
    
    if (tables.length === 0) {
      console.log('❌ Nenhuma tabela encontrada. Execute o script de setup primeiro.');
      return;
    }
    
    tables.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME}: ${table.TABLE_ROWS} registros`);
    });
    
    // Teste 2: Verificar dados básicos
    console.log('\n📊 Verificando dados...');
    const [unidades] = await connection.execute('SELECT COUNT(*) as total FROM unidades');
    const [vendedores] = await connection.execute('SELECT COUNT(*) as total FROM vendedores');
    const [relacionamentos] = await connection.execute('SELECT COUNT(*) as total FROM vendedores_unidades');
    const [metas] = await connection.execute('SELECT COUNT(*) as total FROM metas_mensais');
    
    console.log(`  📍 Unidades: ${unidades[0].total}`);
    console.log(`  👥 Vendedores: ${vendedores[0].total}`);
    console.log(`  🔗 Relacionamentos: ${relacionamentos[0].total}`);
    console.log(`  🎯 Metas: ${metas[0].total}`);
    
    // Teste 3: Testar inserção de meta
    console.log('\n🧪 Testando inserção de meta...');
    
    // Buscar um vendedor e unidade para teste
    const [vendedorTest] = await connection.execute('SELECT id FROM vendedores LIMIT 1');
    const [unidadeTest] = await connection.execute('SELECT id FROM unidades LIMIT 1');
    
    if (vendedorTest.length === 0 || unidadeTest.length === 0) {
      console.log('❌ Não há vendedores ou unidades para teste');
      return;
    }
    
    const vendedorId = vendedorTest[0].id;
    const unidadeId = unidadeTest[0].id;
    
    // Tentar inserir uma meta de teste
    try {
      await connection.execute(`
        INSERT INTO metas_mensais (vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [vendedorId, unidadeId, 1, 2025, 10000.00, 'Meta de teste']);
      
      console.log('✅ Meta de teste inserida com sucesso');
      
      // Buscar a meta inserida
      const [metaInserida] = await connection.execute(`
        SELECT m.*, v.name, u.nome 
        FROM metas_mensais m
        JOIN vendedores v ON m.vendedor_id = v.id
        JOIN unidades u ON m.unidade_id = u.id
        WHERE m.vendedor_id = ? AND m.mes = 1 AND m.ano = 2025
      `, [vendedorId]);
      
      if (metaInserida.length > 0) {
        const meta = metaInserida[0];
        console.log(`  ✅ Meta encontrada: ${meta.name} (${meta.nome}) - R$ ${meta.meta_valor}`);
      }
      
      // Remover meta de teste
      await connection.execute(`
        DELETE FROM metas_mensais 
        WHERE vendedor_id = ? AND mes = 1 AND ano = 2025 AND meta_descricao = 'Meta de teste'
      `, [vendedorId]);
      
      console.log('✅ Meta de teste removida');
      
    } catch (error) {
      console.log('❌ Erro ao inserir meta de teste:', error.message);
    }
    
    // Teste 4: Testar consulta complexa
    console.log('\n🔍 Testando consulta complexa...');
    try {
      const [resultado] = await connection.execute(`
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
      
      if (resultado.length > 0) {
        console.log('✅ Consulta complexa funcionando:');
        resultado.forEach(meta => {
          console.log(`  📋 ${meta.vendedor_nome} (${meta.unidade_nome}): R$ ${meta.meta_valor} - ${meta.mes}/${meta.ano}`);
        });
      } else {
        console.log('⚠️  Nenhuma meta encontrada (normal se não houver dados)');
      }
    } catch (error) {
      console.log('❌ Erro na consulta complexa:', error.message);
    }
    
    console.log('\n🎉 Todos os testes concluídos!');
    console.log('\n💡 Se todos os testes passaram, o banco está funcionando corretamente.');
    console.log('   Acesse http://localhost:3000/metas/config para testar a interface.');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Dica: Verifique as credenciais do banco de dados nas variáveis de ambiente');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Dica: O banco de dados não existe. Crie o banco primeiro:');
      console.log(`   CREATE DATABASE ${dbConfig.database};`);
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
  testDatabase();
}

module.exports = { testDatabase };
