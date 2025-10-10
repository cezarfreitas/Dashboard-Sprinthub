-- Adicionar coluna ativo na tabela vendedores_unidades
ALTER TABLE `vendedores_unidades` 
ADD COLUMN `ativo` BOOLEAN DEFAULT TRUE AFTER `sequencia`;

-- Criar índice para otimizar consultas por unidade e ativo
ALTER TABLE `vendedores_unidades` 
ADD INDEX `idx_unidade_ativo` (`unidade_id`, `ativo`);

-- Verificar resultado
SELECT 
    id,
    vendedor_id,
    unidade_id,
    sequencia,
    ativo,
    created_at,
    updated_at
FROM `vendedores_unidades` 
ORDER BY unidade_id, sequencia;
