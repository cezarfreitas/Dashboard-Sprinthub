import mysql from 'mysql2/promise'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

async function setupUsuariosSistema() {
  console.log('🚀 Iniciando setup da tabela usuarios_sistema...\n')

  // Criar conexão
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  })

  try {
    console.log('✅ Conectado ao banco de dados\n')

    // Ler arquivo SQL
    const sqlFile = path.join(__dirname, 'create-usuarios-sistema-table.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')

    // Executar SQL
    console.log('📝 Executando script SQL...\n')
    await connection.query(sql)

    console.log('✅ Tabela usuarios_sistema criada com sucesso!')
    console.log('✅ Usuário admin padrão inserido (email: admin@sistema.com, senha: admin123)\n')

    // Verificar se a tabela foi criada
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM usuarios_sistema')
    console.log(`📊 Total de usuários cadastrados: ${(rows as any)[0].count}\n`)

  } catch (error) {
    console.error('❌ Erro ao executar script:', error)
    throw error
  } finally {
    await connection.end()
    console.log('🔌 Conexão fechada')
  }
}

// Executar
setupUsuariosSistema()
  .then(() => {
    console.log('\n✅ Setup concluído com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no setup:', error)
    process.exit(1)
  })

