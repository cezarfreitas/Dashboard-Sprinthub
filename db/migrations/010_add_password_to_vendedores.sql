-- =====================================================
-- Migration: Adicionar campos de senha na tabela vendedores
-- Data: 2025-12-29
-- Descrição: Adiciona campos para autenticação com senha
--            e recuperação de senha para consultores
-- =====================================================

-- Adicionar campo de senha (hash bcrypt)
ALTER TABLE `vendedores` 
ADD COLUMN `senha` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL 
COMMENT 'Senha do consultor (hash bcrypt)' 
AFTER `unidade_id`;

-- Adicionar campo de token para reset de senha
ALTER TABLE `vendedores` 
ADD COLUMN `reset_token` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL 
COMMENT 'Token para recuperação de senha' 
AFTER `senha`;

-- Adicionar campo de expiração do token
ALTER TABLE `vendedores` 
ADD COLUMN `reset_token_expires` DATETIME DEFAULT NULL 
COMMENT 'Data de expiração do token de reset' 
AFTER `reset_token`;

-- Criar índice para busca por reset_token
ALTER TABLE `vendedores` 
ADD INDEX `idx_reset_token` (`reset_token`);

-- =====================================================
-- Para definir senha inicial de um vendedor:
-- UPDATE vendedores SET senha = '$2b$10$...' WHERE id = X;
-- 
-- Usar bcrypt para gerar o hash da senha
-- =====================================================

