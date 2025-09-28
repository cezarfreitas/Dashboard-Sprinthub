import mysql from 'mysql2/promise'

// Configurações do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3359'),
  user: process.env.DB_USER || 'inteli_db',
  password: process.env.DB_PASSWORD || '20ab5823b8f45c747cb1',
  database: process.env.DB_NAME || 'inteli_db',
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
