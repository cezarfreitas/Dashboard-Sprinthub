-- Migration: Adicionar índices para otimizar queries de ranking
-- Data: 2026-01-13
-- Descrição: Índices compostos para melhorar performance das queries de ranking

-- Índice composto para ranking de vendedores/unidades
-- Cobre as queries que filtram por status='gain', gain_date e user
CREATE INDEX IF NOT EXISTS idx_oportunidades_ranking 
ON oportunidades (status, gain_date, user, value, archived);

-- Índice para filtro por coluna_funil_id (usado no filtro de funil)
CREATE INDEX IF NOT EXISTS idx_oportunidades_funil 
ON oportunidades (coluna_funil_id, status, gain_date);

-- Índice para colunas_funil por id_funil
CREATE INDEX IF NOT EXISTS idx_colunas_funil_id_funil 
ON colunas_funil (id_funil);

-- Índice para unidades por grupo_id e ativo
CREATE INDEX IF NOT EXISTS idx_unidades_grupo_ativo 
ON unidades (grupo_id, ativo);
