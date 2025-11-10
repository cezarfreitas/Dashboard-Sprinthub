-- Criar tabela unidades completa
-- Inclui campos originais do sistema + campos da API SprintHub

CREATE TABLE IF NOT EXISTS unidades (
  -- Campos originais do sistema
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NULL,
  responsavel VARCHAR(255) NULL,
  
  -- Campos da API SprintHub (departamentos)
  name VARCHAR(255) NULL,
  department_id INT NULL,
  show_sac360 TINYINT DEFAULT 0,
  show_crm TINYINT DEFAULT 0,
  create_date DATETIME NULL,
  update_date DATETIME NULL,
  subs JSON NULL,
  users JSON NULL,
  permissions_groups JSON NULL,
  voip JSON NULL,
  branches JSON NULL,
  accs JSON NULL,
  google_business_messages JSON NULL,
  fila_leads JSON NULL,
  
  -- Campos de controle
  ativo TINYINT DEFAULT 1,
  synced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_nome (nome),
  INDEX idx_name (name),
  INDEX idx_department_id (department_id),
  INDEX idx_ativo (ativo),
  INDEX idx_synced_at (synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

