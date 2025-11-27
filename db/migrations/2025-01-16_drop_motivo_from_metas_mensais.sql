-- Remove coluna 'motivo' da tabela 'metas_mensais' se existir
-- Esta coluna não faz parte do schema original e foi adicionada por engano

-- Dropar coluna motivo se existir
SET @col_motivo_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'metas_mensais'
    AND COLUMN_NAME = 'motivo'
);

SET @drop_col_motivo_stmt := IF(
  @col_motivo_exists = 1,
  'ALTER TABLE metas_mensais DROP COLUMN motivo',
  'SELECT 1'
);

PREPARE drop_col_motivo_stmt FROM @drop_col_motivo_stmt;
EXECUTE drop_col_motivo_stmt;
DEALLOCATE PREPARE drop_col_motivo_stmt;


