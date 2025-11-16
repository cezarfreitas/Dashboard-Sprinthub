-- Remove coluna legada 'grupo' e índice 'idx_grupo' de 'unidades' se existirem

-- Dropar índice idx_grupo se existir
SET @idx_grupo_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'unidades'
    AND INDEX_NAME = 'idx_grupo'
);

SET @drop_idx_grupo_stmt := IF(
  @idx_grupo_exists = 1,
  'DROP INDEX idx_grupo ON unidades',
  'SELECT 1'
);
PREPARE drop_idx_grupo_stmt FROM @drop_idx_grupo_stmt;
EXECUTE drop_idx_grupo_stmt;
DEALLOCATE PREPARE drop_idx_grupo_stmt;

-- Dropar coluna grupo se existir
SET @col_grupo_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'unidades'
    AND COLUMN_NAME = 'grupo'
);

SET @drop_col_grupo_stmt := IF(
  @col_grupo_exists = 1,
  'ALTER TABLE unidades DROP COLUMN grupo',
  'SELECT 1'
);
PREPARE drop_col_grupo_stmt FROM @drop_col_grupo_stmt;
EXECUTE drop_col_grupo_stmt;
DEALLOCATE PREPARE drop_col_grupo_stmt;


