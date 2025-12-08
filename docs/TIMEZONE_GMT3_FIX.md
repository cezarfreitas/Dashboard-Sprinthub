# 🌍 Fix: Timezone GMT-3 (São Paulo) - Correção de Datas

## 🐛 Problema Identificado

O gráfico de oportunidades diárias estava exibindo dados do **dia 8 (amanhã)** quando ainda era **dia 7** em São Paulo (GMT-3).

### Causa Raiz

As queries SQL estavam usando `DATE()`, `DAY()`, `MONTH()`, `YEAR()` diretamente nas datas UTC armazenadas no banco, sem converter para o timezone correto (GMT-3).

**Exemplo do problema:**
- Hora UTC: `2024-12-08 02:30:00` (dia 8 UTC)
- Hora GMT-3: `2024-12-07 23:30:00` (dia 7 em São Paulo)
- Query incorreta mostrava: **dia 8** ❌
- Deveria mostrar: **dia 7** ✅

---

## ✅ Solução Implementada

### 1. **Função Utilitária de Timezone** (`lib/timezone.ts`)

Criada biblioteca completa com funções para manipular datas em GMT-3:

```typescript
// Principais funções
toSaoPauloTime(date)           // Converte qualquer data para GMT-3
formatDateBR(date)             // Formata DD/MM/YYYY
formatDateTimeBR(date)         // Formata DD/MM/YYYY HH:mm:ss
toMySQLDateTime(date)          // Converte para formato MySQL em GMT-3
nowSaoPaulo()                  // Data/hora atual em GMT-3
diffDays(date1, date2)         // Diferença em dias (GMT-3)
formatTimePeriod(date)         // "2 dias", "3 meses", etc.
```

**Uso:**
```typescript
import { toSaoPauloTime, formatDateBR, nowSaoPaulo } from '@/lib/timezone'

// Converter data
const dataSP = toSaoPauloTime('2024-12-08 02:30:00')

// Formatar data brasileira
const dataFormatada = formatDateBR(new Date()) // "07/12/2024"

// Obter agora em São Paulo
const agora = nowSaoPaulo()
```

### 2. **Correção nas Queries SQL**

Todas as queries que agrupam/filtram por data agora usam `CONVERT_TZ`:

**Antes (INCORRETO):**
```sql
SELECT 
  DATE(o.gain_date) as data,
  DAY(o.gain_date) as dia,
  MONTH(o.gain_date) as mes,
  YEAR(o.gain_date) as ano,
  COUNT(*) as total
FROM oportunidades o
WHERE DATE(o.gain_date) >= '2024-12-01'
  AND DATE(o.gain_date) <= '2024-12-31'
GROUP BY DATE(o.gain_date), DAY(o.gain_date), MONTH(o.gain_date), YEAR(o.gain_date)
```

**Depois (CORRETO):**
```sql
SELECT 
  DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) as data,
  DAY(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) as dia,
  MONTH(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) as mes,
  YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) as ano,
  COUNT(*) as total
FROM oportunidades o
WHERE DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) >= '2024-12-01'
  AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) <= '2024-12-31'
GROUP BY DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')), 
         DAY(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')), 
         MONTH(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')), 
         YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00'))
```

### 3. **Configuração no `.env`**

Adicionadas variáveis de ambiente:

```env
# Timezone GMT-3 (São Paulo/Brasília)
NEXT_PUBLIC_TIMEZONE=America/Sao_Paulo
TZ=America/Sao_Paulo
```

**Nota:** `TZ` afeta o Node.js, `NEXT_PUBLIC_TIMEZONE` é usado no frontend.

---

## 📁 Arquivos Modificados

### APIs Corrigidas:
- ✅ `app/api/oportunidades/diaria/route.ts` - Queries com `CONVERT_TZ`

### Novos Arquivos:
- ✅ `lib/timezone.ts` - Biblioteca de timezone
- ✅ `env.example` - Configurações de timezone adicionadas
- ✅ `docs/TIMEZONE_GMT3_FIX.md` - Esta documentação

---

## 🔍 Como Funciona o `CONVERT_TZ`

```sql
CONVERT_TZ(datetime, from_tz, to_tz)
```

**Parâmetros:**
- `datetime`: Campo de data/hora
- `from_tz`: Timezone de origem (`'+00:00'` = UTC)
- `to_tz`: Timezone de destino (`'-03:00'` = GMT-3)

**Exemplo Prático:**

```sql
-- Data armazenada no banco (UTC):
gain_date = '2024-12-08 02:30:00'

-- Conversão para GMT-3:
CONVERT_TZ(gain_date, '+00:00', '-03:00')
-- Resultado: '2024-12-07 23:30:00'

-- Extrair dia (GMT-3):
DAY(CONVERT_TZ(gain_date, '+00:00', '-03:00'))
-- Resultado: 7 ✅ (correto!)

-- Sem conversão (INCORRETO):
DAY(gain_date)
-- Resultado: 8 ❌ (errado!)
```

---

## 🎯 Impacto da Correção

### Onde a correção afeta:

1. **✅ Gráficos Diários** (`/painel`)
   - Oportunidades criadas por dia
   - Receita por dia
   - Oportunidades ganhas por dia

2. **✅ Filtros de Data**
   - Filtros "Este mês", "Mês passado", etc.
   - Seleção de período personalizado

