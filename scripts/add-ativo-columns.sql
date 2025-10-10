-- Script para adicionar colunas 'ativo' às tabelas existentes
-- Execute este script se as tabelas já existem mas não têm a coluna 'ativo'

-- Adicionar coluna 'ativo' à tabela unidades (se não existir)
ALTER TABLE unidades 
ADD COLUMN IF NOT EXISTS ativo TINYINT(1) DEFAULT 1;

-- Adicionar coluna 'ativo' à tabela vendedores (se não existir)
ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS ativo TINYINT(1) DEFAULT 1;

-- Adicionar coluna 'ativo' à tabela vendedores_unidades (se não existir)
ALTER TABLE vendedores_unidades 
ADD COLUMN IF NOT EXISTS ativo TINYINT(1) DEFAULT 1;

-- Criar índices para as colunas ativo (se não existirem)
CREATE INDEX IF NOT EXISTS idx_unidades_ativo ON unidades(ativo);
CREATE INDEX IF NOT EXISTS idx_vendedores_ativo ON vendedores(ativo);
CREATE INDEX IF NOT EXISTS idx_vendedores_unidades_ativo ON vendedores_unidades(ativo);

-- Atualizar todos os registros existentes para ativo = 1
UPDATE unidades SET ativo = 1 WHERE ativo IS NULL;
UPDATE vendedores SET ativo = 1 WHERE ativo IS NULL;
UPDATE vendedores_unidades SET ativo = 1 WHERE ativo IS NULL;

-- Verificar se as colunas foram adicionadas
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('unidades', 'vendedores', 'vendedores_unidades')
  AND COLUMN_NAME = 'ativo'
ORDER BY TABLE_NAME;
