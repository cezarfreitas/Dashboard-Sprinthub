-- Migração da tabela unidades para adicionar campos da API SprintHub
-- A tabela unidades já existe com: id, nome, responsavel, created_at, updated_at
-- Este script adiciona os campos necessários para sincronização

-- Use o script migrate-unidades-table.sql para adicionar as colunas
-- ou crie a tabela completa se não existir:

CREATE TABLE IF NOT EXISTS unidades (
  id INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id INT NULL,
  show_sac360 TINYINT DEFAULT 0,
  show_crm TINYINT DEFAULT 0,
  create_date DATETIME NULL,
  update_date DATETIME NULL,
  subs INT NULL,
  users INT NULL,
  permissions_groups INT NULL,
  voip TINYINT DEFAULT 0,
  branches INT NULL,
  accs INT NULL,
  google_business_messages TINYINT DEFAULT 0,
  ativo TINYINT DEFAULT 1,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_ativo (ativo),
  INDEX idx_synced_at (synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
