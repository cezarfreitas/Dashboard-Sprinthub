require('dotenv').config()
const mysql = require('mysql2/promise')

async function testMySQLConnection() {
  console.log('🔍 Testando conexão com MySQL...\n')

  // Verificar variáveis de ambiente
  console.log('📋 Variáveis de Ambiente:')
  console.log('  DB_HOST:', process.env.DB_HOST || '❌ NÃO CONFIGURADO')
  console.log('  DB_PORT:', process.env.DB_PORT || '❌ NÃO CONFIGURADO')
  console.log('  DB_USER:', process.env.DB_USER || '❌ NÃO CONFIGURADO')
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO')
  console.log('  DB_NAME:', process.env.DB_NAME || '❌ NÃO CONFIGURADO')
  console.log()

  // Verificar se todas as variáveis estão configuradas
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ ERRO: Variáveis de ambiente faltando:', missing.join(', '))
    console.error('\n💡 Configure essas variáveis no arquivo .env ou .env.local')
    process.exit(1)
  }

  // Tentar conectar
  try {
    console.log('🔌 Tentando conectar ao MySQL...')
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`)
    console.log(`   Database: ${process.env.DB_NAME}`)
    console.log(`   User: ${process.env.DB_USER}`)
    console.log()

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000
    })

    console.log('✅ Conexão estabelecida com sucesso!')
    console.log()

    // Testar query simples
    console.log('🧪 Testando query SELECT 1...')
    const [rows] = await connection.query('SELECT 1 as test')
    console.log('✅ Query executada:', rows)
    console.log()

    // Testar query na tabela oportunidades
    console.log('🧪 Testando query na tabela oportunidades...')
    const [oportunidades] = await connection.query('SELECT COUNT(*) as total FROM oportunidades')
    console.log('✅ Total de oportunidades:', oportunidades[0].total)
    console.log()

    // Testar query na tabela vendedores
    console.log('🧪 Testando query na tabela vendedores...')
    const [vendedores] = await connection.query('SELECT COUNT(*) as total FROM vendedores')
    console.log('✅ Total de vendedores:', vendedores[0].total)
    console.log()

    // Testar query na tabela colunas_funil
    console.log('🧪 Testando query na tabela colunas_funil...')
    const [colunas] = await connection.query('SELECT COUNT(*) as total FROM colunas_funil')
    console.log('✅ Total de colunas_funil:', colunas[0].total)
    console.log()

    await connection.end()
    console.log('🎉 Todos os testes passaram! Conexão MySQL funcionando corretamente.')

  } catch (error) {
    console.error('\n❌ ERRO ao conectar ao MySQL:')
    console.error('   Código:', error.code)
    console.error('   Mensagem:', error.message)
    console.error('\n📝 Detalhes do erro:')
    console.error(error)
    console.error('\n💡 Possíveis causas:')
    console.error('   1. Credenciais incorretas (usuário/senha)')
    console.error('   2. Host ou porta incorretos')
    console.error('   3. Banco de dados não existe')
    console.error('   4. Firewall bloqueando a conexão')
    console.error('   5. Servidor MySQL não está rodando')
    console.error('   6. Limite de conexões atingido')
    process.exit(1)
  }
}

testMySQLConnection()

