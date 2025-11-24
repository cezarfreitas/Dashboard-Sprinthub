import mysql from 'mysql2/promise'

// Validar variáveis de ambiente obrigatórias
function validateEnvVariables() {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
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
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20, // Aumentado para suportar mais requisições simultâneas
  maxIdle: 10, // Máximo de conexões ociosas no pool
  idleTimeout: 60000, // 60 segundos - tempo máximo que uma conexão pode ficar ociosa
  queueLimit: 0,
  enableKeepAlive: true, // Mantém conexões ativas
  keepAliveInitialDelay: 0,
  connectTimeout: 10000, // 10 segundos para estabelecer conexão
  timezone: '+00:00' // UTC para evitar problemas de timezone
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
// IMPORTANTE: Usando query() em vez de execute() para evitar prepared statement leak
export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<T[]> {
  const connection = getConnectionPool()
  try {
    const [rows] = await connection.query(query, params)
    return rows as T[]
  } catch (error) {
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

// Função para executar INSERT/UPDATE/DELETE e retornar o resultado
export async function executeMutation(
  query: string,
  params: any[] = []
): Promise<{ insertId?: number; affectedRows: number }> {
  const connection = getConnectionPool()
  try {
    const [result] = await connection.query(query, params) as any
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows || 0
    }
  } catch (error) {
    throw error
  }
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
    await connection.query('SELECT 1')
    return true
  } catch (error) {
    return false
  }
}

// Função para obter estatísticas do pool
export function getPoolStats() {
  const poolInstance = getConnectionPool()
  return {
    // @ts-ignore - propriedades internas do pool
    totalConnections: poolInstance.pool?._allConnections?.length || 0,
    // @ts-ignore
    freeConnections: poolInstance.pool?._freeConnections?.length || 0,
    // @ts-ignore
    queuedRequests: poolInstance.pool?._connectionQueue?.length || 0
  }
}
