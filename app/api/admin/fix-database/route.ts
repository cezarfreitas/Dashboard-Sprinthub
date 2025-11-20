import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Verificar e corrigir estrutura do banco
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Iniciando verificação e correção do banco de dados...')
    
    // 1. Criar tabela de unidades
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS unidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        responsavel VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_nome (nome),
        INDEX idx_responsavel (responsavel)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✅ Tabela unidades criada/verificada')

    // 2. Criar tabela de vendedores (com unidade_id direto)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS vendedores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        username VARCHAR(255) UNIQUE NOT NULL,
        telephone VARCHAR(20),
        cpf VARCHAR(14),
        birthDate DATE,
        unidade_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_unidade_id (unidade_id),
        
        CONSTRAINT fk_vendedores_unidade 
          FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✅ Tabela vendedores criada/verificada')

    // 3. Criar tabela de metas mensais
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS metas_mensais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendedor_id INT NOT NULL,
        unidade_id INT NOT NULL,
        mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),
        ano INT NOT NULL CHECK (ano >= 2020 AND ano <= 2030),
        meta_valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        meta_descricao VARCHAR(500) NULL,
        status ENUM('ativa', 'pausada', 'cancelada') DEFAULT 'ativa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_vendedor_id (vendedor_id),
        INDEX idx_unidade_id (unidade_id),
        INDEX idx_mes_ano (mes, ano),
        INDEX idx_vendedor_unidade_mes (vendedor_id, unidade_id, mes, ano),
        INDEX idx_status (status),
        
        UNIQUE KEY unique_vendedor_unidade_mes_ano (vendedor_id, unidade_id, mes, ano),
        
        CONSTRAINT fk_metas_vendedor 
          FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
          ON DELETE CASCADE ON UPDATE CASCADE,
          
        CONSTRAINT fk_metas_unidade 
          FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
          ON DELETE CASCADE ON UPDATE CASCADE
          
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✅ Tabela metas_mensais criada/verificada')

    // 5. Inserir dados de exemplo se não existirem
    const unidadesCount = await executeQuery('SELECT COUNT(*) as count FROM unidades') as any[]
    if (unidadesCount[0].count === 0) {
      await executeQuery(`
        INSERT INTO unidades (id, nome, responsavel) VALUES
        (1, 'São Paulo', 'João Silva'),
        (2, 'Rio de Janeiro', 'Maria Santos'),
        (3, 'Belo Horizonte', 'Carlos Oliveira'),
        (4, 'Salvador', 'Ana Costa'),
        (5, 'Brasília', 'Pedro Ferreira')
      `)
      console.log('✅ Dados de exemplo inseridos na tabela unidades')
    }

    const vendedoresCount = await executeQuery('SELECT COUNT(*) as count FROM vendedores') as any[]
    if (vendedoresCount[0].count === 0) {
      await executeQuery(`
        INSERT INTO vendedores (id, name, lastName, username, email, telephone, unidade_id) VALUES
        (1, 'Alessandra', 'Silva', 'alessandra', 'alessandra@empresa.com', '11999999999', 1),
        (2, 'Carlos', 'Santos', 'carlos', 'carlos@empresa.com', '11888888888', 1),
        (3, 'Maria', 'Oliveira', 'maria', 'maria@empresa.com', '11777777777', 2),
        (4, 'João', 'Ferreira', 'joao', 'joao@empresa.com', '11666666666', 3),
        (5, 'Ana', 'Costa', 'ana', 'ana@empresa.com', '11555555555', 4)
      `)
      console.log('✅ Dados de exemplo inseridos na tabela vendedores')
    }

    // 6. Verificar estrutura final
    const stats = {
      unidades: (await executeQuery('SELECT COUNT(*) as count FROM unidades') as any[])[0].count,
      vendedores: (await executeQuery('SELECT COUNT(*) as count FROM vendedores') as any[])[0].count,
      vendedores_com_unidade: (await executeQuery('SELECT COUNT(*) as count FROM vendedores WHERE unidade_id IS NOT NULL') as any[])[0].count,
      metas: (await executeQuery('SELECT COUNT(*) as count FROM metas_mensais') as any[])[0].count
    }

    console.log('🎉 Banco de dados configurado com sucesso!')
    console.log('📊 Estatísticas:', stats)

    return NextResponse.json({
      success: true,
      message: 'Banco de dados configurado com sucesso',
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao configurar banco de dados',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
