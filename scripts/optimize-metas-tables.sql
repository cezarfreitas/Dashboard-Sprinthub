-- Script para otimizar as tabelas de metas
-- Remove tabelas desnecessárias e otimiza a estrutura

-- 1. VERIFICAR QUAIS TABELAS EXISTEM ANTES DE FAZER QUALQUER ALTERAÇÃO
SELECT 
  'ANTES DA OTIMIZAÇÃO' as status,
  TABLE_NAME as tabela,
  TABLE_ROWS as registros
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE '%meta%'
ORDER BY TABLE_NAME;

-- 2. REMOVER TABELA metas_config SE ESTIVER VAZIA E NÃO FOR USADA
-- (Descomente a linha abaixo apenas se confirmar que não é necessária)
-- DROP TABLE IF EXISTS metas_config;

-- 3. REMOVER TABELA metas_historico SE ESTIVER VAZIA E NÃO FOR USADA
-- (Descomente a linha abaixo apenas se confirmar que não é necessária)
-- DROP TABLE IF EXISTS metas_historico;

-- 4. OTIMIZAR TABELA metas_mensais - ESTRUTURA RECOMENDADA
-- Verificar se precisa de ajustes na estrutura atual

-- Verificar se as colunas essenciais existem
SELECT 
  'VERIFICAÇÃO metas_mensais' as status,
  CASE 
    WHEN COUNT(*) = 0 THEN 'ERRO - Tabela não existe'
    ELSE 'OK - Tabela existe'
  END as resultado
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'metas_mensais';

-- Verificar colunas existentes
SELECT 
  'COLUNAS metas_mensais' as status,
  COLUMN_NAME as coluna,
  DATA_TYPE as tipo,
  IS_NULLABLE as nullable,
  COLUMN_DEFAULT as padrao
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'metas_mensais'
ORDER BY ORDINAL_POSITION;

-- 5. CRIAR ESTRUTURA OTIMIZADA (apenas se necessário)
-- Esta estrutura contém apenas o essencial para o funcionamento

CREATE TABLE IF NOT EXISTS metas_mensais_optimized (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  unidade_id INT NOT NULL,
  mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INT NOT NULL CHECK (ano >= 2020 AND ano <= 2030),
  meta_valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  meta_descricao VARCHAR(500) NULL,
  status ENUM('ativa', 'pausada', 'cancelada') DEFAULT 'ativa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices otimizados
  INDEX idx_vendedor_unidade_mes_ano (vendedor_id, unidade_id, mes, ano),
  INDEX idx_status (status),
  INDEX idx_mes_ano (mes, ano),
  
  -- Constraint única para evitar duplicatas
  UNIQUE KEY unique_vendedor_unidade_mes_ano (vendedor_id, unidade_id, mes, ano),
  
  -- Foreign keys (se as tabelas referenciadas existirem)
  CONSTRAINT fk_metas_vendedor 
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT fk_metas_unidade 
    FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
    ON DELETE CASCADE ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. MIGRAR DADOS DA TABELA ANTIGA PARA A NOVA (se necessário)
-- INSERT INTO metas_mensais_optimized 
-- SELECT * FROM metas_mensais;

-- 7. RENOMEAR TABELAS (fazer backup antes!)
-- RENAME TABLE metas_mensais TO metas_mensais_backup;
-- RENAME TABLE metas_mensais_optimized TO metas_mensais;

-- 8. VERIFICAR RESULTADO FINAL
SELECT 
  'APÓS OTIMIZAÇÃO' as status,
  TABLE_NAME as tabela,
  TABLE_ROWS as registros
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE '%meta%'
ORDER BY TABLE_NAME;

-- 9. TESTAR FUNCIONAMENTO
SELECT 
  'TESTE DE FUNCIONAMENTO' as status,
  COUNT(*) as total_metas,
  COUNT(DISTINCT vendedor_id) as vendedores,
  COUNT(DISTINCT unidade_id) as unidades,
  SUM(meta_valor) as valor_total
FROM metas_mensais
WHERE status = 'ativa';

-- 10. LIMPEZA (executar apenas se tudo estiver funcionando)
-- DROP TABLE IF EXISTS metas_mensais_backup;
-- DROP TABLE IF EXISTS metas_mensais_optimized;
