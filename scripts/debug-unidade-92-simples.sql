-- ============================================
-- DEBUG RÁPIDO: Unidade 92
-- ============================================
-- Execute este script para ver exatamente o que está errado

-- 1. VERIFICAR SE A FILA ESTÁ CONFIGURADA
SELECT 
  'CONFIGURAÇÃO DA FILA' as tipo,
  u.id,
  u.nome,
  u.ativo as unidade_ativa,
  u.fila_leads,
  CASE 
    WHEN u.fila_leads IS NULL THEN '❌ FILA NÃO CONFIGURADA (NULL)'
    WHEN JSON_LENGTH(u.fila_leads) = 0 THEN '❌ FILA VAZIA (sem vendedores)'
    ELSE CONCAT('✅ Fila com ', JSON_LENGTH(u.fila_leads), ' vendedores')
  END as status_fila
FROM unidades u
WHERE u.id = 92;

-- 2. SE HOUVER FILA, MOSTRAR OS VENDEDORES
SELECT 
  'VENDEDORES NA FILA' as tipo,
  JSON_UNQUOTE(JSON_EXTRACT(u.fila_leads, CONCAT('$[', nums.idx, '].vendedor_id'))) as vendedor_id,
  JSON_UNQUOTE(JSON_EXTRACT(u.fila_leads, CONCAT('$[', nums.idx, '].sequencia'))) as sequencia,
  v.name as nome_vendedor,
  v.ativo as vendedor_ativo,
  v.status,
  CASE 
    WHEN v.id IS NULL THEN '❌ VENDEDOR NÃO EXISTE'
    WHEN v.ativo = 0 THEN '❌ VENDEDOR INATIVO'
    WHEN EXISTS (
      SELECT 1 FROM vendedores_ausencias va 
      WHERE va.vendedor_id = v.id 
        AND va.unidade_id = 92
        AND NOW() BETWEEN va.data_inicio AND va.data_fim
    ) THEN '🔴 EM AUSÊNCIA'
    ELSE '✅ DISPONÍVEL'
  END as situacao
FROM unidades u
CROSS JOIN (
  SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
  UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
) nums
LEFT JOIN vendedores v ON v.id = JSON_UNQUOTE(JSON_EXTRACT(u.fila_leads, CONCAT('$[', nums.idx, '].vendedor_id')))
WHERE u.id = 92 
  AND JSON_LENGTH(u.fila_leads) > nums.idx
ORDER BY nums.idx;

-- 3. AUSÊNCIAS ATIVAS
SELECT 
  'AUSÊNCIAS ATIVAS' as tipo,
  va.vendedor_id,
  v.name as nome_vendedor,
  va.data_inicio,
  va.data_fim,
  va.motivo,
  DATEDIFF(va.data_fim, NOW()) as dias_restantes
FROM vendedores_ausencias va
INNER JOIN vendedores v ON v.id = va.vendedor_id
WHERE va.unidade_id = 92
  AND NOW() BETWEEN va.data_inicio AND va.data_fim
ORDER BY va.data_fim;

-- 4. RESUMO DO PROBLEMA
SELECT 
  'DIAGNÓSTICO' as resultado,
  CASE 
    WHEN (SELECT u.fila_leads FROM unidades u WHERE u.id = 92) IS NULL 
      THEN '❌ PROBLEMA: Fila não configurada. Acesse /unidades/fila para configurar.'
    
    WHEN (SELECT JSON_LENGTH(u.fila_leads) FROM unidades u WHERE u.id = 92) = 0 
      THEN '❌ PROBLEMA: Fila vazia (sem vendedores). Adicione vendedores em /unidades/fila.'
    
    WHEN (
      SELECT COUNT(*) 
      FROM unidades u
      CROSS JOIN (
        SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
      ) nums
      INNER JOIN vendedores v ON v.id = JSON_UNQUOTE(JSON_EXTRACT(u.fila_leads, CONCAT('$[', nums.idx, '].vendedor_id')))
      WHERE u.id = 92 
        AND JSON_LENGTH(u.fila_leads) > nums.idx
        AND v.ativo = 1
        AND NOT EXISTS (
          SELECT 1 FROM vendedores_ausencias va 
          WHERE va.vendedor_id = v.id 
            AND va.unidade_id = 92
            AND NOW() BETWEEN va.data_inicio AND va.data_fim
        )
    ) = 0
      THEN '❌ PROBLEMA: Todos os vendedores da fila estão INATIVOS ou EM AUSÊNCIA. Ative vendedores ou remova ausências.'
    
    ELSE '✅ Há vendedores disponíveis. O erro pode ser temporário ou de configuração da API.'
  END as diagnostico;








