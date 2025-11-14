import mysql from 'mysql2/promise'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function setupPasswordReset() {
  console.log('🔧 Configurando campos de recuperação de senha...\n')

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    console.log('📊 Verificando e adicionando campos reset_token e reset_token_expires...')
    
    // Verificar se as colunas já existem
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios_sistema'
    `, [process.env.DB_NAME])

    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME)

    // Adicionar reset_token se não existir
    if (!existingColumns.includes('reset_token')) {
      console.log('  → Adicionando coluna reset_token...')
      await connection.query(`
        ALTER TABLE usuarios_sistema 
        ADD COLUMN reset_token VARCHAR(255)
      `)
      console.log('  ✅ reset_token adicionado')
    } else {
      console.log('  ℹ️  reset_token já existe')
    }

    // Adicionar reset_token_expires se não existir
    if (!existingColumns.includes('reset_token_expires')) {
      console.log('  → Adicionando coluna reset_token_expires...')
      await connection.query(`
        ALTER TABLE usuarios_sistema 
        ADD COLUMN reset_token_expires DATETIME
      `)
      console.log('  ✅ reset_token_expires adicionado')
    } else {
      console.log('  ℹ️  reset_token_expires já existe')
    }

    console.log('✅ Campos configurados com sucesso!')

    console.log('\n📊 Criando índice para reset_token...')
    
    // Verificar se o índice já existe
    const [indexes] = await connection.query(`
      SHOW INDEX FROM usuarios_sistema WHERE Key_name = 'idx_reset_token'
    `)

    if ((indexes as any[]).length === 0) {
      await connection.query(`
        ALTER TABLE usuarios_sistema 
        ADD INDEX idx_reset_token (reset_token)
      `)
      console.log('✅ Índice criado com sucesso!')
    } else {
      console.log('ℹ️  Índice já existe')
    }

    console.log('\n✅ Configuração de recuperação de senha concluída!\n')
    console.log('📝 Próximos passos:')
    console.log('1. Adicione as variáveis de ambiente ao .env.local:')
    console.log('   RESEND_API_KEY=re_KsXCV952_Q2ZLTsVHt4gBgxtCEfXBo1WV')
    console.log('   EMAIL_FROM=Sistema <onboarding@resend.dev>')
    console.log('   NEXT_PUBLIC_APP_URL=http://localhost:3000')
    console.log('\n2. Reinicie o servidor: npm run dev')
    console.log('3. Teste a recuperação de senha em: /sistema/forgot-password\n')

  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    throw error
  } finally {
    await connection.end()
  }
}

setupPasswordReset()
  .then(() => {
    console.log('✅ Script executado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro ao executar script:', error)
    process.exit(1)
  })

