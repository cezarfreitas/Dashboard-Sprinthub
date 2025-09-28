USE dash_inteli;

-- Adicionar coluna ativo na tabela vendedores
ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE AFTER unidade_id;

-- Adicionar índice para melhor performance
ALTER TABLE vendedores 
ADD INDEX IF NOT EXISTS idx_ativo (ativo);

-- Atualizar todos os vendedores existentes para ativo = TRUE
UPDATE vendedores 
SET ativo = TRUE 
WHERE ativo IS NULL;
