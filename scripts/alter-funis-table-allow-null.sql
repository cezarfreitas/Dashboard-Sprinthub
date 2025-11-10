-- Permitir NULL na coluna funil_nome
ALTER TABLE funis 
MODIFY COLUMN funil_nome VARCHAR(255) NULL;

