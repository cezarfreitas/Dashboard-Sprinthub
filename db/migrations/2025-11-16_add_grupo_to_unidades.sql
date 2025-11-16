-- Add 'grupo' column to 'unidades' table (compatible without IF NOT EXISTS)
SET @col_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'unidades' 
    AND COLUMN_NAME = 'grupo'
);

SET @add_col_stmt := IF(
  @col_exists = 0,
  'ALTER TABLE unidades ADD COLUMN grupo varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER nome',
  'SELECT 1'
);
PREPARE add_col_stmt FROM @add_col_stmt;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

-- Create index on 'grupo' to speed up filters/grouping (compatible without IF NOT EXISTS)
SET @idx_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'unidades' 
    AND INDEX_NAME = 'idx_grupo'
);

SET @add_idx_stmt := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_grupo ON unidades (grupo)',
  'SELECT 1'
);
PREPARE add_idx_stmt FROM @add_idx_stmt;
EXECUTE add_idx_stmt;
DEALLOCATE PREPARE add_idx_stmt;


