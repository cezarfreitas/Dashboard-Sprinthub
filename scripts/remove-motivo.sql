-- Script SQL para remover campo 'motivo' da tabela metas_mensais
-- Execute este script no seu banco de dados MySQL

-- Verificar se o campo existe antes de remover
SET @col_motivo_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'metas_mensais'
    AND COLUMN_NAME = 'motivo'
);

-- Remover o campo se existir
SET @sql := IF(
  @col_motivo_exists > 0,
  'ALTER TABLE metas_mensais DROP COLUMN motivo',
  'SELECT "Campo motivo não existe na tabela metas_mensais" as resultado'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


