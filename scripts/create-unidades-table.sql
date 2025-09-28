-- Tabela de unidades
CREATE TABLE IF NOT EXISTS unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  gerente VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_nome (nome),
  INDEX idx_gerente (gerente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar coluna unidade_id na tabela vendedores (se não existir)
ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS unidade_id INT NULL,
ADD INDEX IF NOT EXISTS idx_unidade_id (unidade_id);

-- Adicionar foreign key constraint (opcional)
-- ALTER TABLE vendedores 
-- ADD CONSTRAINT fk_vendedores_unidade 
-- FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
-- ON DELETE SET NULL ON UPDATE CASCADE;
