-- Adicionar coluna unidade_id à tabela vendedores
ALTER TABLE vendedores 
ADD COLUMN unidade_id INT NULL AFTER whatsapp_automation,
ADD INDEX idx_unidade_id (unidade_id);

-- Adicionar chave estrangeira se a tabela unidades existir
-- ALTER TABLE vendedores 
-- ADD CONSTRAINT fk_vendedores_unidade 
-- FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
-- ON DELETE SET NULL ON UPDATE CASCADE;
