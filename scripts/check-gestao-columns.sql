-- Script para verificar se as colunas de gestão existem na tabela unidades

USE dash_inteli;

-- Verificar estrutura da tabela
DESCRIBE unidades;

-- Verificar se as colunas existem
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dash_inteli'
  AND TABLE_NAME = 'unidades'
  AND COLUMN_NAME IN ('dpto_gestao', 'user_gestao', 'responsavel_unidade');

-- Verificar dados existentes
SELECT 
    id,
    name,
    dpto_gestao,
    user_gestao
FROM unidades
LIMIT 10;

-- Contar unidades com user_gestao preenchido
SELECT 
    COUNT(*) as total_unidades,
    COUNT(user_gestao) as com_user_gestao,
    COUNT(dpto_gestao) as com_dpto_gestao
FROM unidades;







