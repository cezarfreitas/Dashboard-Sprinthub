-- =====================================================
-- Script para criar tabela contatos_whatsapp
-- Execute este script no seu banco MySQL
-- =====================================================

USE dash_inteli;

-- Criar tabela
CREATE TABLE IF NOT EXISTS contatos_whatsapp (
  id_contato VARCHAR(50) NOT NULL COMMENT 'ID único do contato - Chave Primária',
  wpp_filial VARCHAR(20) NOT NULL COMMENT 'Telefone WhatsApp da filial',
  wpp_contato VARCHAR(20) NOT NULL COMMENT 'Telefone WhatsApp do contato',
  vendedor VARCHAR(255) NOT NULL COMMENT 'Nome completo do vendedor',
  vendedor_id INT NOT NULL COMMENT 'ID do vendedor na tabela vendedores',
  nome VARCHAR(255) NOT NULL COMMENT 'Nome do contato',
  ativo TINYINT(1) DEFAULT 1 COMMENT 'Contato ativo (1) ou inativo (0)',
  observacoes TEXT DEFAULT NULL COMMENT 'Observações sobre o contato',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id_contato),
  KEY idx_vendedor_id (vendedor_id),
  KEY idx_wpp_filial (wpp_filial),
  KEY idx_wpp_contato (wpp_contato),
  KEY idx_nome (nome),
  KEY idx_ativo (ativo),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Contatos WhatsApp vinculados a vendedores e filiais';

-- Verificar se foi criada
SELECT 'Tabela criada com sucesso!' as status;

-- Mostrar estrutura
DESCRIBE contatos_whatsapp;

