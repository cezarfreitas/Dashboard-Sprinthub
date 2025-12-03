-- ============================================
-- DIAGNÓSTICO: Fila de Leads - Unidade 92
-- ============================================
-- Este script verifica o estado da fila de leads
-- da unidade 92 para identificar problemas

-- 1. Verificar configuração da unidade
SELECT 
  u.id,
  u.nome,
  u.name,
  u.ativo,
  u.dpto_gestao,
  u.fila_leads,
  JSON_LENGTH(u.fila_leads) as total_vendedores_fila,
  u.updated_at
FROM unidades u
WHERE u.id = 92;

-- 2. Extrair e verificar vendedores da fila
SELECT 
  JSON_EXTRACT(u.fila_leads, CONCAT('$[', idx, '].vendedor_id')) as vendedor_id,
  JSON_EXTRACT(u.fila_leads, CONCAT('$[', idx, '].sequencia')) as sequencia
FROM unidades u
CROSS JOIN (
  SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
  UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
) nums
WHERE u.id = 92 
  AND JSON_LENGTH(u.fila_leads) > idx;

-- 3. Verificar status dos vendedores na fila (ativos/inativos)
SELECT 
  v.id,
  CONCAT(v.name, ' ', v.lastName) as nome_completo,
  v.email,
  v.ativo,
  v.status,
  v.unidade_id,
  CASE 
    WHEN v.ativo = 1 THEN '✅ Ativo'
    ELSE '❌ Inativo'
  END as situacao
FROM vendedores v
WHERE v.id IN (
  -- IDs dos vendedores na fila da unidade 92
  SELECT DISTINCT JSON_EXTRACT(u.fila_leads, CONCAT('$[', idx, '].vendedor_id'))
  FROM unidades u
  CROSS JOIN (
    SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
  ) nums
  WHERE u.id = 92 
    AND JSON_LENGTH(u.fila_leads) > idx
)
ORDER BY v.ativo DESC, v.id;

-- 4. Verificar ausências ativas dos vendedores da fila
SELECT 
  va.id,
  va.vendedor_id,
  CONCAT(v.name, ' ', v.lastName) as vendedor_nome,
  va.data_inicio,
  va.data_fim,
  va.motivo,
  DATEDIFF(va.data_fim, NOW()) as dias_restantes,
  CASE 
    WHEN NOW() BETWEEN va.data_inicio AND va.data_fim THEN '🔴 Em Ausência'
    WHEN va.data_fim < NOW() THEN '✅ Ausência Finalizada'
    ELSE '⏰ Ausência Futura'
  END as status_ausencia
FROM vendedores_ausencias va
INNER JOIN vendedores v ON v.id = va.vendedor_id
WHERE va.unidade_id = 92
  AND va.vendedor_id IN (
    SELECT DISTINCT JSON_EXTRACT(u.fila_leads, CONCAT('$[', idx, '].vendedor_id'))
    FROM unidades u
    CROSS JOIN (
      SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
    ) nums
    WHERE u.id = 92 
      AND JSON_LENGTH(u.fila_leads) > idx
  )
ORDER BY va.data_inicio DESC;

-- 5. Histórico de distribuições da unidade 92
SELECT 
  fll.id,
  fll.vendedor_id,
  CONCAT(v.name, ' ', v.lastName) as vendedor_nome,
  fll.lead_id,
  fll.posicao_fila,
  fll.total_fila,
  fll.distribuido_em,
  DATE_FORMAT(fll.distribuido_em, '%d/%m/%Y %H:%i:%s') as data_formatada
FROM fila_leads_log fll
LEFT JOIN vendedores v ON v.id = fll.vendedor_id
WHERE fll.unidade_id = 92
ORDER BY fll.distribuido_em DESC
LIMIT 20;

-- 6. Resumo geral da situação
SELECT 
  'Total vendedores na fila' as metrica,
  JSON_LENGTH(u.fila_leads) as valor
FROM unidades u WHERE u.id = 92

UNION ALL

SELECT 
  'Vendedores ativos na fila' as metrica,
  COUNT(*) as valor
FROM vendedores v
WHERE v.ativo = 1
  AND v.id IN (
    SELECT DISTINCT JSON_EXTRACT(u.fila_leads, CONCAT('$[', idx, '].vendedor_id'))
    FROM unidades u
    CROSS JOIN (
      SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
    ) nums
    WHERE u.id = 92 
      AND JSON_LENGTH(u.fila_leads) > idx
  )

UNION ALL

SELECT 
  'Vendedores inativos na fila' as metrica,
  COUNT(*) as valor
FROM vendedores v
WHERE v.ativo = 0
  AND v.id IN (
    SELECT DISTINCT JSON_EXTRACT(u.fila_leads, CONCAT('$[', idx, '].vendedor_id'))
    FROM unidades u
    CROSS JOIN (
      SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
    ) nums
    WHERE u.id = 92 
      AND JSON_LENGTH(u.fila_leads) > idx
  )

UNION ALL

SELECT 
  'Vendedores em ausência agora' as metrica,
  COUNT(DISTINCT va.vendedor_id) as valor
FROM vendedores_ausencias va
WHERE va.unidade_id = 92
  AND NOW() BETWEEN va.data_inicio AND va.data_fim
  AND va.vendedor_id IN (
    SELECT DISTINCT JSON_EXTRACT(u.fila_leads, CONCAT('$[', idx, '].vendedor_id'))
    FROM unidades u
    CROSS JOIN (
      SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
    ) nums
    WHERE u.id = 92 
      AND JSON_LENGTH(u.fila_leads) > idx
  )

UNION ALL

SELECT 
  'Total distribuições (histórico)' as metrica,
  COUNT(*) as valor
FROM fila_leads_log
WHERE unidade_id = 92;








