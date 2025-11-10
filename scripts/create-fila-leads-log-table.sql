-- Criar tabela para registrar chamadas à fila de leads
-- Armazena histórico de distribuição de leads por unidade
-- SOLUÇÃO OTIMIZADA: Apenas 1 tabela, resiliente a mudanças na fila

CREATE TABLE  fila_leads_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unidade_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  posicao_fila TINYINT NOT NULL COMMENT 'Posição do vendedor na fila no momento da distribuição',
  total_fila TINYINT NOT NULL COMMENT 'Total de vendedores na fila no momento',
  distribuido_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_unidade_id (unidade_id),
  INDEX idx_vendedor_id (vendedor_id),
  INDEX idx_unidade_distribuido (unidade_id, distribuido_em DESC),
  INDEX idx_distribuido_em (distribuido_em),
  
  -- Foreign keys (opcional, comentadas se as tabelas não existirem)
  -- FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE,
  -- FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) ON DELETE CASCADE
  
  COMMENT='Log de distribuição de leads via fila rotativa. Armazena último vendedor que recebeu.'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

