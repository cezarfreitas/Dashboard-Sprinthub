-- Script para criar a tabela de logs das roletas
-- Execute este script no seu banco MySQL

USE dash_inteli;

-- Criar tabela de logs das roletas
CREATE TABLE IF NOT EXISTS roleta_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roleta_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  vendedor_name VARCHAR(255) NOT NULL,
  vendedor_email VARCHAR(255),
  unidade_nome VARCHAR(255) NOT NULL,
  responsavel VARCHAR(255),
  ordem_anterior INT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_roleta_id (roleta_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_vendedor_id (vendedor_id),
  
  FOREIGN KEY (roleta_id) REFERENCES roletas(id) ON DELETE CASCADE,
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se a tabela foi criada corretamente
DESCRIBE roleta_logs;
