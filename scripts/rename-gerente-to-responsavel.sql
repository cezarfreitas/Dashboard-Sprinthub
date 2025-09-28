-- Script para renomear a coluna 'gerente' para 'responsavel' na tabela unidades
-- Execute este script no seu banco MySQL

USE dash_inteli;

-- Renomear a coluna 'gerente' para 'responsavel' na tabela unidades
ALTER TABLE unidades 
CHANGE COLUMN gerente responsavel VARCHAR(255) NOT NULL;

-- Verificar se a alteração foi feita corretamente
DESCRIBE unidades;
