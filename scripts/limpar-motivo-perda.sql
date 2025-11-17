-- Script para limpar o campo loss_reason, removendo "Motivo " e deixando apenas o ID numérico
-- Executar este script para corrigir os dados existentes no banco

-- Atualizar loss_reason removendo "Motivo " do início e deixando apenas o número
UPDATE oportunidades 
SET loss_reason = TRIM(REPLACE(loss_reason, 'Motivo ', ''))
WHERE loss_reason LIKE 'Motivo %'
  AND loss_reason REGEXP '^Motivo [0-9]+$';

-- Verificar quantos registros foram atualizados
SELECT 
  COUNT(*) as total_atualizados,
  'Registros com "Motivo " removido' as descricao
FROM oportunidades 
WHERE loss_reason REGEXP '^[0-9]+$'
  AND loss_reason IS NOT NULL;

-- Mostrar alguns exemplos dos dados corrigidos
SELECT 
  id,
  title,
  loss_reason,
  status
FROM oportunidades 
WHERE loss_reason REGEXP '^[0-9]+$'
  AND status = 'lost'
LIMIT 10;

