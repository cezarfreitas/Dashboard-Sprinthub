-- Script para adicionar coluna de motivo de perda na tabela oportunidades

-- 1. Verificar se a coluna já existe
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'oportunidades'
AND COLUMN_NAME = 'lost_reason';

-- 2. Adicionar coluna de motivo de perda se não existir
ALTER TABLE oportunidades
ADD COLUMN lost_reason VARCHAR(255) NULL,
ADD INDEX idx_lost_reason (lost_reason);

-- 3. Verificar se a coluna foi criada
DESCRIBE oportunidades;

-- 4. Atualizar algumas oportunidades perdidas com motivos de exemplo (opcional)
-- UPDATE oportunidades 
-- SET lost_reason = 'Preço muito alto'
-- WHERE status = 'lost' AND lost_reason IS NULL
-- LIMIT 5;

-- UPDATE oportunidades 
-- SET lost_reason = 'Cliente não respondeu'
-- WHERE status = 'lost' AND lost_reason IS NULL
-- LIMIT 3;

-- UPDATE oportunidades 
-- SET lost_reason = 'Concorrência'
-- WHERE status = 'lost' AND lost_reason IS NULL
-- LIMIT 2;

-- 5. Verificar os motivos de perda cadastrados
SELECT lost_reason, COUNT(*) as quantidade
FROM oportunidades 
WHERE status IN ('lost', 'perdida', 'closed')
  AND lost_reason IS NOT NULL
GROUP BY lost_reason
ORDER BY quantidade DESC;















