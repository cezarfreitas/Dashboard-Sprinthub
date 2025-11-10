-- Script para adicionar colunas de departamento e usuário de gestão na tabela unidades
-- E remover a coluna responsavel_unidade (agora user_gestao será o responsável)
-- Execute este script antes de rodar a sincronização de unidades

USE dash_inteli;

-- Adicionar coluna dpto_gestao (ID do sub-departamento de gestão)
ALTER TABLE unidades 
ADD COLUMN IF NOT EXISTS dpto_gestao INT NULL COMMENT 'ID do sub-departamento de gestão' AFTER google_business_messages;

-- Adicionar coluna user_gestao (ID do usuário responsável pela gestão)
ALTER TABLE unidades 
ADD COLUMN IF NOT EXISTS user_gestao INT NULL COMMENT 'ID do usuário responsável do sub-departamento de gestão' AFTER dpto_gestao;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_dpto_gestao ON unidades(dpto_gestao);
CREATE INDEX IF NOT EXISTS idx_user_gestao ON unidades(user_gestao);

-- Remover coluna responsavel_unidade (substituída por user_gestao)
ALTER TABLE unidades 
DROP COLUMN IF EXISTS responsavel_unidade;

-- Verificar as colunas adicionadas
DESCRIBE unidades;

SELECT 
    CONCAT('✅ Script executado com sucesso!') as status,
    COUNT(*) as total_unidades,
    COUNT(user_gestao) as unidades_com_gestao
FROM unidades;

