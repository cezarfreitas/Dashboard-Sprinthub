import mysql from 'mysql2/promise'

// Validar variáveis de ambiente obrigatórias
function validateEnvVariables() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}\n` +
      `Configure essas variáveis no arquivo .env.local`
    )
  }
}

// Configurações do banco de dados
// IMPORTANTE: Todas as credenciais devem vir das variáveis de ambiente (.env.local)
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Removidas configurações inválidas para MySQL2
  // acquireTimeout, timeout, reconnect não são suportadas
}

// Pool de conexões
let pool: mysql.Pool | null = null

// Função para obter o pool de conexões
export function getConnectionPool(): mysql.Pool {
  if (!pool) {
    validateEnvVariables()
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

// Função para executar queries
export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<T[]> {
  const connection = getConnectionPool()
  try {
    const [rows] = await connection.execute(query, params)
    return rows as T[]
  } catch (error) {
    console.error('Erro ao executar query:', error)
    throw error
  }
}

// Função para executar uma query e retornar o primeiro resultado
export async function executeQueryOne<T = any>(
  query: string, 
  params: any[] = []
): Promise<T | null> {
  const results = await executeQuery<T>(query, params)
  return results.length > 0 ? results[0] : null
}

// Função para fechar o pool de conexões
export async function closeConnectionPool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// Função para testar a conexão
export async function testConnection(): Promise<boolean> {
  try {
    const connection = getConnectionPool()
    await connection.execute('SELECT 1')
    console.log('✅ Conexão com o banco de dados estabelecida!')
    return true
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error)
    return false
  }
}
