-- Adicionar coluna fila_leads na tabela unidades
-- Esta coluna armazena a sequência de vendedores na fila de atendimento

ALTER TABLE unidades 
ADD COLUMN IF NOT EXISTS fila_leads JSON NULL 
COMMENT 'Sequência de vendedores na fila de leads (array de {vendedor_id, sequencia})';

-- Exemplo de estrutura esperada:
-- [
--   {"vendedor_id": 1, "sequencia": 1},
--   {"vendedor_id": 2, "sequencia": 2},
--   {"vendedor_id": 3, "sequencia": 3}
-- ]










