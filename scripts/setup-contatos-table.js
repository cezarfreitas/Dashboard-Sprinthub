/**
 * Script para criar automaticamente a tabela contatos_whatsapp
 * 
 * Execução:
 * node scripts/setup-contatos-table.js
 */

const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function setupTable() {
  let connection

  try {
    log('\n=== 🔧 SETUP DA TABELA CONTATOS_WHATSAPP ===\n', 'cyan')

    // Conectar ao banco
    log('1️⃣  Conectando ao banco de dados...', 'yellow')
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dash_inteli',
      port: parseInt(process.env.DB_PORT || '3306')
    })
    log('✅ Conectado ao banco!', 'green')

    // Verificar se a tabela já existe
    log('\n2️⃣  Verificando se a tabela já existe...', 'yellow')
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'contatos_whatsapp'"
    )

    if (tables.length > 0) {
      log('⚠️  Tabela contatos_whatsapp já existe!', 'yellow')
      
      // Mostrar estrutura atual
      log('\n📋 Estrutura atual da tabela:', 'cyan')
      const [structure] = await connection.execute('DESCRIBE contatos_whatsapp')
      console.table(structure)
      
      log('\n✅ Nenhuma ação necessária.', 'green')
      return
    }

    // Criar tabela
    log('\n3️⃣  Criando tabela contatos_whatsapp...', 'yellow')
    await connection.execute(`
      CREATE TABLE contatos_whatsapp (
        id_contato VARCHAR(50) NOT NULL COMMENT 'ID único do contato - Chave Primária',
        wpp_filial VARCHAR(20) NOT NULL COMMENT 'Telefone WhatsApp da filial',
        wpp_contato VARCHAR(20) NOT NULL COMMENT 'Telefone WhatsApp do contato',
        vendedor VARCHAR(255) NOT NULL COMMENT 'Nome completo do vendedor',
        vendedor_id INT NOT NULL COMMENT 'ID do vendedor na tabela vendedores',
        nome VARCHAR(255) NOT NULL COMMENT 'Nome do contato',
        ativo TINYINT(1) DEFAULT 1 COMMENT 'Contato ativo (1) ou inativo (0)',
        observacoes TEXT DEFAULT NULL COMMENT 'Observações sobre o contato',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        PRIMARY KEY (id_contato),
        KEY idx_vendedor_id (vendedor_id),
        KEY idx_wpp_filial (wpp_filial),
        KEY idx_wpp_contato (wpp_contato),
        KEY idx_nome (nome),
        KEY idx_ativo (ativo),
        KEY idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
      COMMENT='Contatos WhatsApp vinculados a vendedores e filiais'
    `)
    log('✅ Tabela criada com sucesso!', 'green')

    // Mostrar estrutura
    log('\n4️⃣  Estrutura da tabela criada:', 'cyan')
    const [structure] = await connection.execute('DESCRIBE contatos_whatsapp')
    console.table(structure)

    // Inserir dados de teste (opcional)
    log('\n5️⃣  Deseja inserir dados de teste? (comentado)', 'yellow')
    log('Para inserir, descomente o código no script', 'yellow')
    
    /*
    await connection.execute(`
      INSERT INTO contatos_whatsapp 
        (id_contato, wpp_filial, wpp_contato, vendedor, vendedor_id, nome, observacoes) 
      VALUES 
        ('65853', '5527981920127', '5511989882867', 'Gilmar ES OUTDOOR', 228, 'cezar freitas', 'Contato de teste')
    `)
    log('✅ Dados de teste inseridos!', 'green')
    */

    log('\n=== ✅ SETUP CONCLUÍDO COM SUCESSO ===\n', 'cyan')
    log('Agora você pode usar a API /api/contatos', 'green')

  } catch (error) {
    log('\n❌ ERRO:', 'red')
    console.error(error)
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('\n⚠️  Verifique suas credenciais do banco de dados no .env.local', 'yellow')
    } else if (error.code === 'ECONNREFUSED') {
      log('\n⚠️  Verifique se o MySQL está rodando', 'yellow')
    }
  } finally {
    if (connection) {
      await connection.end()
      log('\n🔌 Conexão fechada', 'yellow')
    }
  }
}

// Executar
setupTable()

