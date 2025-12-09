-- ============================================
-- DIAGNÓSTICO E SOLUÇÃO RÁPIDA: Unidade 92
-- ============================================
-- Execute este arquivo inteiro de uma vez

-- PASSO 1: Ver o problema atual
SELECT '========== PROBLEMA ATUAL ==========' as '';

SELECT 
  u.id as unidade_id,
  u.nome as unidade_nome,
  u.ativo as unidade_ativa,
  CASE 
    WHEN u.fila_leads IS NULL THEN '❌ FILA NÃO CONFIGURADA (NULL)'
    WHEN JSON_LENGTH(u.fila_leads) = 0 THEN '❌ FILA VAZIA'
    ELSE CONCAT('⚠️ Fila com ', JSON_LENGTH(u.fila_leads), ' vendedores')
  END as status_fila,
  u.fila_leads as fila_atual
FROM unidades u
WHERE u.id = 92;

-- PASSO 2: Ver vendedores ATIVOS disponíveis na unidade 92
SELECT '========== VENDEDORES DISPONÍVEIS ==========' as '';

SELECT 
  v.id,
  CONCAT(v.name, ' ', v.lastName) as nome_completo,
  v.email,
  v.ativo,
  v.status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM vendedores_ausencias va 
      WHERE va.vendedor_id = v.id 
        AND va.unidade_id = 92
        AND NOW() BETWEEN va.data_inicio AND va.data_fim
    ) THEN '🔴 EM AUSÊNCIA'
    ELSE '✅ DISPONÍVEL AGORA'
  END as situacao
FROM vendedores v
WHERE v.unidade_id = 92 
  AND v.ativo = 1
ORDER BY v.id;

-- PASSO 3: Ver ausências ativas (se houver)
SELECT '========== AUSÊNCIAS ATIVAS ==========' as '';

SELECT 
  va.id as ausencia_id,
  va.vendedor_id,
  CONCAT(v.name, ' ', v.lastName) as vendedor,
  DATE_FORMAT(va.data_inicio, '%d/%m/%Y %H:%i') as inicio,
  DATE_FORMAT(va.data_fim, '%d/%m/%Y %H:%i') as fim,
  DATEDIFF(va.data_fim, NOW()) as dias_restantes,
  va.motivo
FROM vendedores_ausencias va
INNER JOIN vendedores v ON v.id = va.vendedor_id
WHERE va.unidade_id = 92
  AND NOW() BETWEEN va.data_inicio AND va.data_fim
ORDER BY va.data_fim;

-- PASSO 4: SOLUÇÃO AUTOMÁTICA
-- Copie e execute os comandos abaixo baseado no diagnóstico:

SELECT '========== COMANDOS PARA CORRIGIR ==========' as '';

-- A) Se a fila está NULL ou vazia, configure com vendedores ativos:
SELECT 
  CONCAT(
    'UPDATE unidades SET fila_leads = ''[',
    GROUP_CONCAT(
      CONCAT('{"vendedor_id":', v.id, ',"sequencia":', @row_num := @row_num + 1, '}')
      ORDER BY v.id
      SEPARATOR ','
    ),
    ']'' WHERE id = 92;'
  ) as 'SOLUÇÃO_A_Configure_Fila'
FROM vendedores v
CROSS JOIN (SELECT @row_num := 0) r
WHERE v.unidade_id = 92 
  AND v.ativo = 1
  AND NOT EXISTS (
    SELECT 1 FROM vendedores_ausencias va 
    WHERE va.vendedor_id = v.id 
      AND va.unidade_id = 92
      AND NOW() BETWEEN va.data_inicio AND va.data_fim
  )
LIMIT 10;

-- B) Se todos os vendedores estão em ausência, remova as ausências:
SELECT 
  GROUP_CONCAT(
    CONCAT('DELETE FROM vendedores_ausencias WHERE id = ', va.id, ';')
    SEPARATOR '\n'
  ) as 'SOLUÇÃO_B_Remover_Ausencias'
FROM vendedores_ausencias va
WHERE va.unidade_id = 92
  AND NOW() BETWEEN va.data_inicio AND va.data_fim;

-- C) Se há vendedores inativos na fila, ative-os:
SELECT 
  GROUP_CONCAT(
    CONCAT('UPDATE vendedores SET ativo = 1 WHERE id = ', v.id, '; -- ', v.name)
    SEPARATOR '\n'
  ) as 'SOLUÇÃO_C_Ativar_Vendedores'
FROM vendedores v
WHERE v.unidade_id = 92 
  AND v.ativo = 0;

-- INSTRUÇÕES:
-- 1. Execute este script completo
-- 2. Veja qual "SOLUÇÃO_X" retornou um comando SQL
-- 3. Copie e execute o comando SQL retornado
-- 4. Teste a API novamente: curl -X POST 'localhost:3000/api/filav2' -H 'Content-Type: application/json' -d '{"unidade":"92","idlead":"65204"}'


















