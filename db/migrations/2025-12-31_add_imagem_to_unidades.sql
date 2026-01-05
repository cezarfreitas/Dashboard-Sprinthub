-- Add 'imagem' column to 'unidades' table (compatible without IF NOT EXISTS)
SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'unidades'
    AND COLUMN_NAME = 'imagem'
);

SET @add_col_stmt := IF(
  @col_exists = 0,
  'ALTER TABLE unidades ADD COLUMN imagem varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''URL/caminho da imagem (ex: /api/uploads/unidades/unidade-1-123.png)'' AFTER name',
  'SELECT 1'
);
PREPARE add_col_stmt FROM @add_col_stmt;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;


