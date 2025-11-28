-- ============================================
-- NORMALIZAÇÃO: Converter 'id' para 'vendedor_id' em todas as filas
-- ============================================
-- Este script corrige o formato das filas para o padrão esperado pela API

-- PASSO 1: Ver quantas unidades precisam de correção
SELECT 
  '========== UNIDADES QUE PRECISAM DE NORMALIZAÇÃO ==========' as '';

SELECT 
  u.id as unidade_id,
  u.nome,
  JSON_LENGTH(u.fila_leads) as total_na_fila,
  CASE 
    WHEN u.fila_leads LIKE '%"vendedor_id"%' THEN '✅ Formato correto (vendedor_id)'
    WHEN u.fila_leads LIKE '%"id"%' THEN '⚠️ Formato antigo (id) - PRECISA CORREÇÃO'
    ELSE '❓ Formato desconhecido'
  END as status_formato,
  u.fila_leads as conteudo_atual
FROM unidades u
WHERE u.fila_leads IS NOT NULL 
  AND JSON_LENGTH(u.fila_leads) > 0
ORDER BY u.id;

-- PASSO 2: Backup das filas atuais (IMPORTANTE!)
CREATE TABLE IF NOT EXISTS unidades_fila_backup (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unidade_id INT NOT NULL,
  fila_leads_original JSON,
  data_backup TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unidade (unidade_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fazer backup
INSERT INTO unidades_fila_backup (unidade_id, fila_leads_original)
SELECT id, fila_leads 
FROM unidades 
WHERE fila_leads IS NOT NULL 
  AND JSON_LENGTH(fila_leads) > 0;

SELECT CONCAT('✅ Backup criado: ', COUNT(*), ' unidades salvas') as resultado
FROM unidades_fila_backup 
WHERE DATE(data_backup) = CURDATE();

-- PASSO 3: Normalizar as filas (converter 'id' para 'vendedor_id')
-- Esta query atualiza automaticamente todas as filas

UPDATE unidades u
SET fila_leads = (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'vendedor_id', COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(item.valor, '$.vendedor_id')),
        JSON_UNQUOTE(JSON_EXTRACT(item.valor, '$.id'))
      ),
      'sequencia', JSON_UNQUOTE(JSON_EXTRACT(item.valor, '$.sequencia'))
    )
  )
  FROM (
    SELECT 
      JSON_EXTRACT(u.fila_leads, CONCAT('$[', nums.idx, ']')) as valor
    FROM (
      SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
      UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
      UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
    ) nums
    WHERE JSON_LENGTH(u.fila_leads) > nums.idx
  ) item
)
WHERE u.fila_leads IS NOT NULL 
  AND JSON_LENGTH(u.fila_leads) > 0
  AND (
    u.fila_leads LIKE '%"id"%' 
    OR NOT u.fila_leads LIKE '%"vendedor_id"%'
  );

-- PASSO 4: Verificar resultado da normalização
SELECT 
  '========== RESULTADO DA NORMALIZAÇÃO ==========' as '';

SELECT 
  u.id as unidade_id,
  u.nome,
  JSON_LENGTH(u.fila_leads) as total_na_fila,
  CASE 
    WHEN u.fila_leads LIKE '%"vendedor_id"%' THEN '✅ Normalizado com sucesso'
    ELSE '❌ Ainda precisa correção manual'
  END as status,
  u.fila_leads as fila_normalizada
FROM unidades u
WHERE u.fila_leads IS NOT NULL 
  AND JSON_LENGTH(u.fila_leads) > 0
ORDER BY u.id;

-- PASSO 5: Validar que todos os vendedor_id existem
SELECT 
  '========== VALIDAÇÃO: Vendedores que não existem ==========' as '';

SELECT 
  u.id as unidade_id,
  u.nome as unidade,
  JSON_UNQUOTE(JSON_EXTRACT(item.valor, '$.vendedor_id')) as vendedor_id,
  JSON_UNQUOTE(JSON_EXTRACT(item.valor, '$.sequencia')) as sequencia,
  '❌ VENDEDOR NÃO EXISTE NO BANCO' as problema
FROM unidades u
CROSS JOIN (
  SELECT 
    JSON_EXTRACT(u2.fila_leads, CONCAT('$[', nums.idx, ']')) as valor
  FROM unidades u2
  CROSS JOIN (
    SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
  ) nums
  WHERE u2.fila_leads IS NOT NULL 
    AND JSON_LENGTH(u2.fila_leads) > nums.idx
    AND u2.id = u.id
) item
WHERE u.fila_leads IS NOT NULL 
  AND JSON_LENGTH(u.fila_leads) > 0
  AND NOT EXISTS (
    SELECT 1 FROM vendedores v 
    WHERE v.id = JSON_UNQUOTE(JSON_EXTRACT(item.valor, '$.vendedor_id'))
  );

-- PASSO 6: Resumo final
SELECT 
  '========== RESUMO FINAL ==========' as '';

SELECT 
  'Total de unidades com fila' as metrica,
  COUNT(*) as quantidade
FROM unidades 
WHERE fila_leads IS NOT NULL 
  AND JSON_LENGTH(fila_leads) > 0

UNION ALL

SELECT 
  'Unidades normalizadas (vendedor_id)' as metrica,
  COUNT(*) as quantidade
FROM unidades 
WHERE fila_leads IS NOT NULL 
  AND JSON_LENGTH(fila_leads) > 0
  AND fila_leads LIKE '%"vendedor_id"%'

UNION ALL

SELECT 
  'Backups criados hoje' as metrica,
  COUNT(*) as quantidade
FROM unidades_fila_backup 
WHERE DATE(data_backup) = CURDATE();

-- INSTRUÇÕES DE USO:
-- 1. Execute este script completo de uma vez
-- 2. Verifique os resultados em cada PASSO
-- 3. Se algo der errado, restaure do backup:
--    UPDATE unidades u 
--    INNER JOIN unidades_fila_backup b ON b.unidade_id = u.id
--    SET u.fila_leads = b.fila_leads_original
--    WHERE DATE(b.data_backup) = CURDATE();



