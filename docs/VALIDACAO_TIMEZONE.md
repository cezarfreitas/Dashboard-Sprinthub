# ✅ Validação de Timezone GMT-3

## 📋 Status da Configuração

### Variáveis de Ambiente (.env.local)
```bash
✅ NEXT_PUBLIC_TIMEZONE=America/Sao_Paulo
✅ TZ=America/Sao_Paulo
```

### MySQL
```
✅ Suporta CONVERT_TZ
✅ System timezone: UTC
✅ Global timezone: SYSTEM
✅ Session timezone: SYSTEM
```

### Node.js
```
✅ Timezone offset: 180 minutos (GMT-3)
✅ Date.toString(): mostra GMT-0300
```

---

## 🔍 APIs Corrigidas

### ✅ `/api/oportunidades/diaria`
- Usa `CONVERT_TZ(campo, '+00:00', '-03:00')` em todas as queries
- Filtra e agrupa por data GMT-3
- **STATUS:** ✅ CORRETO

---

## ⚠️ APIs que Precisam de Correção

Todas as APIs que usam `DATE()`, `DAY()`, `MONTH()`, `YEAR()` precisam usar `CONVERT_TZ`:

### 1. `/api/oportunidades/today`
**Localização:** `app/api/oportunidades/today/route.ts`

**Problema:** Usa `CURDATE()` e `DATE()` sem conversão

**Correção necessária:**
```sql
-- ANTES (incorreto)
WHERE DATE(createDate) = CURDATE()

-- DEPOIS (correto)
WHERE DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) = 
      DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))
```

### 2. `/api/oportunidades/ganhos`
**Localização:** `app/api/oportunidades/ganhos/route.ts`

**Problema:** Usa `MONTH()` e `YEAR()` diretamente

**Correção necessária:**
```sql
-- ANTES (incorreto)
WHERE MONTH(o.gain_date) = ? AND YEAR(o.gain_date) = ?

-- DEPOIS (correto)
WHERE MONTH(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ? 
  AND YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?
```

### 3. `/api/oportunidades/daily-gain`
**Localização:** `app/api/oportunidades/daily-gain/route.ts`

**Correção necessária:**
```sql
-- Aplicar CONVERT_TZ em DAY(), MONTH(), YEAR()
```

### 4. `/api/oportunidades/daily-created`
**Localização:** `app/api/oportunidades/daily-created/route.ts`

**Correção necessária:**
```sql
-- Aplicar CONVERT_TZ em DAY(), MONTH(), YEAR()
```

### 5. `/api/gestor/stats`
**Localização:** `app/api/gestor/stats/route.ts`

**Correção necessária:**
```sql
-- Aplicar CONVERT_TZ em filtros de data
```

### 6. `/api/oportunidades/stats`
**Localização:** Várias APIs de stats

**Correção necessária:**
```sql
-- Aplicar CONVERT_TZ em todas as comparações de data
```

---

## 🛠️ Como Corrigir

### Template de Correção:

**ANTES:**
```sql
SELECT 
  DATE(campo_data) as data,
  DAY(campo_data) as dia,
  MONTH(campo_data) as mes,
  YEAR(campo_data) as ano
FROM tabela
WHERE DATE(campo_data) >= '2024-12-01'
  AND DATE(campo_data) <= '2024-12-31'
  AND MONTH(campo_data) = 12
  AND YEAR(campo_data) = 2024
GROUP BY DATE(campo_data)
```

**DEPOIS:**
```sql
SELECT 
  DATE(CONVERT_TZ(campo_data, '+00:00', '-03:00')) as data,
  DAY(CONVERT_TZ(campo_data, '+00:00', '-03:00')) as dia,
  MONTH(CONVERT_TZ(campo_data, '+00:00', '-03:00')) as mes,
  YEAR(CONVERT_TZ(campo_data, '+00:00', '-03:00')) as ano
FROM tabela
WHERE DATE(CONVERT_TZ(campo_data, '+00:00', '-03:00')) >= '2024-12-01'
  AND DATE(CONVERT_TZ(campo_data, '+00:00', '-03:00')) <= '2024-12-31'
  AND MONTH(CONVERT_TZ(campo_data, '+00:00', '-03:00')) = 12
  AND YEAR(CONVERT_TZ(campo_data, '+00:00', '-03:00')) = 2024
GROUP BY DATE(CONVERT_TZ(campo_data, '+00:00', '-03:00'))
```

