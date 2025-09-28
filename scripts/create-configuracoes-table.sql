-- Script para criar tabela de configurações
-- Execute este script no seu cliente MySQL

USE inteli_db;

-- Criar tabela de configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  descricao VARCHAR(255),
  tipo ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configuração padrão do tema
INSERT INTO configuracoes (chave, valor, descricao, tipo) 
VALUES ('theme', 'light', 'Tema da aplicação (light/dark)', 'string')
ON DUPLICATE KEY UPDATE valor = 'light';

-- Inserir outras configurações padrão
INSERT INTO configuracoes (chave, valor, descricao, tipo) 
VALUES 
  ('notifications_enabled', 'true', 'Notificações habilitadas', 'boolean'),
  ('auto_refresh_interval', '30000', 'Intervalo de atualização automática em ms', 'number'),
  ('dashboard_layout', 'grid', 'Layout do dashboard (grid/list)', 'string')
ON DUPLICATE KEY UPDATE 
  notifications_enabled = 'true',
  auto_refresh_interval = '30000',
  dashboard_layout = 'grid';

-- Verificar se a tabela foi criada
SELECT * FROM configuracoes;
