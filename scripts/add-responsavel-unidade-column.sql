-- ============================================================
-- Adicionar coluna responsavel_unidade na tabela unidades
-- ============================================================

USE inteli_db;

-- Adicionar coluna responsavel_unidade
ALTER TABLE unidades 
ADD COLUMN IF NOT EXISTS responsavel_unidade VARCHAR(255) NULL AFTER responsavel;

-- Criar índice para otimizar buscas
ALTER TABLE unidades 
ADD INDEX IF NOT EXISTS idx_responsavel_unidade (responsavel_unidade);

-- Verificar a estrutura
SHOW COLUMNS FROM unidades LIKE '%responsavel%';

SELECT '✅ Coluna responsavel_unidade adicionada com sucesso!' AS status;










