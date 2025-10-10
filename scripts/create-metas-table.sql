-- Tabela de metas mensais por vendedor/unidade
CREATE TABLE IF NOT EXISTS metas_mensais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  unidade_id INT NOT NULL,
  mes INT NOT NULL,
  ano INT NOT NULL,
  meta_valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  meta_descricao VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_vendedor_id (vendedor_id),
  INDEX idx_unidade_id (unidade_id),
  INDEX idx_mes_ano (mes, ano),
  INDEX idx_vendedor_unidade_mes (vendedor_id, unidade_id, mes, ano),
  
  -- Constraint única para evitar duplicatas
  UNIQUE KEY unique_vendedor_unidade_mes_ano (vendedor_id, unidade_id, mes, ano),
  
  -- Foreign keys
  CONSTRAINT fk_metas_vendedor 
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT fk_metas_unidade 
    FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
    ON DELETE CASCADE ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
