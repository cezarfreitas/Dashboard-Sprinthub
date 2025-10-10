-- Script para analisar as tabelas de metas
-- Execute este script para verificar estrutura e uso das tabelas

-- 1. Verificar quais tabelas de metas existem
SELECT 
  'TABELAS EXISTENTES' as analise,
  TABLE_NAME as tabela,
  TABLE_ROWS as registros,
  CREATE_TIME as criada_em
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE '%meta%'
ORDER BY TABLE_NAME;

-- 2. Estrutura da tabela metas_mensais (se existir)
SELECT 
  'ESTRUTURA metas_mensais' as analise,
  COLUMN_NAME as coluna,
  DATA_TYPE as tipo,
  IS_NULLABLE as nullable,
  COLUMN_DEFAULT as padrao,
  EXTRA as extra,
  COLUMN_KEY as chave
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'metas_mensais'
ORDER BY ORDINAL_POSITION;

-- 3. Estrutura da tabela metas_historico (se existir)
SELECT 
  'ESTRUTURA metas_historico' as analise,
  COLUMN_NAME as coluna,
  DATA_TYPE as tipo,
  IS_NULLABLE as nullable,
  COLUMN_DEFAULT as padrao,
  EXTRA as extra,
  COLUMN_KEY as chave
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'metas_historico'
ORDER BY ORDINAL_POSITION;

-- 4. Estrutura da tabela metas_config (se existir)
SELECT 
  'ESTRUTURA metas_config' as analise,
  COLUMN_NAME as coluna,
  DATA_TYPE as tipo,
  IS_NULLABLE as nullable,
  COLUMN_DEFAULT as padrao,
  EXTRA as extra,
  COLUMN_KEY as chave
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'metas_config'
ORDER BY ORDINAL_POSITION;

-- 5. Verificar uso da tabela metas_mensais
SELECT 
  'USO metas_mensais' as analise,
  COUNT(*) as total_metas,
  COUNT(DISTINCT vendedor_id) as vendedores_com_meta,
  COUNT(DISTINCT unidade_id) as unidades_com_meta,
  COUNT(CASE WHEN status = 'ativa' THEN 1 END) as metas_ativas,
  COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as metas_canceladas,
  MIN(created_at) as primeira_meta,
  MAX(created_at) as ultima_meta,
  SUM(meta_valor) as valor_total_metas
FROM metas_mensais;

-- 6. Verificar uso da tabela metas_historico
SELECT 
  'USO metas_historico' as analise,
  COUNT(*) as total_registros,
  COUNT(DISTINCT meta_id) as metas_com_historico,
  COUNT(DISTINCT acao) as tipos_acao,
  GROUP_CONCAT(DISTINCT acao) as acoes_realizadas,
  MIN(created_at) as primeiro_registro,
  MAX(created_at) as ultimo_registro
FROM metas_historico;

-- 7. Verificar uso da tabela metas_config (se existir)
SELECT 
  'USO metas_config' as analise,
  COUNT(*) as total_configs,
  MIN(created_at) as primeira_config,
  MAX(created_at) as ultima_config
FROM metas_config;

-- 8. Verificar relacionamentos (Foreign Keys)
SELECT 
  'RELACIONAMENTOS' as analise,
  TABLE_NAME as tabela,
  COLUMN_NAME as coluna,
  CONSTRAINT_NAME as constraint,
  REFERENCED_TABLE_NAME as tabela_referenciada,
  REFERENCED_COLUMN_NAME as coluna_referenciada
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND REFERENCED_TABLE_NAME IS NOT NULL
AND TABLE_NAME LIKE '%meta%';

-- 9. Verificar índices
SHOW INDEX FROM metas_mensais;
SHOW INDEX FROM metas_historico;
SHOW INDEX FROM metas_config;

-- 10. Recomendações
SELECT 
  'RECOMENDAÇÕES' as tipo,
  'metas_mensais' as tabela,
  'OK - Tabela principal, manter' as recomendacao
UNION ALL
SELECT 
  'RECOMENDAÇÕES',
  'metas_historico',
  CASE 
    WHEN (SELECT COUNT(*) FROM metas_historico) = 0 
    THEN 'CONSIDERAR REMOÇÃO - Tabela vazia, não está sendo usada'
    ELSE 'OK - Tabela com dados, manter para auditoria'
  END
UNION ALL
SELECT 
  'RECOMENDAÇÕES',
  'metas_config',
  CASE 
    WHEN (SELECT COUNT(*) FROM metas_config) = 0 
    THEN 'CONSIDERAR REMOÇÃO - Tabela vazia, não está sendo usada'
    ELSE 'OK - Tabela com dados, manter'
  END;
