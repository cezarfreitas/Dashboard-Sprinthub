-- Script para adicionar coluna unidade_id à tabela vendedores
-- Execute este script no seu cliente MySQL (phpMyAdmin, MySQL Workbench, etc.)

USE dash_inteli;

-- Adicionar coluna unidade_id se não existir
ALTER TABLE vendedores 
ADD COLUMN IF NOT EXISTS unidade_id INT NULL AFTER whatsapp_automation;

-- Adicionar índice para melhor performance
ALTER TABLE vendedores 
ADD INDEX IF NOT EXISTS idx_unidade_id (unidade_id);

-- Verificar se a coluna foi criada
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'dash_inteli' 
AND TABLE_NAME = 'vendedores' 
AND COLUMN_NAME = 'unidade_id';
