/**
 * Script para remover campo 'motivo' da tabela metas_mensais
 * Execute com: node scripts/remove-motivo-from-metas.js
 */

require('dotenv').config({ path: '.env.local' })
const mysql = require('mysql2/promise')

async function removeMotivoField() {
  let connection
  
  try {
    console.log('🔧 Conectando ao banco de dados...')
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })
    
    console.log('✅ Conectado ao banco de dados')
    
    // Verificar se o campo existe
    console.log('🔍 Verificando se campo "motivo" existe...')
    const [columns] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'metas_mensais'
        AND COLUMN_NAME = 'motivo'
    `)
    
    if (columns[0].count === 0) {
      console.log('ℹ️ Campo "motivo" não existe na tabela metas_mensais. Nada a fazer.')
      return
    }
    
    // Remover o campo
    console.log('🗑️ Removendo campo "motivo" da tabela metas_mensais...')
    await connection.execute(`ALTER TABLE metas_mensais DROP COLUMN motivo`)
    
    console.log('✅ Campo "motivo" removido com sucesso!')
    console.log('🎉 Pronto! Agora você pode remover o campo motivo do INSERT na API.')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 Conexão fechada')
    }
  }
}

removeMotivoField()


