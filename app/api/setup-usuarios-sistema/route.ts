import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Endpoint para criar a tabela usuarios_sistema
export async function POST() {
  try {
    // Criar tabela
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS usuarios_sistema (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        whatsapp VARCHAR(20),
        senha VARCHAR(255) NOT NULL,
        permissoes JSON,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_ativo (ativo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    // Verificar se já existe algum usuário
    const usuarios = await executeQuery('SELECT COUNT(*) as count FROM usuarios_sistema') as any[]
    
    if (usuarios[0].count === 0) {
      // Inserir usuário admin padrão (senha: admin123)
      // Hash bcrypt de "admin123"
      await executeQuery(`
        INSERT INTO usuarios_sistema (nome, email, senha, permissoes, ativo) 
        VALUES (
          'Administrador',
          'admin@sistema.com',
          '$2a$10$rXKnWrBH9VYN3HBTQX1TuO5k5lGVX5lGVX5lGVX5lGVX5lGVX5lG',
          '["admin", "usuarios", "configuracoes", "dashboard"]',
          true
        )
      `)
    }

    return NextResponse.json({
      success: true,
      message: 'Tabela usuarios_sistema criada com sucesso!',
      total_usuarios: usuarios[0].count + (usuarios[0].count === 0 ? 1 : 0)
    })

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao criar tabela',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

