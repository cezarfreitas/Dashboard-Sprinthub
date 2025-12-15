-- Migration 009: Criar tabela para códigos OTP (One-Time Password)
-- Data: 2024-12-15
-- Descrição: Armazenar códigos OTP para autenticação de consultores via email

CREATE TABLE IF NOT EXISTS otp_codes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL COMMENT 'Email do vendedor/consultor',
  code VARCHAR(6) NOT NULL COMMENT 'Código OTP de 6 dígitos',
  vendedor_id INT NOT NULL COMMENT 'ID do vendedor associado',
  expires_at DATETIME NOT NULL COMMENT 'Data/hora de expiração do código',
  verified TINYINT(1) DEFAULT 0 COMMENT 'Se o código já foi usado (0 = não, 1 = sim)',
  verified_at DATETIME DEFAULT NULL COMMENT 'Data/hora da verificação',
  attempts INT DEFAULT 0 COMMENT 'Número de tentativas de verificação',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP de origem da solicitação',
  user_agent TEXT DEFAULT NULL COMMENT 'User agent do navegador',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email (email),
  KEY idx_code (code),
  KEY idx_vendedor_id (vendedor_id),
  KEY idx_expires_at (expires_at),
  KEY idx_verified (verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Códigos OTP para autenticação de consultores';

-- Adicionar índice composto para buscar códigos válidos rapidamente
CREATE INDEX idx_email_code_valid ON otp_codes (email, code, verified, expires_at);

