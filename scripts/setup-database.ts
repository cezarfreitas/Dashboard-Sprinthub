import { executeQuery } from '../lib/database'
import { createDefaultAdmin } from '../lib/auth'

async function setupDatabase() {
  console.log('🚀 Iniciando configuração do banco de dados...')

  try {
    // Criar tabela de usuários
    console.log('📋 Criando tabela de usuários...')
    
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    console.log('✅ Tabela de usuários criada com sucesso!')

    // Criar usuário admin padrão
    console.log('👤 Criando usuário admin padrão...')
    await createDefaultAdmin()

    console.log('🎉 Configuração do banco de dados concluída!')
    
  } catch (error) {
    console.error('❌ Erro na configuração do banco:', error)
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Setup concluído!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro no setup:', error)
      process.exit(1)
    })
}

export { setupDatabase }
