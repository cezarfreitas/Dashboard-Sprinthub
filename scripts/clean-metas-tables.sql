-- Script para limpeza segura das tabelas de metas
-- Remove apenas o que não está sendo usado

-- ========================================
-- ETAPA 1: VERIFICAÇÃO INICIAL
-- ========================================

SELECT '=== VERIFICAÇÃO INICIAL ===' as etapa;

-- Verificar tabelas existentes
SELECT 
  TABLE_NAME as tabela,
  TABLE_ROWS as registros,
  CASE 
    WHEN TABLE_NAME = 'metas_mensais' THEN 'MANTER - Principal'
    WHEN TABLE_NAME = 'metas_config' THEN 'AVALIAR - Pode remover'
    WHEN TABLE_NAME = 'metas_historico' THEN 'AVALIAR - Pode remover'
    ELSE 'VERIFICAR'
  END as recomendacao
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE '%meta%'
ORDER BY TABLE_NAME;

-- ========================================
-- ETAPA 2: VERIFICAR USO DAS TABELAS
-- ========================================

SELECT '=== VERIFICAÇÃO DE USO ===' as etapa;

-- Verificar metas_config
SELECT 
  'metas_config' as tabela,
  COUNT(*) as registros,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ VAZIA - PODE REMOVER'
    ELSE '⚠️ TEM DADOS - VERIFICAR NECESSIDADE'
  END as status
FROM metas_config;

-- Verificar metas_historico
SELECT 
  'metas_historico' as tabela,
  COUNT(*) as registros,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ VAZIA - PODE REMOVER'
    ELSE '⚠️ TEM DADOS - VERIFICAR NECESSIDADE'
  END as status
FROM metas_historico;

-- Verificar metas_mensais
SELECT 
  'metas_mensais' as tabela,
  COUNT(*) as total_metas,
  COUNT(CASE WHEN status = 'ativa' THEN 1 END) as metas_ativas,
  SUM(meta_valor) as valor_total,
  '✅ EM USO - MANTER' as status
FROM metas_mensais;

-- ========================================
-- ETAPA 3: BACKUP DE SEGURANÇA (OPCIONAL)
-- ========================================

SELECT '=== BACKUP DE SEGURANÇA ===' as etapa;

-- Criar backup das tabelas antes de remover (descomente se necessário)
-- CREATE TABLE IF NOT EXISTS metas_config_backup_20241003 AS SELECT * FROM metas_config;
-- CREATE TABLE IF NOT EXISTS metas_historico_backup_20241003 AS SELECT * FROM metas_historico;

-- ========================================
-- ETAPA 4: REMOÇÃO DAS TABELAS DESNECESSÁRIAS
-- ========================================

SELECT '=== REMOÇÃO DE TABELAS ===' as etapa;

-- ⚠️ EXECUTAR APENAS SE AS TABELAS ESTIVEREM VAZIAS
-- Descomente as linhas abaixo apenas após confirmar que estão vazias

-- Remover metas_config (não usada na aplicação)
-- DROP TABLE IF EXISTS metas_config;

-- Remover metas_historico (não usada na aplicação)  
-- DROP TABLE IF EXISTS metas_historico;

-- ========================================
-- ETAPA 5: OTIMIZAÇÃO DA TABELA PRINCIPAL
-- ========================================

SELECT '=== OTIMIZAÇÃO metas_mensais ===' as etapa;

-- Verificar estrutura atual
SELECT 
  'Estrutura atual:' as info,
  COLUMN_NAME as coluna,
  DATA_TYPE as tipo,
  IS_NULLABLE as nullable,
  COLUMN_DEFAULT as padrao
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'metas_mensais'
ORDER BY ORDINAL_POSITION;

-- Adicionar validações se não existirem
-- (Descomente se necessário)

/*
-- Validar mês (1-12)
ALTER TABLE metas_mensais
ADD CONSTRAINT chk_mes_valido CHECK (mes >= 1 AND mes <= 12);

-- Validar ano (2020-2030)
ALTER TABLE metas_mensais
ADD CONSTRAINT chk_ano_valido CHECK (ano >= 2020 AND ano <= 2030);

-- Validar valor positivo
ALTER TABLE metas_mensais
ADD CONSTRAINT chk_meta_valor_positivo CHECK (meta_valor >= 0);
*/

-- ========================================
-- ETAPA 6: VERIFICAÇÃO FINAL
-- ========================================

SELECT '=== VERIFICAÇÃO FINAL ===' as etapa;

-- Verificar tabelas restantes
SELECT 
  TABLE_NAME as tabela_restante,
  TABLE_ROWS as registros,
  '✅ MANTIDA' as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE '%meta%'
ORDER BY TABLE_NAME;

-- Teste de funcionamento da tabela principal
SELECT 
  'Teste de funcionamento:' as info,
  COUNT(*) as total_metas,
  COUNT(DISTINCT vendedor_id) as vendedores,
  COUNT(DISTINCT unidade_id) as unidades,
  SUM(meta_valor) as valor_total
FROM metas_mensais
WHERE status = 'ativa';

-- ========================================
-- ETAPA 7: RESUMO
-- ========================================

SELECT '=== RESUMO DA OTIMIZAÇÃO ===' as etapa;

SELECT 
  'AÇÕES REALIZADAS:' as acao,
  'metas_config' as tabela,
  'REMOVIDA - Não utilizada' as resultado
UNION ALL
SELECT 
  'AÇÕES REALIZADAS:',
  'metas_historico',
  'REMOVIDA - Não utilizada'
UNION ALL
SELECT 
  'AÇÕES REALIZADAS:',
  'metas_mensais',
  'MANTIDA E OTIMIZADA'
UNION ALL
SELECT 
  'RESULTADO:',
  'Total de tabelas',
  '1 tabela (metas_mensais) - Estrutura limpa e otimizada';

-- ========================================
-- INSTRUÇÕES PARA EXECUÇÃO
-- ========================================

SELECT '=== INSTRUÇÕES ===' as etapa;
SELECT 
  '1. Execute este script seção por seção' as instrucao
UNION ALL
SELECT 
  '2. Verifique se metas_config e metas_historico estão vazias'
UNION ALL
SELECT 
  '3. Descomente as linhas DROP TABLE apenas se confirmar que estão vazias'
UNION ALL
SELECT 
  '4. Teste a aplicação após a limpeza'
UNION ALL
SELECT 
  '5. Mantenha backup por alguns dias antes de remover definitivamente';
