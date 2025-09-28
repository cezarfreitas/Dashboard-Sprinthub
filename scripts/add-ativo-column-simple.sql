-- Script para adicionar coluna ativo na tabela vendedores
-- Execute este script no seu cliente MySQL

USE dash_inteli;

-- Adicionar coluna ativo se não existir
ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE AFTER unidade_id;

-- Adicionar índice para melhor performance
ALTER TABLE vendedores 
ADD INDEX IF NOT EXISTS idx_ativo (ativo);

-- Atualizar todos os vendedores existentes para ativo = TRUE
UPDATE vendedores 
SET ativo = TRUE 
WHERE ativo IS NULL;

-- Verificar se a coluna foi criada
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM information_schema.columns 
WHERE table_schema = 'dash_inteli' 
AND table_name = 'vendedores' 
AND column_name = 'ativo';
