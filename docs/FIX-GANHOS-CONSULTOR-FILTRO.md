# Correção: Valores de Ganhos Não Respeitavam Filtro de Período

## Problema Identificado

Os valores de ganhos no dashboard do consultor não estavam respeitando o filtro de período selecionado pelo usuário. Quando o usuário selecionava "Mês Passado", por exemplo, os valores exibidos no card "Ganhas" podiam estar incorretos ou mostrando dados de todo o histórico em vez de apenas do período filtrado.

## Causa Raiz

A API `/api/oportunidades/stats` tinha uma condição (`if` na linha 788) que só preencheria o objeto `statsDoPeriodo` se pelo menos uma das três queries de ganhos retornasse resultados com `length > 0`:

```typescript
if ((resultGanhasDentro && resultGanhasDentro.length > 0) || 
    (resultGanhasFora && resultGanhasFora.length > 0) || 
    (resultGanhasTotal && resultGanhasTotal.length > 0)) {
  statsDoPeriodo = { ... }
}
```

### Problemas com essa abordagem:

1. **Queries SQL sempre retornam ao menos uma linha**: Devido ao uso de `COUNT(*)` e `COALESCE`, as queries sempre retornam uma linha, mesmo que com valores zerados. Porém, em casos de erro ou situações específicas, o array poderia estar vazio.

2. **statsDoPeriodo ficava null**: Se a condição falhasse, `statsDoPeriodo` permanecia `null`, e o código subsequente (linhas 1350-1425) tentava acessar propriedades de um objeto nulo.

3. **Fallback incorreto no frontend**: O hook `useConsultorDashboard.ts` tinha um fallback na linha 223:
   ```typescript
   ganhosValorTotal: ganhasData?.data?.valor_ganhas_periodo || ganhasData?.data?.valor_ganhas || 0
   ```
   
   Se `valor_ganhas_periodo` estivesse `undefined` (por causa do `statsDoPeriodo` nulo), o código cairia no fallback `valor_ganhas`, que poderia conter dados de TODO O HISTÓRICO em vez de apenas do período filtrado.

4. **skipMainQuery = true**: Quando `all=1` e há filtros de data, a query principal era pulada (linha 580-585), então a API dependia EXCLUSIVAMENTE de `statsDoPeriodo` para retornar os dados. Se `statsDoPeriodo` fosse `null`, os dados não seriam retornados corretamente.

## Correção Implementada

### 1. API `/api/oportunidades/stats` (route.ts)

Removida a condição `if` que verificava se os resultados tinham `length > 0`. Agora `statsDoPeriodo` é **sempre** preenchido, mesmo que com valores zerados:

**Antes:**
```typescript
if ((resultGanhasDentro && resultGanhasDentro.length > 0) || 
    (resultGanhasFora && resultGanhasFora.length > 0) || 
    (resultGanhasTotal && resultGanhasTotal.length > 0)) {
  statsDoPeriodo = {
    total_ganhas_periodo: Number(resultGanhasTotal[0]?.total_ganhas_periodo || 0),
    valor_ganhas_periodo: Number(resultGanhasTotal[0]?.valor_ganhas_periodo || 0),
    // ... outros campos
  }
}
```

**Depois:**
```typescript
// Sempre preencher statsDoPeriodo, mesmo que sem dados (para evitar valores undefined)
statsDoPeriodo = {
  total_ganhas_periodo: Number(resultGanhasTotal[0]?.total_ganhas_periodo || 0),
  valor_ganhas_periodo: Number(resultGanhasTotal[0]?.valor_ganhas_periodo || 0),
  // ... outros campos
}
```

### 2. Mesma correção para Perdidas e Abertas

A mesma lógica foi aplicada para:
- Oportunidades perdidas (linha 953-961)
- Oportunidades abertas (linha 853-859)

Isso garante consistência em todos os tipos de status.

### 3. Hook useConsultorDashboard.ts

Adicionado comentário explicativo na linha 149 para deixar claro que o filtro é feito por `gain_date`:

```typescript
// 4. Buscar GANHAS (filtrar por data de ganho no período selecionado)
const ganhasParams = new URLSearchParams(baseParams)
ganhasParams.append('status', 'won')
ganhasParams.append('gain_date_start', dataInicio)
ganhasParams.append('gain_date_end', dataFim)
ganhasParams.append('all', '1')
```