---

## 📊 Teste de Validação

Execute o script de teste:

```bash
node scripts/test-timezone-config.js
```

**Resultado esperado:**
```
✅ Variáveis de ambiente configuradas corretamente!
✅ Timezone offset: 180 minutos (GMT-3)
⚠️  DIFERENÇA DETECTADA! (Problema de timezone)
   Dia UTC: 8
   Dia SP: 7
```

A diferença é **esperada** se for entre 21h e 00h (horário UTC da meia-noite).

---

## 🎯 Checklist de Correção

### APIs de Oportunidades:
- [x] `/api/oportunidades/diaria` ✅
- [ ] `/api/oportunidades/today` ⚠️
- [ ] `/api/oportunidades/ganhos` ⚠️
- [ ] `/api/oportunidades/daily-gain` ⚠️
- [ ] `/api/oportunidades/daily-created` ⚠️
- [ ] `/api/oportunidades/stats` ⚠️
- [ ] `/api/oportunidades/abertos` ⚠️
- [ ] `/api/oportunidades/perdidos` ⚠️

### APIs de Gestor:
- [ ] `/api/gestor/stats` ⚠️
- [ ] `/api/gestor/unidade/[id]` ⚠️

### APIs de Ranking:
- [ ] `/api/ranking/vendedores` ⚠️
- [ ] `/api/ranking/unidades` ⚠️

### APIs de Metas:
- [ ] `/api/meta/stats` ⚠️
- [ ] `/api/metas/*` ⚠️

---

## 🔧 Scripts de Teste

### 1. Teste de Configuração
```bash
node scripts/test-timezone-config.js
```

### 2. Teste de Dados do Painel
```bash
node scripts/test-painel-data.js
```

### 3. Query Manual no MySQL
```sql
-- Teste direto no banco
SELECT 
  NOW() as utc_now,
  CONVERT_TZ(NOW(), '+00:00', '-03:00') as gmt3_now,
  DATE(NOW()) as utc_date,
  DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00')) as gmt3_date,
  HOUR(NOW()) as utc_hour,
  HOUR(CONVERT_TZ(NOW(), '+00:00', '-03:00')) as gmt3_hour;
```

**Resultado esperado (às 01:48 UTC):**
```
utc_now:       2025-12-08 01:48:00
gmt3_now:      2025-12-07 22:48:00
utc_date:      2025-12-08
gmt3_date:     2025-12-07
utc_hour:      1
gmt3_hour:     22
```

---

## ⚠️ Problemas Identificados

### 1. Oportunidades "HOJE" mostrando dia errado
**Causa:** API `/api/oportunidades/today` não usa `CONVERT_TZ`  
**Impacto:** Cards "Criadas HOJE" e "Ganhas HOJE" podem mostrar dados incorretos  
**Solução:** Aplicar correção template acima

### 2. Gráficos diários com dia adiantado
**Causa:** APIs de daily não usam `CONVERT_TZ`  
**Impacto:** Gráficos podem mostrar dia 8 quando é dia 7  
**Solução:** ✅ JÁ CORRIGIDO em `/api/oportunidades/diaria`

### 3. Estatísticas mensais incorretas
**Causa:** Filtros `MONTH()` e `YEAR()` sem conversão  
**Impacto:** Totais mensais podem incluir/excluir dados incorretamente  
**Solução:** Aplicar `CONVERT_TZ` em todos os filtros de mês/ano

---

## 📝 Próximos Passos

1. **Prioridade ALTA:** Corrigir `/api/oportunidades/today`
2. **Prioridade ALTA:** Corrigir `/api/oportunidades/ganhos`
3. **Prioridade MÉDIA:** Corrigir APIs de daily
4. **Prioridade MÉDIA:** Corrigir APIs de stats
5. **Prioridade BAIXA:** Corrigir APIs de ranking/metas

---

## ✅ Validação Final

Após todas as correções, execute:

```bash
# 1. Teste de configuração
node scripts/test-timezone-config.js

# 2. Teste de dados
node scripts/test-painel-data.js

# 3. Build
npm run build

# 4. Verificar no navegador
# Acessar http://localhost:3000/painel
# Verificar se "HOJE" mostra dados corretos
```

---

**Última atualização:** 08/12/2024  
**Status:** ⚠️ Parcialmente implementado (1/10 APIs corrigidas)

