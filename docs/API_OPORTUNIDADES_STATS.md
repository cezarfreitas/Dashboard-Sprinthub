# API `/api/oportunidades/stats`

API unificada para buscar estatísticas agregadas de oportunidades com filtros flexíveis.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Endpoint](#endpoint)
- [Método](#método)
- [Autenticação](#autenticação)
- [Parâmetros de Filtro](#parâmetros-de-filtro)
  - [Filtros de Status](#filtros-de-status)
  - [Filtros de Data](#filtros-de-data)
  - [Filtros de Relacionamento](#filtros-de-relacionamento)
  - [Filtros de Valor](#filtros-de-valor)
  - [Filtros de Atributos](#filtros-de-atributos)
- [Parâmetros de Agrupamento](#parâmetros-de-agrupamento)
- [Resposta](#resposta)
- [Exemplos de Uso](#exemplos-de-uso)
- [Casos de Uso Comuns](#casos-de-uso-comuns)
- [Tratamento de Erros](#tratamento-de-erros)

---

## 📖 Visão Geral

Esta API retorna estatísticas agregadas de oportunidades baseadas em filtros flexíveis. É ideal para:
- Dashboard de estatísticas
- Cards de métricas
- Gráficos e visualizações
- Relatórios consolidados
- Análise de performance por vendedor ⭐

**Retorna sempre:**
- Contagem total de oportunidades
- Soma total dos valores
- Estatísticas por status (abertas, ganhas, perdidas)
- Valores por status
- **⭐ NOVO:** Detalhamento por vendedor (quando filtrado por `user_id` ou `unidade_id`)

**Melhorias recentes:**
- ✅ Estatísticas individuais por vendedor no array `por_vendedor`
- ✅ Resposta JSON limpa (apenas filtros ativos, sem campos `null`)
- ✅ Estrutura diferenciada para dados agregados vs. agrupados
- ✅ Zero console.logs no código
- ✅ Queries otimizadas

---

## 🔗 Endpoint

```
GET /api/oportunidades/stats
```

---

## 📡 Método

**GET** - Buscar estatísticas agregadas

---

## 🔐 Autenticação

Esta rota requer autenticação. O token deve ser enviado via cookie `auth-token`.

---

## 🎯 Parâmetros de Filtro

Todos os parâmetros são **opcionais** e podem ser combinados.

### Filtros de Status

#### `status`
Filtra oportunidades por status.

**Valores aceitos:**
- `'open'` ou `'aberta'` - Oportunidades abertas (sem gain_date e sem lost_date)
- `'won'` ou `'ganha'` ou `'gain'` - Oportunidades ganhas (com gain_date)
- `'lost'` ou `'perdida'` - Oportunidades perdidas (com lost_date)
- `'all'` - Todas as oportunidades (padrão se não especificado)
- Múltiplos: `'open,won'` - Combina múltiplos status

**Exemplo:**
```
GET /api/oportunidades/stats?status=open
GET /api/oportunidades/stats?status=won,lost
GET /api/oportunidades/stats?status=all
```

---

### Filtros de Data

Todos os filtros de data aceitam formato `YYYY-MM-DD` (ex: `2025-01-15`).

#### **Data de Criação** (`createDate`)
- `created_date_start` - Data inicial (inclusiva, 00:00:00)
- `created_date_end` - Data final (inclusiva, 23:59:59)

#### **Data de Ganho** (`gain_date`)
- `gain_date_start` - Data inicial (inclusiva, 00:00:00)
- `gain_date_end` - Data final (inclusiva, 23:59:59)

#### **Data de Perda** (`lost_date`)
- `lost_date_start` - Data inicial (inclusiva, 00:00:00)
- `lost_date_end` - Data final (inclusiva, 23:59:59)

#### **Data de Reabertura** (`reopen_date`)
- `reopen_date_start` - Data inicial (inclusiva, 00:00:00)
- `reopen_date_end` - Data final (inclusiva, 23:59:59)

#### **Data Esperada de Fechamento** (`expectedCloseDate`)
- `expected_close_date_start` - Data inicial (inclusiva)
- `expected_close_date_end` - Data final (inclusiva)

#### **Data de Atualização** (`updateDate`)
- `update_date_start` - Data inicial (inclusiva, 00:00:00)
- `update_date_end` - Data final (inclusiva, 23:59:59)

#### **Última Mudança de Coluna** (`last_column_change`)
- `last_column_change_start` - Data inicial (inclusiva, 00:00:00)
- `last_column_change_end` - Data final (inclusiva, 23:59:59)

#### **Última Mudança de Status** (`last_status_change`)
- `last_status_change_start` - Data inicial (inclusiva, 00:00:00)
- `last_status_change_end` - Data final (inclusiva, 23:59:59)

**Exemplos:**
```
# Oportunidades criadas em janeiro de 2025
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31

# Oportunidades ganhas em janeiro de 2025
GET /api/oportunidades/stats?gain_date_start=2025-01-01&gain_date_end=2025-01-31

# Oportunidades criadas em janeiro e ganhas em fevereiro
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31&gain_date_start=2025-02-01&gain_date_end=2025-02-28
```

---

### Filtros de Relacionamento

#### `funil_id`
Filtra por ID do funil. Pode ser um único ID ou múltiplos separados por vírgula.

**Exemplo:**
```
GET /api/oportunidades/stats?funil_id=4
GET /api/oportunidades/stats?funil_id=4,5,6
```

#### `user_id`
Filtra por ID do vendedor. Pode ser um único ID ou múltiplos separados por vírgula.

**Exemplo:**
```
GET /api/oportunidades/stats?user_id=123
GET /api/oportunidades/stats?user_id=123,456,789
```

#### `unidade_id`
Filtra por ID da unidade. Busca todas as oportunidades dos vendedores dessa unidade.
Pode ser um único ID ou múltiplos separados por vírgula.

**Exemplo:**
```
GET /api/oportunidades/stats?unidade_id=1
GET /api/oportunidades/stats?unidade_id=1,2,3
```

#### `lead_id`
Filtra por ID do lead. Pode ser um único ID ou múltiplos separados por vírgula.

**Exemplo:**
```
GET /api/oportunidades/stats?lead_id=1001
GET /api/oportunidades/stats?lead_id=1001,1002,1003
```

---

### Filtros de Valor

#### `valor_min`
Filtra oportunidades com valor **maior ou igual** ao especificado.

**Exemplo:**
```
GET /api/oportunidades/stats?valor_min=1000
```

#### `valor_max`
Filtra oportunidades com valor **menor ou igual** ao especificado.

**Exemplo:**
```
GET /api/oportunidades/stats?valor_max=50000
```

**Combinando valor mínimo e máximo:**
```
GET /api/oportunidades/stats?valor_min=1000&valor_max=50000
```

---

### Filtros de Atributos

#### `loss_reason`
Filtra por motivo de perda. Aceita ID(s) do motivo (da tabela `motivos_de_perda`).
Pode ser um único ID ou múltiplos separados por vírgula.

**Exemplo:**
```
GET /api/oportunidades/stats?loss_reason=1
GET /api/oportunidades/stats?loss_reason=1,2,3
```

#### `gain_reason`
Filtra por motivo de ganho. Busca parcial (LIKE) no campo `gain_reason`.

**Exemplo:**
```
GET /api/oportunidades/stats?gain_reason=Negociação
```

#### `sale_channel`
Filtra por canal de venda. Busca parcial (LIKE) no campo `sale_channel`.

**Exemplo:**
```
GET /api/oportunidades/stats?sale_channel=WhatsApp
```

#### `campaign`
Filtra por campanha. Busca parcial (LIKE) no campo `campaign`.

**Exemplo:**
```
GET /api/oportunidades/stats?campaign=Black Friday
```

---

## 📊 Parâmetros de Agrupamento

### `group_by`
Agrupa os resultados por um critério específico.

**Valores aceitos:**
- `'day'` - Agrupa por dia (baseado em `createDate`)
- `'month'` - Agrupa por mês (formato `YYYY-MM`)
- `'status'` - Agrupa por status (aberta, ganha, perdida)
- `'funil'` - Agrupa por funil

**Quando usar:**
- `'day'` - Para gráficos de evolução diária
- `'month'` - Para gráficos de evolução mensal
- `'status'` - Para comparar status
- `'funil'` - Para estatísticas por funil

**Exemplo:**
```
# Estatísticas agrupadas por dia
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31&group_by=day

# Estatísticas agrupadas por funil
GET /api/oportunidades/stats?status=open&group_by=funil
```

---

## 📤 Resposta

### Resposta de Sucesso - SEM Agrupamento (200 OK)

Quando `group_by` **não** está especificado, retorna estatísticas consolidadas:

```json
{
  "success": true,
  "data": {
    "total": 150,
    "valor_total": 500000.00,
    "total_ganhas": 50,
    "total_perdidas": 30,
    "total_abertas": 70,
    "valor_ganhas": 200000.00,
    "valor_perdidas": 100000.00,
    "valor_abertas": 200000.00,
    "por_vendedor": [
      {
        "vendedor_id": 710,
        "vendedor_nome": "Bruno Shinzato de Santis",
        "total": 45,
        "valor_total": 150000.00,
        "total_ganhas": 15,
        "total_perdidas": 10,
        "total_abertas": 20,
        "valor_ganhas": 60000.00,
        "valor_perdidas": 30000.00,
        "valor_abertas": 60000.00
      },
      {
        "vendedor_id": 711,
        "vendedor_nome": "Claudia Alves da Silva",
        "total": 35,
        "valor_total": 120000.00,
        "total_ganhas": 12,
        "total_perdidas": 8,
        "total_abertas": 15,
        "valor_ganhas": 50000.00,
        "valor_perdidas": 25000.00,
        "valor_abertas": 45000.00
      }
      // ... mais vendedores (ordenado por total DESC)
    ]
  },
  "filters": {
    "status": "open",
    "unidade_id": "110"
  }
}
```

### Resposta de Sucesso - COM Agrupamento (200 OK)

Quando `group_by` **está** especificado:

```json
{
  "success": true,
  "data": {
    "agrupado_por": "day",
    "itens": [
      {
        "periodo": "2025-01-15",
        "total": 10,
        "valor_total": 25000.00,
        "total_ganhas": 3,
        "total_perdidas": 2,
        "total_abertas": 5,
        "valor_ganhas": 10000.00,
        "valor_perdidas": 5000.00,
        "valor_abertas": 10000.00
      },
      {
        "periodo": "2025-01-16",
        "total": 15,
        "valor_total": 35000.00,
        "total_ganhas": 5,
        "total_perdidas": 3,
        "total_abertas": 7,
        "valor_ganhas": 15000.00,
        "valor_perdidas": 8000.00,
        "valor_abertas": 12000.00
      }
      // ... mais períodos
    ],
    "por_vendedor": [
      // Array com estatísticas por vendedor (mesmo formato acima)
    ]
  },
  "filters": {
    "status": "open",
    "group_by": "day"
  }
}
```

### Campos da Resposta

#### Estrutura da Resposta

A resposta varia dependendo se `group_by` está ativo ou não:

##### **SEM `group_by` (resposta consolidada)**

```typescript
{
  data: {
    total: number              // Total de oportunidades
    valor_total: number        // Soma de todos os valores
    total_ganhas: number       // Contagem de oportunidades ganhas
    total_perdidas: number     // Contagem de oportunidades perdidas
    total_abertas: number      // Contagem de oportunidades abertas
    valor_ganhas: number       // Soma dos valores ganhos
    valor_perdidas: number     // Soma dos valores perdidos
    valor_abertas: number      // Soma dos valores abertos
    por_vendedor?: [           // ⭐ NOVO: Estatísticas por vendedor (apenas se houver filtro de user_id ou unidade_id)
      {
        vendedor_id: number    // ID do vendedor
        vendedor_nome: string  // Nome completo do vendedor
        total: number          // Total de oportunidades do vendedor
        valor_total: number    // Soma dos valores do vendedor
        total_ganhas: number   // Oportunidades ganhas do vendedor
        total_perdidas: number // Oportunidades perdidas do vendedor
        total_abertas: number  // Oportunidades abertas do vendedor
        valor_ganhas: number   // Valores ganhos do vendedor
        valor_perdidas: number // Valores perdidos do vendedor
        valor_abertas: number  // Valores abertos do vendedor
      }
    ]
  },
  filters?: {                  // ⭐ NOVO: Apenas filtros ativos (campos null não aparecem)
    status?: string
    unidade_id?: string
    // ... apenas filtros usados
  }
}
```

##### **COM `group_by` (resposta agrupada)**

```typescript
{
  data: {
    agrupado_por: string       // Tipo de agrupamento: 'day' | 'month' | 'status' | 'funil'
    itens: [                   // Array com um item por grupo
      {
        periodo: string        // Identificador do período/grupo
        funil_id?: number      // ID do funil (apenas quando group_by=funil)
        total: number
        valor_total: number
        total_ganhas: number
        total_perdidas: number
        total_abertas: number
        valor_ganhas: number
        valor_perdidas: number
        valor_abertas: number
      }
    ],
    por_vendedor?: [           // ⭐ NOVO: Estatísticas por vendedor
      // ... mesmo formato acima
    ]
  },
  filters?: {                  // ⭐ NOVO: Apenas filtros ativos
    // ...
  }
}
```

#### `por_vendedor` (Array, opcional) ⭐ NOVO

**Quando aparece:**
- Quando há filtro de `user_id` (IDs específicos de vendedores)
- Quando há filtro de `unidade_id` (vendedores da unidade)

**Características:**
- ✅ Ordenado por `total` (quantidade de oportunidades) em ordem decrescente
- ✅ Inclui nome completo do vendedor (`name + lastName`)
- ✅ Todas as métricas são separadas por vendedor
- ✅ Permite análise individual de performance

**Exemplo de uso:**
```typescript
// Buscar estatísticas da unidade 110
GET /api/oportunidades/stats?unidade_id=110&status=open

// Resposta inclui array por_vendedor com todos os 11 vendedores da unidade
```

#### `filters` (Object, opcional) ⭐ NOVO

**Mudança importante:** Agora retorna **apenas filtros ativos**.

- ❌ **Antes:** Retornava todos os filtros possíveis, a maioria com valor `null`
- ✅ **Agora:** Retorna apenas os filtros que foram aplicados na requisição

**Benefícios:**
- Resposta JSON mais limpa e menor
- Facilita identificar quais filtros estão ativos
- Reduz tráfego de rede

---

### Resposta de Erro (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Erro ao buscar estatísticas de oportunidades",
  "error": "Mensagem de erro detalhada"
}
```

---

## 💡 Exemplos de Uso

### 1. Estatísticas Gerais (Sem Filtros)

```typescript
GET /api/oportunidades/stats
```

**Retorna:** Estatísticas de todas as oportunidades não arquivadas.

---

### 2. Estatísticas de Oportunidades Abertas

```typescript
GET /api/oportunidades/stats?status=open
```

---

### 3. Estatísticas de Oportunidades Ganhas em Janeiro

```typescript
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31
```

---

### 4. Estatísticas por Unidade e Período

```typescript
GET /api/oportunidades/stats?unidade_id=1&created_date_start=2025-01-01&created_date_end=2025-01-31
```

---

### 5. Estatísticas de Oportunidades Criadas e Ganhas em Períodos Diferentes

```typescript
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31&gain_date_start=2025-02-01&gain_date_end=2025-02-28
```

**Retorna:** Oportunidades criadas em janeiro que foram ganhas em fevereiro.

---

### 6. Estatísticas Agrupadas por Dia (Para Gráficos)

```typescript
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31&group_by=day
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "total": 10,
        "valor_total": 25000.00,
        "periodo": "2025-01-01"
      },
      {
        "total": 15,
        "valor_total": 35000.00,
        "periodo": "2025-01-02"
      }
      // ... mais dias
    ]
  }
}
```

---

### 7. Estatísticas Agrupadas por Funil

```typescript
GET /api/oportunidades/stats?status=open&group_by=funil
```

---

### 8. Filtros Combinados Completo

```typescript
GET /api/oportunidades/stats?
  status=won
  &funil_id=4
  &unidade_id=1,2
  &gain_date_start=2025-01-01
  &gain_date_end=2025-01-31
  &valor_min=1000
  &valor_max=50000
  &sale_channel=WhatsApp
```

---

### 9. Estatísticas de Oportunidades Perdidas por Motivo

```typescript
GET /api/oportunidades/stats?status=lost&loss_reason=1&lost_date_start=2025-01-01&lost_date_end=2025-01-31
```

---

### 10. Estatísticas de Oportunidades de Alto Valor

```typescript
GET /api/oportunidades/stats?valor_min=50000&created_date_start=2025-01-01&created_date_end=2025-01-31
```

---

### 11. Estatísticas por Unidade com Detalhamento por Vendedor ⭐ NOVO

```typescript
GET /api/oportunidades/stats?unidade_id=110&status=open
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total": 144,
    "valor_total": 693343.20,
    "total_ganhas": 0,
    "total_perdidas": 0,
    "total_abertas": 144,
    "valor_ganhas": 0,
    "valor_perdidas": 0,
    "valor_abertas": 693343.20,
    "por_vendedor": [
      {
        "vendedor_id": 710,
        "vendedor_nome": "Bruno Shinzato de Santis",
        "total": 25,
        "valor_total": 120500.00,
        "total_ganhas": 0,
        "total_perdidas": 0,
        "total_abertas": 25,
        "valor_ganhas": 0,
        "valor_perdidas": 0,
        "valor_abertas": 120500.00
      },
      {
        "vendedor_id": 711,
        "vendedor_nome": "Claudia Alves da Silva",
        "total": 18,
        "valor_total": 89000.00,
        "total_ganhas": 0,
        "total_perdidas": 0,
        "total_abertas": 18,
        "valor_ganhas": 0,
        "valor_perdidas": 0,
        "valor_abertas": 89000.00
      }
      // ... 9 vendedores adicionais
    ]
  },
  "filters": {
    "status": "open",
    "unidade_id": "110"
  }
}
```

---

### 12. Estatísticas de Vendedores Específicos ⭐ NOVO

```typescript
GET /api/oportunidades/stats?user_id=710,711,713&status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31
```

**Retorna:** Estatísticas consolidadas + detalhamento individual dos 3 vendedores especificados.

---

## 🎯 Casos de Uso Comuns

### Dashboard Principal
```typescript
// Card de Oportunidades Abertas
GET /api/oportunidades/stats?status=open

// Card de Oportunidades Ganhas (mês atual)
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31

// Card de Oportunidades Perdidas (mês atual)
GET /api/oportunidades/stats?status=lost&lost_date_start=2025-01-01&lost_date_end=2025-01-31
```

### Gráfico de Evolução Diária
```typescript
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31&group_by=day
```

### Gráfico de Evolução Mensal
```typescript
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-12-31&group_by=month
```

### Estatísticas por Unidade
```typescript
GET /api/oportunidades/stats?unidade_id=1&created_date_start=2025-01-01&created_date_end=2025-01-31
```

### Estatísticas por Funil
```typescript
GET /api/oportunidades/stats?funil_id=4&status=open&group_by=status
```

### Análise de Conversão
```typescript
// Criadas no período
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31

// Ganhas no mesmo período (criadas antes ou durante)
GET /api/oportunidades/stats?gain_date_start=2025-01-01&gain_date_end=2025-01-31

// Calcular taxa de conversão: total_ganhas / total_criadas
```

---

## ❌ Tratamento de Erros

### Erro 500 - Erro Interno do Servidor

```json
{
  "success": false,
  "message": "Erro ao buscar estatísticas de oportunidades",
  "error": "Descrição detalhada do erro"
}
```

**Possíveis causas:**
- Erro de conexão com o banco de dados
- Query SQL inválida
- Erro de validação de parâmetros

---

## 📝 Notas Importantes

1. **Formato de Data:** Todos os filtros de data aceitam formato `YYYY-MM-DD`
2. **Valores Múltiplos:** IDs podem ser separados por vírgula: `funil_id=4,5,6`
3. **Busca Parcial:** `gain_reason`, `sale_channel` e `campaign` usam busca parcial (LIKE)
4. **Arquivadas:** Oportunidades arquivadas (`archived = 1`) são sempre excluídas
5. **Agrupamento:** Quando `group_by` está ativo, o array `stats` pode ter múltiplos itens
6. **Campos Consolidados:** Quando `group_by` não está ativo, campos consolidados são retornados na raiz de `data`

---

## 🔗 Relacionamentos

- **Funil:** Através de `coluna_funil_id` → `colunas_funil` → `funis`
- **Vendedor:** Através de `user` (campo VARCHAR convertido para INT)
- **Unidade:** Através de `user` → `vendedores` → `unidades`
- **Motivo de Perda:** Através de `loss_reason` → `motivos_de_perda`

---

## 🚀 Performance

- Usa índices do banco de dados para otimização
- Suporta múltiplos filtros combinados eficientemente
- Queries otimizadas para estatísticas agregadas
- Cache do Next.js quando apropriado

---

---

## 🔌 Integração com Outras APIs

A API `/api/oportunidades/stats` é usada internamente por outras APIs do sistema:

### `/api/unidades/painel`

A API de painel de unidades foi refatorada para usar `/api/oportunidades/stats` internamente, trazendo os seguintes benefícios:

- ✅ **Código mais limpo**: Redução de ~250 linhas de código
- ✅ **Manutenibilidade**: Lógica centralizada em um único lugar
- ✅ **Performance**: Reutilização de queries otimizadas
- ✅ **Consistência**: Mesma lógica de filtros em todas as APIs
- ✅ **Menos bugs**: Menos duplicação = menos pontos de falha

**Antes:** Queries SQL separadas para abertas, ganhas e perdidas  
**Agora:** 3 chamadas à API `/api/oportunidades/stats` (uma para cada status)

---

**Última atualização:** 20/11/2025

