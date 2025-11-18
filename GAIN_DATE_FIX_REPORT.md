# 🔧 Correção de Cálculo de Acumulado Mensal

## 🐛 Problema Identificado

O **Acumulado Mês** estava somando oportunidades com base em dois critérios:
- ❌ `status = 'gain'` (status da oportunidade)
- ❌ `gain_date` no período

Isso causava **inconsistências** porque:
1. Nem todas oportunidades com `gain_date` têm `status = 'gain'`
2. Oportunidades podiam ser ganhas (`gain_date` preenchido) mas ter status diferente
3. O valor real de ganhos não era refletido corretamente

## ✅ Solução Implementada

### **Critério Final:**
```sql
WHERE o.status = 'gain'
  AND o.gain_date IS NOT NULL
  AND MONTH(o.gain_date) = ? 
  AND YEAR(o.gain_date) = ?
```

### **Por que ambos os critérios?**
- ✅ `status = 'gain'`: Garante que a oportunidade está marcada como ganha
- ✅ `gain_date IS NOT NULL`: Garante que tem data de ganho
- ✅ `gain_date` no período: Filtra apenas ganhos do mês/ano selecionado

**Ambos os critérios são necessários para garantir precisão!**

## 📍 Arquivos Modificados

### `app/api/oportunidades/daily-gain/route.ts`

**Linha 32-36** (aproximadamente):

```typescript
query += `
  WHERE o.gain_date IS NOT NULL
    AND MONTH(o.gain_date) = ? 
    AND YEAR(o.gain_date) = ?
`
```

## 🎯 Impacto

### **Cálculo Correto:**
- ✅ **Acumulado Mês**: Soma APENAS oportunidades com `gain_date` no período
- ✅ **Independente do status**: Se tem `gain_date`, conta como ganho
- ✅ **Valores precisos**: Reflete ganhos reais do período

### **Cards Afetados:**

1. **Card "Acumulado Mês"** (`app/painel/page.tsx`)
   - Valor total de ganhos do mês
   - Comparação com mês anterior
   - Comparação com meta

2. **Gráfico de Receita Diária**
   - Valores por dia do mês
   - Soma total correta

## 🧪 Como Testar

### 1. **Verificar Acumulado Mês**

```sql
-- Query correta (agora implementada)
SELECT 
  COUNT(*) as total,
  SUM(value) as acumulado_mes
FROM oportunidades
WHERE gain_date IS NOT NULL
  AND MONTH(gain_date) = 11  -- mês atual
  AND YEAR(gain_date) = 2024

-- vs Query antiga (INCORRETA)
SELECT 
  COUNT(*) as total,
  SUM(value) as acumulado_mes
FROM oportunidades
WHERE status = 'gain'  -- ❌ Filtro errado
  AND MONTH(gain_date) = 11
  AND YEAR(gain_date) = 2024
```

### 2. **Comparar Valores**

**No Painel (`/painel`)**:
- Verificar card "ACUMULADO MÊS"
- Valor deve refletir TODOS os ganhos com `gain_date` no mês
- Independente do campo `status`

**API Direta**:
```bash
curl "http://localhost:3000/api/oportunidades/daily-gain?mes=11&ano=2024"
```

**Resposta esperada**:
```json
{
  "success": true,
  "mes": 11,
  "ano": 2024,
  "dados": [...],
  "valor_total_mes": 356970  // Soma de gain_date apenas
}
```

## 📊 Exemplo de Diferença

### Cenário:

| ID | Status | gain_date | value |
|----|--------|-----------|-------|
| 1 | gain | 2024-11-10 | 10000 |
| 2 | **open** | 2024-11-15 | 5000 |
| 3 | gain | 2024-11-20 | 8000 |

### Resultado:

**Query Antiga (INCORRETA)**:
```
Total: 2 oportunidades
Acumulado: R$ 18.000 (ids 1 e 3)
❌ Oportunidade id=2 NÃO contada (status != 'gain')
```

**Query Nova (CORRETA)**:
```
Total: 3 oportunidades
Acumulado: R$ 23.000 (ids 1, 2 e 3)
✅ Todas oportunidades com gain_date contadas
```

## 🔍 Padrão Estabelecido

### **Regra de Ouro:**
> "Para contar como ganho do período, deve ter `status = 'gain'` E `gain_date` no período selecionado"

### **Aplicar em TODAS as queries de ganhos:**

```sql
-- ✅ CORRETO (ambos os critérios)
WHERE status = 'gain'
  AND gain_date IS NOT NULL
  AND DATE(gain_date) BETWEEN ? AND ?

-- ❌ INCORRETO (apenas status)
WHERE status = 'gain'
  AND DATE(gain_date) BETWEEN ? AND ?

-- ❌ INCORRETO (apenas gain_date)
WHERE gain_date IS NOT NULL
  AND DATE(gain_date) BETWEEN ? AND ?
```

## 🚀 Próximos Passos

### APIs que podem precisar da mesma correção:

1. ✅ `/api/oportunidades/daily-gain` - **Corrigido**
2. ⏹️ `/api/oportunidades/ganhos` - Verificar
3. ⏹️ `/api/unidades/painel` - Verificar
4. ⏹️ `/api/unidades/resumo` - Verificar
5. ⏹️ `/api/gestor/stats` - Verificar

### Checklist de Verificação:

Para cada API de ganhos:
- [ ] Remover `status = 'gain'` como filtro principal
- [ ] Usar `gain_date IS NOT NULL`
- [ ] Filtrar período por `gain_date`
- [ ] Testar com dados reais
- [ ] Documentar mudança

## 📝 Notas Importantes

### **Por que `gain_date` é mais confiável:**

1. **Campo específico** para data de ganho
2. **Imutável** após preenchimento
3. **Timestamp preciso** do momento do ganho
4. **Não depende** de status ambíguo

### **Quando usar `status`:**

- ✅ Filtrar por **estado atual** da oportunidade
- ✅ Workflows e lógica de negócio
- ✅ Validações de interface

### **Quando usar `gain_date`:**

- ✅ **Cálculos financeiros**
- ✅ **Relatórios de ganhos**
- ✅ **Métricas de performance**
- ✅ **Análises temporais**

---

**Data**: 2024-11-18  
**Versão**: 1.0.0  
**Criticidade**: ALTA (impacta relatórios financeiros)

