// Configurações do Banco de Dados
export const databaseConfig = {
  // URL completa do banco
  url: process.env.DATABASE_URL || 'mysql://inteli_db:20ab5823b8f45c747cb1@server.idenegociosdigitais.com.br:3359/inteli_db',
  
  // Configurações separadas
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3359'),
  database: process.env.DB_NAME || 'inteli_db',
  username: process.env.DB_USER || 'inteli_db',
  password: process.env.DB_PASSWORD || '20ab5823b8f45c747cb1',
  
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
