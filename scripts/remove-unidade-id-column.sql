-- Script para remover a coluna unidade_id da tabela vendedores
-- Este script deve ser executado APÓS a migração dos dados para vendedores_unidades

-- 1. Verificar se existem dados na tabela vendedores_unidades
SELECT 'Verificando dados migrados...' as status;
SELECT COUNT(*) as total_relacionamentos FROM vendedores_unidades;

-- 2. Remover a coluna unidade_id da tabela vendedores
ALTER TABLE vendedores DROP COLUMN IF EXISTS unidade_id;

-- 3. Verificar se a coluna foi removida
SELECT 'Coluna unidade_id removida com sucesso!' as status;

-- 4. Verificar estrutura da tabela vendedores
DESCRIBE vendedores;
