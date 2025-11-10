-- Tabela de Colunas de Funil sincronizados do SprintHub
CREATE TABLE IF NOT EXISTS colunas_funil (
  id INT NOT NULL,
  nome_coluna VARCHAR(255) NOT NULL,
  id_funil INT NOT NULL,
  total_oportunidades INT DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT '0.00',
  sequencia INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

