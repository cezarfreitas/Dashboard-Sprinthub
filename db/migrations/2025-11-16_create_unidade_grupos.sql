-- Criação da tabela de grupos de unidades e migração de dados legados

-- 1) Criar tabela unidade_grupos (id, nome, descricao, ativo, timestamps)
CREATE TABLE IF NOT EXISTS unidade_grupos (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  descricao varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ativo tinyint(1) DEFAULT '1',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unidade_grupos_nome (nome),
  KEY idx_unidade_grupos_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Adicionar coluna grupo_id em unidades, se não existir
SET @col_grupo_id_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'unidades' 
    AND COLUMN_NAME = 'grupo_id'
);

SET @add_grupo_id_stmt := IF(
  @col_grupo_id_exists = 0,
  'ALTER TABLE unidades ADD COLUMN grupo_id int DEFAULT NULL AFTER name',
  'SELECT 1'
);
PREPARE add_grupo_id_stmt FROM @add_grupo_id_stmt;
EXECUTE add_grupo_id_stmt;
DEALLOCATE PREPARE add_grupo_id_stmt;

-- 3) Criar índice em unidades.grupo_id (se não existir)
SET @idx_grupo_id_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'unidades' 
    AND INDEX_NAME = 'idx_grupo_id'
);

SET @add_idx_grupo_id_stmt := IF(
  @idx_grupo_id_exists = 0,
  'CREATE INDEX idx_grupo_id ON unidades (grupo_id)',
  'SELECT 1'
);
PREPARE add_idx_grupo_id_stmt FROM @add_idx_grupo_id_stmt;
EXECUTE add_idx_grupo_id_stmt;
DEALLOCATE PREPARE add_idx_grupo_id_stmt;

-- 4) Popular unidade_grupos com DISTINCT de unidades.grupo (se a coluna 'grupo' existir)
SET @col_grupo_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'unidades' 
    AND COLUMN_NAME = 'grupo'
);

-- Inserir grupos distintos
SET @insert_grupos_sql := IF (
  @col_grupo_exists = 1,
  'INSERT INTO unidade_grupos (nome) SELECT DISTINCT grupo FROM unidades WHERE grupo IS NOT NULL AND grupo <> '''' AND grupo NOT IN (SELECT nome FROM unidade_grupos)',
  'SELECT 1'
);
PREPARE insert_grupos_stmt FROM @insert_grupos_sql;
EXECUTE insert_grupos_stmt;
DEALLOCATE PREPARE insert_grupos_stmt;

-- 5) Preencher unidades.grupo_id a partir de unidades.grupo
SET @update_unidades_sql := IF (
  @col_grupo_exists = 1,
  'UPDATE unidades u INNER JOIN unidade_grupos g ON u.grupo = g.nome SET u.grupo_id = g.id WHERE u.grupo IS NOT NULL AND u.grupo <> ''''',
  'SELECT 1'
);
PREPARE update_unidades_stmt FROM @update_unidades_sql;
EXECUTE update_unidades_stmt;
DEALLOCATE PREPARE update_unidades_stmt;

-- 6) (Opcional) Habilitar FK após dados populados (descomentando quando desejar)
-- ALTER TABLE unidades ADD CONSTRAINT fk_unidades_grupo_id FOREIGN KEY (grupo_id) REFERENCES unidade_grupos (id);


