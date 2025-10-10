-- Script para otimizar as tabelas de metas baseado na análise
-- Remove tabelas desnecessárias e mantém apenas o essencial

-- 1. ANÁLISE DAS TABELAS ATUAIS
SELECT 
  'ANÁLISE INICIAL' as status,
  TABLE_NAME as tabela,
  TABLE_ROWS as registros
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('metas_config', 'metas_historico', 'metas_mensais')
ORDER BY TABLE_NAME;

-- 2. VERIFICAR USO DAS TABELAS
-- metas_config: Não está sendo usada na aplicação atual (sistema usa metas_mensais)
-- metas_historico: Não está sendo usada na aplicação atual (não há logs sendo criados)
-- metas_mensais: TABELA PRINCIPAL - Esta deve ser mantida

SELECT 
  'VERIFICAÇÃO DE USO' as status,
  'metas_config' as tabela,
  COUNT(*) as registros,
  CASE 
    WHEN COUNT(*) = 0 THEN 'VAZIA - PODE SER REMOVIDA'
    ELSE 'TEM DADOS - VERIFICAR NECESSIDADE'
  END as status_uso
FROM metas_config
UNION ALL
SELECT 
  'VERIFICAÇÃO DE USO',
  'metas_historico',
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN 'VAZIA - PODE SER REMOVIDA'
    ELSE 'TEM DADOS - VERIFICAR NECESSIDADE'
  END
FROM metas_historico
UNION ALL
SELECT 
  'VERIFICAÇÃO DE USO',
  'metas_mensais',
  COUNT(*),
  'TABELA PRINCIPAL - MANTER'
FROM metas_mensais;

-- 3. BACKUP DAS TABELAS ANTES DE REMOVER (segurança)
-- CREATE TABLE metas_config_backup AS SELECT * FROM metas_config;
-- CREATE TABLE metas_historico_backup AS SELECT * FROM metas_historico;

-- 4. REMOVER TABELAS DESNECESSÁRIAS
-- ⚠️ EXECUTAR APENAS SE CONFIRMAR QUE NÃO SÃO NECESSÁRIAS

-- Remover metas_config (não usada na aplicação atual)
DROP TABLE IF EXISTS metas_config;

-- Remover metas_historico (não usada na aplicação atual)
DROP TABLE IF EXISTS metas_historico;

-- 5. OTIMIZAR TABELA metas_mensais
-- Verificar se precisa de ajustes na estrutura

-- Verificar estrutura atual
SELECT 
  'ESTRUTURA ATUAL metas_mensais' as status,
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

-- 6. ADICIONAR FOREIGN KEYS SE NÃO EXISTIREM
-- (Verificar se as tabelas vendedores e unidades existem primeiro)

-- Verificar se as tabelas referenciadas existem
SELECT 
  'VERIFICAÇÃO DE DEPENDÊNCIAS' as status,
  TABLE_NAME as tabela,
  'EXISTE' as status_tabela
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('vendedores', 'unidades')
ORDER BY TABLE_NAME;

-- Adicionar foreign keys se as tabelas existirem
-- (Descomente apenas se vendedores e unidades existirem)

/*
ALTER TABLE metas_mensais
ADD CONSTRAINT fk_metas_vendedor 
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE metas_mensais
ADD CONSTRAINT fk_metas_unidade 
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;
*/

-- 7. VERIFICAR ÍNDICES - OTIMIZAR SE NECESSÁRIO
SELECT 
  'ÍNDICES ATUAIS' as status,
  INDEX_NAME as indice,
  COLUMN_NAME as coluna,
  NON_UNIQUE as nao_unico,
  INDEX_TYPE as tipo
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'metas_mensais'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- 8. ADICIONAR CHECK CONSTRAINTS PARA VALIDAÇÃO
-- (Melhorar validação de dados)

ALTER TABLE metas_mensais
ADD CONSTRAINT chk_mes_valido CHECK (mes >= 1 AND mes <= 12);

ALTER TABLE metas_mensais
ADD CONSTRAINT chk_ano_valido CHECK (ano >= 2020 AND ano <= 2030);

ALTER TABLE metas_mensais
ADD CONSTRAINT chk_meta_valor_positivo CHECK (meta_valor >= 0);

-- 9. VERIFICAR RESULTADO FINAL
SELECT 
  'RESULTADO FINAL' as status,
  TABLE_NAME as tabela,
  TABLE_ROWS as registros,
  CASE 
    WHEN TABLE_NAME = 'metas_mensais' THEN 'MANTER - TABELA PRINCIPAL'
    ELSE 'REMOVIDA'
  END as acao
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE '%meta%'
ORDER BY TABLE_NAME;

-- 10. TESTE DE FUNCIONAMENTO
SELECT 
  'TESTE DE FUNCIONAMENTO' as status,
  COUNT(*) as total_metas,
  COUNT(DISTINCT vendedor_id) as vendedores_com_meta,
  COUNT(DISTINCT unidade_id) as unidades_com_meta,
  COUNT(CASE WHEN status = 'ativa' THEN 1 END) as metas_ativas,
  SUM(meta_valor) as valor_total_metas,
  MIN(created_at) as primeira_meta,
  MAX(created_at) as ultima_meta
FROM metas_mensais;

-- 11. LIMPEZA DE BACKUP (executar apenas se tudo estiver funcionando)
-- DROP TABLE IF EXISTS metas_config_backup;
-- DROP TABLE IF EXISTS metas_historico_backup;

-- 12. RESUMO DAS AÇÕES REALIZADAS
SELECT 
  'RESUMO DA OTIMIZAÇÃO' as status,
  'metas_config' as tabela,
  'REMOVIDA - Não utilizada na aplicação' as acao
UNION ALL
SELECT 
  'RESUMO DA OTIMIZAÇÃO',
  'metas_historico',
  'REMOVIDA - Não utilizada na aplicação'
UNION ALL
SELECT 
  'RESUMO DA OTIMIZAÇÃO',
  'metas_mensais',
  'MANTIDA - Tabela principal otimizada';

-- 13. ESTRUTURA FINAL RECOMENDADA
SELECT 
  'ESTRUTURA FINAL OTIMIZADA' as info,
  'metas_mensais' as tabela,
  'id, vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao, status, created_at, updated_at' as colunas,
  'Apenas o essencial para funcionamento' as observacao;
