-- Script simplificado para configurar o sistema de metas
-- Funciona com tabelas existentes e adiciona apenas o necessário

-- 1. Criar tabela de unidades (se não existir)
CREATE TABLE IF NOT EXISTS unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  responsavel VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_nome (nome),
  INDEX idx_responsavel (responsavel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Criar tabela de vendedores (se não existir)
CREATE TABLE IF NOT EXISTS vendedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(255) UNIQUE NOT NULL,
  telephone VARCHAR(20),
  cpf VARCHAR(14),
  birthDate DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Criar tabela de relacionamento vendedores-unidades (se não existir)
CREATE TABLE IF NOT EXISTS vendedores_unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  unidade_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_vendedor_id (vendedor_id),
  INDEX idx_unidade_id (unidade_id),
  INDEX idx_vendedor_unidade (vendedor_id, unidade_id),
  UNIQUE KEY unique_vendedor_unidade (vendedor_id, unidade_id),
  
  CONSTRAINT fk_vendedores_unidades_vendedor 
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT fk_vendedores_unidades_unidade 
    FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
    ON DELETE CASCADE ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Criar tabela de metas mensais (se não existir)
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
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Criar tabela de histórico de alterações (se não existir)
CREATE TABLE IF NOT EXISTS metas_historico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meta_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  unidade_id INT NOT NULL,
  mes INT NOT NULL,
  ano INT NOT NULL,
  valor_anterior DECIMAL(12,2),
  valor_novo DECIMAL(12,2) NOT NULL,
  descricao_anterior VARCHAR(500),
  descricao_nova VARCHAR(500),
  acao ENUM('criada', 'atualizada', 'pausada', 'reativada', 'cancelada') NOT NULL,
  usuario_alteracao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_meta_id (meta_id),
  INDEX idx_vendedor_id (vendedor_id),
  INDEX idx_unidade_id (unidade_id),
  INDEX idx_mes_ano (mes, ano),
  INDEX idx_acao (acao),
  INDEX idx_created_at (created_at),
  
  CONSTRAINT fk_historico_meta 
    FOREIGN KEY (meta_id) REFERENCES metas_mensais(id) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT fk_historico_vendedor 
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT fk_historico_unidade 
    FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
    ON DELETE CASCADE ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Inserir dados de exemplo (apenas se as tabelas estiverem vazias)
INSERT IGNORE INTO unidades (id, nome, responsavel) VALUES
(1, 'São Paulo', 'João Silva'),
(2, 'Rio de Janeiro', 'Maria Santos'),
(3, 'Belo Horizonte', 'Carlos Oliveira'),
(4, 'Salvador', 'Ana Costa'),
(5, 'Brasília', 'Pedro Ferreira');

INSERT IGNORE INTO vendedores (id, name, lastName, username, email, telephone) VALUES
(1, 'Alessandra', 'Silva', 'alessandra', 'alessandra@empresa.com', '11999999999'),
(2, 'Carlos', 'Santos', 'carlos', 'carlos@empresa.com', '11888888888'),
(3, 'Maria', 'Oliveira', 'maria', 'maria@empresa.com', '11777777777'),
(4, 'João', 'Ferreira', 'joao', 'joao@empresa.com', '11666666666'),
(5, 'Ana', 'Costa', 'ana', 'ana@empresa.com', '11555555555');

INSERT IGNORE INTO vendedores_unidades (vendedor_id, unidade_id) VALUES
(1, 1), -- Alessandra em São Paulo
(2, 1), -- Carlos em São Paulo
(3, 2), -- Maria no Rio de Janeiro
(4, 3), -- João em Belo Horizonte
(5, 4); -- Ana em Salvador

INSERT IGNORE INTO metas_mensais (vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao) VALUES
(1, 1, 10, 2024, 15000.00, 'Meta de outubro - Q4'),
(1, 1, 11, 2024, 18000.00, 'Meta de novembro - Q4'),
(1, 1, 12, 2024, 20000.00, 'Meta de dezembro - Q4'),
(2, 1, 10, 2024, 12000.00, 'Meta de outubro'),
(2, 1, 11, 2024, 15000.00, 'Meta de novembro'),
(3, 2, 10, 2024, 10000.00, 'Meta de outubro - Rio'),
(4, 3, 10, 2024, 13000.00, 'Meta de outubro - BH'),
(5, 4, 10, 2024, 11000.00, 'Meta de outubro - Salvador');

-- Verificar se tudo foi criado corretamente
SELECT 'Configuração concluída!' as status;
SELECT 'Unidades' as tabela, COUNT(*) as registros FROM unidades
UNION ALL
SELECT 'Vendedores', COUNT(*) FROM vendedores
UNION ALL
SELECT 'Vendedores-Unidades', COUNT(*) FROM vendedores_unidades
UNION ALL
SELECT 'Metas Mensais', COUNT(*) FROM metas_mensais
UNION ALL
SELECT 'Histórico Metas', COUNT(*) FROM metas_historico;
