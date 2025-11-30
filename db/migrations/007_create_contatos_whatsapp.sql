-- =====================================================
-- Tabela: contatos_whatsapp
-- Descrição: Armazena contatos WhatsApp associados a vendedores e filiais
-- Data: 2024-11-30
-- =====================================================

CREATE TABLE IF NOT EXISTS contatos_whatsapp (
  id_contato VARCHAR(50) NOT NULL COMMENT 'ID único do contato (ex: sistema CRM) - Chave Primária',
  wpp_filial VARCHAR(20) NOT NULL COMMENT 'Telefone WhatsApp da filial (formato: 5527981920127)',
  wpp_contato VARCHAR(20) NOT NULL COMMENT 'Telefone WhatsApp do contato (formato: 5511989882867)',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contatos WhatsApp vinculados a vendedores e filiais';

-- =====================================================
-- Exemplo de INSERT
-- =====================================================

-- INSERT INTO contatos_whatsapp 
--   (id_contato, wpp_filial, wpp_contato, vendedor, vendedor_id, nome) 
-- VALUES 
--   ('65853', '5527981920127', '5511989882867', 'Gilmar ES OUTDOOR', 228, 'cezar freitas');

-- =====================================================
-- Queries úteis
-- =====================================================

-- Buscar contato por ID
-- SELECT * FROM contatos_whatsapp WHERE id_contato = '65853';

-- Buscar todos os contatos de um vendedor
-- SELECT * FROM contatos_whatsapp WHERE vendedor_id = 228 AND ativo = 1;

-- Buscar contato por telefone
-- SELECT * FROM contatos_whatsapp WHERE wpp_contato = '5511989882867';

-- Buscar contatos de uma filial
-- SELECT * FROM contatos_whatsapp WHERE wpp_filial = '5527981920127';

-- Contar contatos por vendedor
-- SELECT vendedor, COUNT(*) as total_contatos 
-- FROM contatos_whatsapp 
-- WHERE ativo = 1 
-- GROUP BY vendedor_id, vendedor;

-- Atualizar contato
-- UPDATE contatos_whatsapp 
-- SET nome = 'Novo Nome', observacoes = 'Observação atualizada' 
-- WHERE id_contato = '65853';

-- Desativar contato
-- UPDATE contatos_whatsapp SET ativo = 0 WHERE id_contato = '65853';

