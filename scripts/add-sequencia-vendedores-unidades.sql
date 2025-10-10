-- Adicionar coluna sequencia na tabela vendedores_unidades
ALTER TABLE `vendedores_unidades` 
ADD COLUMN `sequencia` INT DEFAULT 1 AFTER `unidade_id`;

-- Criar índice para otimizar consultas por unidade e sequencia
ALTER TABLE `vendedores_unidades` 
ADD INDEX `idx_unidade_sequencia` (`unidade_id`, `sequencia`);

-- Atualizar sequencia baseada na ordem de criação (created_at) para cada unidade
UPDATE `vendedores_unidades` vu1 
SET `sequencia` = (
    SELECT COUNT(*) + 1 
    FROM `vendedores_unidades` vu2 
    WHERE vu2.unidade_id = vu1.unidade_id 
    AND vu2.created_at < vu1.created_at
);

-- Verificar resultado
SELECT 
    id,
    vendedor_id,
    unidade_id,
    sequencia,
    created_at,
    updated_at
FROM `vendedores_unidades` 
ORDER BY unidade_id, sequencia;
