-- =====================================================
-- Tabela: configuracoes
-- Descrição: Armazena configurações gerais do sistema
-- =====================================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS configuracoes (
  id int NOT NULL AUTO_INCREMENT,
  chave varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  valor text COLLATE utf8mb4_unicode_ci,
  descricao varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  tipo enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY chave (chave),
  KEY idx_chave (chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Inserir configurações padrão da empresa
-- =====================================================

-- Nome da Empresa
INSERT INTO configuracoes (chave, valor, descricao, tipo)
VALUES ('empresa_nome', '', 'Nome da empresa', 'string')
ON DUPLICATE KEY UPDATE 
  descricao = 'Nome da empresa',
  tipo = 'string';

-- Email da Empresa
INSERT INTO configuracoes (chave, valor, descricao, tipo)
VALUES ('empresa_email', '', 'Email da empresa', 'string')
ON DUPLICATE KEY UPDATE 
  descricao = 'Email da empresa',
  tipo = 'string';

-- Descrição da Empresa
INSERT INTO configuracoes (chave, valor, descricao, tipo)
VALUES ('empresa_descricao', '', 'Descrição da empresa', 'string')
ON DUPLICATE KEY UPDATE 
  descricao = 'Descrição da empresa',
  tipo = 'string';

-- Logotipo da Empresa
INSERT INTO configuracoes (chave, valor, descricao, tipo)
VALUES ('empresa_logotipo', '', 'URL do logotipo da empresa', 'string')
ON DUPLICATE KEY UPDATE 
  descricao = 'URL do logotipo da empresa',
  tipo = 'string';

-- Cor Principal da Empresa
INSERT INTO configuracoes (chave, valor, descricao, tipo)
VALUES ('empresa_cor_principal', '#3b82f6', 'Cor principal da empresa (hexadecimal)', 'string')
ON DUPLICATE KEY UPDATE 
  descricao = 'Cor principal da empresa (hexadecimal)',
  tipo = 'string';

-- =====================================================
-- Queries úteis
-- =====================================================

-- Buscar todas as configurações da empresa
-- SELECT * FROM configuracoes WHERE chave LIKE 'empresa_%';

-- Buscar uma configuração específica
-- SELECT valor FROM configuracoes WHERE chave = 'empresa_nome';

-- Atualizar uma configuração
-- UPDATE configuracoes SET valor = 'Novo Nome', updated_at = NOW() WHERE chave = 'empresa_nome';

-- Verificar se uma configuração existe
-- SELECT COUNT(*) as existe FROM configuracoes WHERE chave = 'empresa_nome';