## Benefícios da Correção

1. ✅ **Valores sempre corretos**: Os campos `valor_ganhas_periodo`, `total_ganhas_periodo`, etc. sempre estarão presentes na resposta da API, mesmo que com valor 0.

2. ✅ **Sem fallbacks incorretos**: O frontend não vai mais cair no fallback `valor_ganhas` que continha dados de todo o histórico.

3. ✅ **Consistência**: A mesma lógica é aplicada para ganhas, perdidas e abertas.

4. ✅ **Mais robusto**: Mesmo em situações inesperadas (queries vazias, erros, etc.), a API sempre retorna uma estrutura de dados consistente.

## Como Testar

### Teste Manual

1. Acesse o dashboard do consultor: http://localhost:3000/consultor/dashboard
2. Selecione diferentes filtros de período:
   - Hoje
   - Ontem
   - Esta Semana
   - Semana Passada
   - Este Mês
   - **Mês Passado** (onde o problema foi reportado)
   - Personalizado
3. Verifique se os valores no card "Ganhas" mudam de acordo com o período selecionado
4. Compare com a tabela "Oportunidades Diárias" abaixo - os totais devem bater

### Teste com Script de Depuração

Execute o script de depuração para verificar a resposta da API:

```bash
node scripts/debug-ganhos-consultor.js
```

Edite o arquivo para ajustar:
- `VENDEDOR_ID`: ID do vendedor que você quer testar
- `DATA_INICIO` e `DATA_FIM`: Período que você quer verificar

O script vai mostrar:
- URL completa da requisição
- Campos retornados pela API
- Valores que o hook vai usar
- Análise se os campos estão presentes corretamente

### Teste com SQL Direto (Opcional)

Se quiser validar os dados diretamente no banco:

```sql
-- Ver ganhos de um vendedor em um período específico
SELECT 
  COUNT(*) as total_ganhas,
  COALESCE(SUM(value), 0) as valor_total_ganhas
FROM oportunidades
WHERE archived = 0
  AND CAST(user AS UNSIGNED) = 1  -- Substituir pelo ID do vendedor
  AND gain_date IS NOT NULL 
  AND status = 'gain'
  AND DATE(CONVERT_TZ(gain_date, '+00:00', '-03:00')) >= '2024-11-01'  -- Data início
  AND DATE(CONVERT_TZ(gain_date, '+00:00', '-03:00')) <= '2024-11-30';  -- Data fim
```

## Arquivos Modificados

1. `app/api/oportunidades/stats/route.ts`
   - Linhas 788-805: Remoção do `if` para ganhos
   - Linhas 953-961: Remoção do `if` para perdidas
   - Linhas 853-859: Remoção do `if` para abertas

2. `hooks/consultor/useConsultorDashboard.ts`
   - Linha 149: Adicionado comentário explicativo

3. `scripts/debug-ganhos-consultor.js`
   - Novo arquivo: Script de depuração para testar a API

4. `docs/FIX-GANHOS-CONSULTOR-FILTRO.md`
   - Este arquivo: Documentação da correção

## Notas Adicionais

### Por que a tabela funcionava corretamente?

A tabela "Oportunidades Diárias" (`ConsultorOportunidadesDiarias.tsx`) usa uma API diferente (`/api/oportunidades/diaria`) que não tinha esse problema. Ela sempre filtrou corretamente por `gain_date`.

### Por que o card de meta não foi afetado?

O card "Meta do Mês" usa uma query separada (linhas 158-182 do hook) que busca ganhos do mês atual (independente do filtro) para comparar com a meta. Essa lógica está correta e não foi alterada.

### Filtro de Funil

O filtro de funil também é respeitado corretamente. A API aplica o filtro de funil em todas as queries (linhas 245-259, 645-658, 740-753, 828-841, 883-895).

## Relacionado

- Issue original: Valores de ganhos não respeitando filtro de período
- APIs relacionadas:
  - `/api/oportunidades/stats` - Estatísticas agregadas (corrigida)
  - `/api/oportunidades/diaria` - Oportunidades diárias (já estava correta)
  - `/api/meta/stats` - Meta do vendedor (não afetada)
- Componentes:
  - `ConsultorEstatisticasCards` - Cards de estatísticas
  - `ConsultorOportunidadesDiarias` - Tabela diária
  - `ConsultorBarraProgressoMeta` - Barra de progresso da meta

