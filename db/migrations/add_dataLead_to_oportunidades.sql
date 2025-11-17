-- Migration: Adicionar coluna dataLead na tabela oportunidades
-- Data: 2025-11-16

ALTER TABLE oportunidades 
ADD COLUMN dataLead json DEFAULT NULL 
AFTER fields;

