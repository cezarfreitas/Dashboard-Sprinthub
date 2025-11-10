-- ============================================================
-- Criar tabela de relacionamento vendedores ↔ unidades
-- Relacionamento many-to-many: um vendedor pode ter várias unidades
-- ============================================================

USE inteli_db;

-- Criar tabela de relacionamento
CREATE TABLE IF NOT EXISTS vendedores_unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  unidade_id INT NOT NULL,
  sequencia INT DEFAULT 1,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_vendedor_id (vendedor_id),
  INDEX idx_unidade_id (unidade_id),
  INDEX idx_vendedor_unidade (vendedor_id, unidade_id),
  INDEX idx_unidade_sequencia (unidade_id, sequencia),
  INDEX idx_unidade_ativo (unidade_id, ativo),
  
  -- Constraint única para evitar duplicatas
  UNIQUE KEY unique_vendedor_unidade (vendedor_id, unidade_id)
  
  -- Nota: Foreign keys comentadas para evitar erros se as tabelas não tiverem PKs corretas
  -- Descomente se quiser garantir integridade referencial:
  -- ,
  -- CONSTRAINT fk_vendedores_unidades_vendedor 
  --   FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
  --   ON DELETE CASCADE ON UPDATE CASCADE,
  -- CONSTRAINT fk_vendedores_unidades_unidade 
  --   FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
  --   ON DELETE CASCADE ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ Tabela vendedores_unidades criada com sucesso!' AS status;

-- Verificar estrutura
SHOW COLUMNS FROM vendedores_unidades;










