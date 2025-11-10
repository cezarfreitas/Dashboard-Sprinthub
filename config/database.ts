// Configurações do Banco de Dados
// IMPORTANTE: Todas as credenciais devem vir das variáveis de ambiente (.env.local)
export const databaseConfig = {
  // URL completa do banco
  url: process.env.DATABASE_URL,
  
  // Configurações separadas
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Configurações adicionais
  ssl: false,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  }
}

// Função para obter a URL de conexão
export function getDatabaseUrl(): string {
  if (!databaseConfig.url) {
    throw new Error('DATABASE_URL não está configurada nas variáveis de ambiente')
  }
  return databaseConfig.url
}

// Função para obter configurações separadas
export function getDatabaseConfig() {
  return {
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    username: databaseConfig.username,
    password: databaseConfig.password,
    ssl: databaseConfig.ssl,
    pool: databaseConfig.pool
  }
}
