-- Migration: Criar tabela para notificações de oportunidades
-- Data: 2025-11-16

CREATE TABLE IF NOT EXISTS notificacao_oportunidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  oportunidade_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(255) NOT NULL,
  valor DECIMAL(15,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'open',
  data_criacao DATETIME NOT NULL,
  vendedor VARCHAR(255) DEFAULT NULL,
  unidade VARCHAR(255) DEFAULT NULL,
  cor VARCHAR(7) DEFAULT NULL COMMENT 'Cor customizada em formato hex (#RRGGBB)',
  consultado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_oportunidade_id (oportunidade_id),
  INDEX idx_consultado_em (consultado_em),
  INDEX idx_status (status),
  
  CONSTRAINT fk_notificacao_oportunidades_oportunidade 
    FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

