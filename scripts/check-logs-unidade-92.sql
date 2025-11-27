-- Verificar logs da unidade 92
SELECT 
  fll.id,
  fll.unidade_id,
  fll.vendedor_id,
  CONCAT(v.name, ' ', COALESCE(v.lastName, '')) as vendedor_nome,
  fll.lead_id,
  fll.posicao_fila,
  fll.total_fila,
  fll.distribuido_em
FROM fila_leads_log fll
LEFT JOIN vendedores v ON fll.vendedor_id = v.id
WHERE fll.unidade_id = 92
ORDER BY fll.distribuido_em DESC
LIMIT 20;

-- Contar total
SELECT COUNT(*) as total_logs FROM fila_leads_log WHERE unidade_id = 92;

