# API `/api/oportunidades/stats`

API unificada para buscar estatísticas agregadas de oportunidades.

## 📖 Documentação Completa

📄 **Documentação detalhada:** [`docs/API_OPORTUNIDADES_STATS.md`](../../../../docs/API_OPORTUNIDADES_STATS.md)

## 🚀 Uso Rápido

```typescript
// Estatísticas gerais
GET /api/oportunidades/stats

// Oportunidades abertas
GET /api/oportunidades/stats?status=open

// Ganhas em janeiro
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31

// Por unidade
GET /api/oportunidades/stats?unidade_id=1&created_date_start=2025-01-01&created_date_end=2025-01-31

// Agrupado por dia (para gráficos)
GET /api/oportunidades/stats?group_by=day&created_date_start=2025-01-01&created_date_end=2025-01-31
```

## 🎯 Filtros Disponíveis

### Status
- `status=open|won|lost|all` (ou múltiplos: `open,won`)

### Datas (formato: YYYY-MM-DD)
- `created_date_start` / `created_date_end` - Data de criação
- `gain_date_start` / `gain_date_end` - Data de ganho
- `lost_date_start` / `lost_date_end` - Data de perda
- `reopen_date_start` / `reopen_date_end` - Data de reabertura
- `expected_close_date_start` / `expected_close_date_end` - Data esperada de fechamento
- `update_date_start` / `update_date_end` - Data de atualização
- `last_column_change_start` / `last_column_change_end` - Última mudança de coluna
- `last_status_change_start` / `last_status_change_end` - Última mudança de status

### Relacionamentos
- `funil_id` - ID do funil (ou múltiplos: `4,5,6`)
- `user_id` - ID do vendedor (ou múltiplos)
- `unidade_id` - ID da unidade (ou múltiplos)
- `lead_id` - ID do lead (ou múltiplos)

### Valores
- `valor_min` - Valor mínimo
- `valor_max` - Valor máximo

### Atributos
- `loss_reason` - Motivo de perda (ID ou múltiplos)
- `gain_reason` - Motivo de ganho (busca parcial)
- `sale_channel` - Canal de venda (busca parcial)
- `campaign` - Campanha (busca parcial)

### Agrupamento
- `group_by=day|month|status|funil`

## 📤 Resposta

```json
{
  "success": true,
  "data": {
    "stats": [{
      "total": 150,
      "valor_total": 500000.00,
      "total_ganhas": 50,
      "total_perdidas": 30,
      "total_abertas": 70,
      "valor_ganhas": 200000.00,
      "valor_perdidas": 100000.00,
      "valor_abertas": 200000.00
    }],
    "total": 150,
    "valor_total": 500000.00,
    // ... campos consolidados
  },
  "filters": { /* filtros aplicados */ }
}
```

## 📚 Mais Exemplos

Veja a [documentação completa](../../../../docs/API_OPORTUNIDADES_STATS.md) para mais exemplos e casos de uso.

