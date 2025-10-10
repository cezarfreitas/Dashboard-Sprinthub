-- Criar tabela de relacionamento many-to-many entre vendedores e unidades
CREATE TABLE IF NOT EXISTS vendedores_unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  unidade_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_vendedor_id (vendedor_id),
  INDEX idx_unidade_id (unidade_id),
  INDEX idx_vendedor_unidade (vendedor_id, unidade_id),
  
  -- Constraint única para evitar duplicatas
  UNIQUE KEY unique_vendedor_unidade (vendedor_id, unidade_id),
  
  -- Foreign keys
  CONSTRAINT fk_vendedores_unidades_vendedor 
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT fk_vendedores_unidades_unidade 
    FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
    ON DELETE CASCADE ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar dados existentes da coluna unidade_id para a nova tabela
INSERT INTO vendedores_unidades (vendedor_id, unidade_id)
SELECT id, unidade_id 
FROM vendedores 
WHERE unidade_id IS NOT NULL
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Remover a coluna unidade_id da tabela vendedores após migração
-- ALTER TABLE vendedores DROP COLUMN unidade_id;
