-- Tabela de Motivos de Perda sincronizados do SprintHub
CREATE TABLE IF NOT EXISTS motivos_de_perda (
  id INT PRIMARY KEY,
  motivo VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_motivo (motivo),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

