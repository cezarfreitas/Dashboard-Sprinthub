/**
 * Script para verificar schema da tabela metas_mensais
 */

require('dotenv').config({ path: '.env.local' })
const mysql = require('mysql2/promise')

async function checkSchema() {
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
    
    // Verificar todas as colunas da tabela
    console.log('🔍 Verificando colunas da tabela metas_mensais...')
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'metas_mensais'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('\n📋 Colunas encontradas:')
    console.table(columns)
    
    const motivoColumn = columns.find((col: any) => col.COLUMN_NAME === 'motivo')
    
    if (motivoColumn) {
      console.log('\n⚠️ Campo "motivo" encontrado!')
      console.log('Tentando remover...')
      
      try {
        await connection.execute(`ALTER TABLE metas_mensais DROP COLUMN motivo`)
        console.log('✅ Campo "motivo" removido com sucesso!')
      } catch (dropError: any) {
        console.error('❌ Erro ao remover campo:', dropError.message)
      }
    } else {
      console.log('\n✅ Campo "motivo" não existe na tabela')
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Conexão fechada')
    }
  }
}

checkSchema()