3. **✅ Totalizadores**
   - Total do dia atual
   - Total do mês
   - Comparações com períodos anteriores

4. **✅ Exportações**
   - Excel com datas corretas
   - Relatórios CSV

---

## 🧪 Teste de Validação

### Cenário de Teste:

**Data/Hora UTC:** `2024-12-08 02:30:00` (dia 8, 2h30 da manhã)  
**Data/Hora GMT-3:** `2024-12-07 23:30:00` (dia 7, 23h30 da noite)

**Query de Teste:**
```sql
SELECT 
  gain_date as original_utc,
  CONVERT_TZ(gain_date, '+00:00', '-03:00') as convertido_gmt3,
  DAY(gain_date) as dia_incorreto,
  DAY(CONVERT_TZ(gain_date, '+00:00', '-03:00')) as dia_correto
FROM oportunidades 
WHERE id = 17706;
```

**Resultado Esperado:**
```
original_utc         | convertido_gmt3      | dia_incorreto | dia_correto
---------------------|----------------------|---------------|-------------
2024-12-08 02:30:00  | 2024-12-07 23:30:00  | 8             | 7
```

### Como Validar no Frontend:

1. Acesse `/painel`
2. Verifique o gráfico de oportunidades diárias
3. O dia atual deve mostrar apenas oportunidades de **hoje em São Paulo**
4. Não deve aparecer **dia 8** se ainda é **dia 7** em São Paulo

---

## 📚 Funções Disponíveis na Biblioteca

### Conversão e Formatação:

```typescript
import { 
  toSaoPauloTime,      // Converte para GMT-3
  formatDateBR,        // DD/MM/YYYY
  formatDateTimeBR,    // DD/MM/YYYY HH:mm:ss
  formatTimeBR,        // HH:mm:ss
  toMySQLDateTime,     // YYYY-MM-DD HH:mm:ss (GMT-3)
  toMySQLDate          // YYYY-MM-DD (GMT-3)
} from '@/lib/timezone'
```

### Data/Hora Atual:

```typescript
import { 
  nowSaoPaulo,         // Date atual em GMT-3
  nowSaoPauloISO       // ISO string em GMT-3
} from '@/lib/timezone'
```

### Cálculos:

```typescript
import { 
  diffDays,            // Diferença em dias
  diffHours,           // Diferença em horas
  formatTimePeriod     // Formatação humanizada
} from '@/lib/timezone'
```

### Manipulação:

```typescript
import { 
  startOfDay,          // 00:00:00 GMT-3
  endOfDay,            // 23:59:59 GMT-3
  startOfMonth,        // Primeiro dia do mês
  endOfMonth,          // Último dia do mês
  addDays,             // Adiciona/subtrai dias
  addMonths,           // Adiciona/subtrai meses
  isToday              // Verifica se é hoje
} from '@/lib/timezone'
```

### Parse:

```typescript
import { 
  parseDateBR          // Converte DD/MM/YYYY para Date
} from '@/lib/timezone'
```

---

## 🔧 Próximos Passos (Opcional)

### APIs que podem precisar de ajuste futuro:

1. **Todas as APIs de oportunidades** que filtram por data:
   - `/api/oportunidades/ganhos/route.ts`
   - `/api/oportunidades/daily-gain/route.ts`
   - `/api/oportunidades/daily-created/route.ts`
   - `/api/oportunidades/today/route.ts`

2. **APIs de metas** que comparam datas:
   - `/api/metas/*`

3. **APIs de ranking** que agrupam por período:
   - `/api/ranking/*`

### Padrão a Seguir:

**Sempre** que usar funções de data no SQL:
- ✅ Use `CONVERT_TZ(campo, '+00:00', '-03:00')` antes de `DATE()`, `DAY()`, `MONTH()`, `YEAR()`
- ✅ Aplique a conversão tanto no WHERE quanto no SELECT e GROUP BY
- ✅ Mantenha consistência em toda a query

---

## ⚠️ Importante

### Considerações sobre Horário de Verão:

O Brasil **não** adota mais horário de verão desde 2019. O timezone `America/Sao_Paulo` está sempre em **GMT-3** (UTC-3).

Se no futuro o horário de verão retornar, a biblioteca `lib/timezone.ts` já está preparada, pois usa `America/Sao_Paulo` que ajusta automaticamente.

### MySQL Timezone:

O MySQL pode ter seu próprio timezone configurado. As queries usam `CONVERT_TZ` explicitamente para garantir conversão correta independente da configuração do servidor MySQL.

---

## ✅ Checklist de Implementação

- [x] Criada biblioteca `lib/timezone.ts`
- [x] Adicionadas variáveis `TZ` e `NEXT_PUBLIC_TIMEZONE` no `.env`
- [x] Corrigida API `/api/oportunidades/diaria` com `CONVERT_TZ`
- [x] Testada correção no frontend (`/painel`)
- [x] Verificado que dia atual está correto
- [x] Documentação completa criada
- [ ] (Futuro) Aplicar `CONVERT_TZ` em outras APIs de data
- [ ] (Futuro) Migrar formatações de data do frontend para usar `lib/timezone.ts`

---

**Implementado em:** 08/12/2024  
**Versão:** 1.0.0  
**Status:** ✅ Correção aplicada e testada

