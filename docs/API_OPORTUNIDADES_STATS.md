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
- [Parâmetro Especial: `all=1`](#parâmetro-especial-all1)
- [Resposta](#resposta)
- [Exemplos de Uso](#exemplos-de-uso)
- [Casos de Uso Comuns](#casos-de-uso-comuns)
- [Tratamento de Erros](#tratamento-de-erros)
- [Timezone](#timezone)

---

## 📖 Visão Geral

Esta API retorna estatísticas agregadas de oportunidades baseadas em filtros flexíveis. É ideal para:
- Dashboard de estatísticas
- Cards de métricas
- Gráficos e visualizações
- Relatórios consolidados
- Análise de performance por vendedor

**Retorna sempre:**
- Contagem total de oportunidades
- Soma total dos valores
- Estatísticas por status (abertas, ganhas, perdidas)
- Valores por status
- Detalhamento por vendedor (quando filtrado por `user_id` ou `unidade_id`)
- Informações de unidades (quando filtrado por `unidade_id`)

**Características:**
- ✅ Estatísticas individuais por vendedor no array `por_vendedor`
- ✅ Resposta JSON limpa (apenas filtros ativos, sem campos `null`)
- ✅ Estrutura diferenciada para dados agregados vs. agrupados
- ✅ Suporte ao parâmetro `all=1` para análises detalhadas
- ✅ Timezone: Todas as datas são tratadas no timezone de São Paulo (America/Sao_Paulo)
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
- `open` ou `aberta` - Oportunidades abertas (sem `gain_date` e sem `lost_date`)
- `won` ou `gain` ou `ganha` - Oportunidades ganhas (com `gain_date`)
- `lost` ou `perdida` - Oportunidades perdidas (com `lost_date`)
- `all` - Todas as oportunidades (sem filtro de status)
- Múltiplos valores separados por vírgula: `open,won` ou `open,ganha`

**Exemplos:**
```
# Apenas oportunidades abertas
GET /api/oportunidades/stats?status=open

# Apenas oportunidades ganhas
GET /api/oportunidades/stats?status=won

# Oportunidades abertas e ganhas
GET /api/oportunidades/stats?status=open,won

# Todas as oportunidades
GET /api/oportunidades/stats?status=all
```

---

### Filtros de Data

Todas as datas devem estar no formato **YYYY-MM-DD** (ex: `2025-01-15`).

**⚠️ IMPORTANTE:** Todas as comparações de data são feitas no timezone de **São Paulo (America/Sao_Paulo)**. O banco de dados armazena datas em UTC, mas a API converte automaticamente para o horário de São Paulo.

#### Datas de Criação (`createDate`)
- `created_date_start` - Data inicial (inclusiva, 00:00:00 São Paulo)
- `created_date_end` - Data final (inclusiva, 23:59:59 São Paulo)

#### Datas de Ganho (`gain_date`)
- `gain_date_start` - Data inicial (inclusiva, 00:00:00 São Paulo)
- `gain_date_end` - Data final (inclusiva, 23:59:59 São Paulo)

#### Datas de Perda (`lost_date`)
- `lost_date_start` - Data inicial (inclusiva, 00:00:00 São Paulo)
- `lost_date_end` - Data final (inclusiva, 23:59:59 São Paulo)

#### Datas de Reabertura (`reopen_date`)
- `reopen_date_start` - Data inicial (inclusiva, 00:00:00 São Paulo)
- `reopen_date_end` - Data final (inclusiva, 23:59:59 São Paulo)

#### Data Esperada de Fechamento (`expectedCloseDate`)
- `expected_close_date_start` - Data inicial (inclusiva, 00:00:00 São Paulo)
- `expected_close_date_end` - Data final (inclusiva, 23:59:59 São Paulo)

#### Data de Atualização (`updateDate`)
- `update_date_start` - Data inicial (inclusiva, 00:00:00 São Paulo)
- `update_date_end` - Data final (inclusiva, 23:59:59 São Paulo)

#### Última Mudança de Coluna (`last_column_change`)
- `last_column_change_start` - Data inicial (inclusiva, 00:00:00 São Paulo)
- `last_column_change_end` - Data final (inclusiva, 23:59:59 São Paulo)

#### Última Mudança de Status (`last_status_change`)
- `last_status_change_start` - Data inicial (inclusiva, 00:00:00 São Paulo)
- `last_status_change_end` - Data final (inclusiva, 23:59:59 São Paulo)

**Exemplos:**
```
# Oportunidades criadas em janeiro de 2025
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31

# Oportunidades ganhas em janeiro de 2025
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31

# Oportunidades perdidas em janeiro de 2025
GET /api/oportunidades/stats?status=lost&lost_date_start=2025-01-01&lost_date_end=2025-01-31

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
Filtra por ID da unidade. Busca todas as oportunidades dos vendedores ativos dessa unidade.
Pode ser um único ID ou múltiplos separados por vírgula.

**⚠️ IMPORTANTE:** Apenas vendedores **ativos** são considerados. Se a unidade não tiver vendedores ativos, a resposta será vazia.

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
Filtra por motivo de perda. Aceita ID único ou múltiplos separados por vírgula.

**Formato:** O ID pode estar com ou sem o prefixo "Motivo " (ex: `"Motivo 5"` ou `5`).

**Exemplo:**
```
GET /api/oportunidades/stats?loss_reason=5
GET /api/oportunidades/stats?loss_reason=5,10,15
```

#### `gain_reason`
Filtra por motivo de ganho. Busca parcial (LIKE).

**Exemplo:**
```
GET /api/oportunidades/stats?gain_reason=Negociação
```

#### `sale_channel`
Filtra por canal de venda. Busca parcial (LIKE).

**Exemplo:**
```
GET /api/oportunidades/stats?sale_channel=WhatsApp
```

#### `campaign`
Filtra por campanha. Busca parcial (LIKE).

**Exemplo:**
```
GET /api/oportunidades/stats?campaign=Black Friday
```

---

## 📊 Parâmetros de Agrupamento

#### `group_by`
Agrupa os resultados por um critério específico.

**Valores aceitos:**
- `day` - Agrupa por dia (formato: `YYYY-MM-DD`)
- `month` - Agrupa por mês (formato: `YYYY-MM`)
- `status` - Agrupa por status (`aberta`, `ganha`, `perdida`)
- `funil` - Agrupa por funil (retorna `funil_id` e `funil_nome`)

**Exemplo:**
```
# Agrupado por dia (para gráficos)
GET /api/oportunidades/stats?group_by=day&created_date_start=2025-01-01&created_date_end=2025-01-31

# Agrupado por mês
GET /api/oportunidades/stats?group_by=month&created_date_start=2025-01-01&created_date_end=2025-12-31

# Agrupado por status
GET /api/oportunidades/stats?group_by=status

# Agrupado por funil
GET /api/oportunidades/stats?group_by=funil
```

**Resposta com agrupamento:**
```json
{
  "success": true,
  "data": {
    "agrupado_por": "day",
    "itens": [
      {
        "periodo": "2025-01-01",
        "total": 10,
        "valor_total": 50000,
        "total_ganhas": 5,
        "valor_ganhas": 30000,
        "total_perdidas": 2,
        "valor_perdidas": 10000,
        "total_abertas": 3,
        "valor_abertas": 10000
      }
    ]
  }
}
```

---

## 🔍 Parâmetro Especial: `all=1`

O parâmetro `all=1` retorna informações detalhadas sobre o período, incluindo divisão entre oportunidades criadas dentro e fora do período de filtro.

### Como Funciona

Quando `all=1` é usado junto com filtros de data, a API retorna:
1. **Total geral** (todas as oportunidades que atendem aos filtros, sem considerar data de criação)
2. **Divisão por período de criação** (criadas dentro vs. fora do período)

### Uso com `status=open`

**Exemplo:**
```
GET /api/oportunidades/stats?status=open&created_date_start=2025-01-01&created_date_end=2025-01-31&all=1&unidade_id=92
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total_abertas": 100,
    "valor_abertas": 500000,
    "total_abertas_geral": 100,
    "total_abertas_periodo": 60,
    "total_abertas_fora_periodo": 40,
    "valor_abertas_periodo": 300000,
    "valor_abertas_fora_periodo": 200000,
    "resumo_periodo": {
      "total_oportunidades": 60,
      "valor_total": 300000,
      "media_valor": 5000,
      "percentual_do_total": 60,
      "percentual_valor": 60,
      "periodo_inicio": "2025-01-01",
      "periodo_fim": "2025-01-31"
    },
    "resumo_geral": {
      "total_oportunidades": 100,
      "valor_total": 500000,
      "media_valor": 5000
    },
    "resumo_fora_periodo": {
      "total_oportunidades": 40,
      "valor_total": 200000,
      "media_valor": 5000,
      "percentual_do_total": 40,
      "percentual_valor": 40
    }
  }
}
```

### Uso com `status=lost`

**Exemplo:**
```
GET /api/oportunidades/stats?status=lost&lost_date_start=2025-01-01&lost_date_end=2025-01-31&all=1&unidade_id=92
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total_perdidas": 50,
    "valor_perdidas": 250000,
    "total_perdidas_periodo": 50,
    "valor_perdidas_periodo": 250000,
    "total_perdidas_dentro_createDate": 35,
    "valor_perdidas_dentro_createDate": 175000,
    "total_perdidas_fora_createDate": 15,
    "valor_perdidas_fora_createDate": 75000,
    "resumo_periodo": {
      "total_oportunidades": 50,
      "valor_total": 250000,
      "media_valor": 5000,
      "periodo_inicio": "2025-01-01",
      "periodo_fim": "2025-01-31"
    },
    "resumo_dentro_createDate": {
      "total_oportunidades": 35,
      "valor_total": 175000,
      "media_valor": 5000,
      "percentual_do_total": 70,
      "percentual_valor": 70
    },
    "resumo_fora_createDate": {
      "total_oportunidades": 15,
      "valor_total": 75000,
      "media_valor": 5000,
      "percentual_do_total": 30,
      "percentual_valor": 30
    }
  }
}
```

### Uso com `status=won` ou `status=gain`

**Exemplo:**
```
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31&all=1&unidade_id=92
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total_ganhas": 30,
    "valor_ganhas": 150000,
    "total_ganhas_periodo": 30,
    "valor_ganhas_periodo": 150000,
    "ticket_medio_periodo": 5000,
    "valor_minimo_periodo": 1000,
    "valor_maximo_periodo": 20000,
    "total_ganhas_dentro_createDate": 20,
    "valor_ganhas_dentro_createDate": 100000,
    "ticket_medio_dentro_createDate": 5000,
    "total_ganhas_fora_createDate": 10,
    "valor_ganhas_fora_createDate": 50000,
    "ticket_medio_fora_createDate": 5000,
    "total_criadas_periodo": 100,
    "taxa_conversao": 20,
    "taxa_conversao_completa": 30,
    "resumo_periodo": {
      "total_oportunidades": 30,
      "valor_total": 150000,
      "media_valor": 5000,
      "ticket_medio": 5000,
      "valor_minimo": 1000,
      "valor_maximo": 20000,
      "periodo_inicio": "2025-01-01",
      "periodo_fim": "2025-01-31",
      "taxa_conversao_completa": 30
    },
    "resumo_dentro_createDate": {
      "total_oportunidades": 20,
      "valor_total": 100000,
      "media_valor": 5000,
      "ticket_medio": 5000,
      "percentual_do_total": 66.67,
      "percentual_valor": 66.67,
      "taxa_conversao": 20
    },
    "resumo_fora_createDate": {
      "total_oportunidades": 10,
      "valor_total": 50000,
      "media_valor": 5000,
      "ticket_medio": 5000,
      "percentual_do_total": 33.33,
      "percentual_valor": 33.33
    }
  }
}
```

**Explicação dos campos:**
- `total_ganhas_periodo`: Total de oportunidades ganhas no período (filtrado por `gain_date`)
- `total_ganhas_dentro_createDate`: Oportunidades ganhas no período que foram **criadas** dentro do período
- `total_ganhas_fora_createDate`: Oportunidades ganhas no período que foram **criadas** fora do período
- `total_criadas_periodo`: Total de oportunidades criadas no período (para cálculo de taxa de conversão)
- `taxa_conversao`: (ganhas criadas no período / criadas no período) × 100
- `taxa_conversao_completa`: (todas as ganhas no período / criadas no período) × 100

---

## 📤 Resposta

### Estrutura Base

```json
{
  "success": true,
  "data": { ... },
  "filters": { ... },
  "unidade_info": [ ... ]
}
```

### Campos Principais

#### `success`
Boolean indicando se a requisição foi bem-sucedida.

#### `data`
Objeto contendo as estatísticas. A estrutura varia conforme o uso de `group_by` e `all=1`.

#### `filters`
Objeto contendo todos os filtros aplicados (apenas filtros ativos, sem valores `null`).

#### `unidade_info`
Array de objetos com informações das unidades filtradas (apenas quando `unidade_id` é usado).

```json
"unidade_info": [
  {
    "id": 92,
    "nome": "VILA MARIANA"
  }
]
```

### Resposta Sem Agrupamento (Padrão)

```json
{
  "success": true,
  "data": {
    "total": 150,
    "valor_total": 750000,
    "total_ganhas": 50,
    "valor_ganhas": 300000,
    "total_perdidas": 30,
    "valor_perdidas": 150000,
    "total_abertas": 70,
    "valor_abertas": 300000,
    "won_time": 15.5,
    "lost_time": 10.2,
    "open_time": 25.3,
    "media_valor_ganhas": 6000,
    "media_valor_perdidas": 5000,
    "media_valor_abertas": 4285.71,
    "percentual_ganhas": 33.33,
    "percentual_perdidas": 20,
    "percentual_abertas": 46.67,
    "percentual_valor_ganhas": 40,
    "percentual_valor_perdidas": 20,
    "percentual_valor_abertas": 40,
    "por_vendedor": [
      {
        "vendedor_id": 123,
        "vendedor_nome": "João Silva",
        "total": 50,
        "valor_total": 250000,
        "total_ganhas": 20,
        "valor_ganhas": 120000,
        "total_perdidas": 10,
        "valor_perdidas": 50000,
        "total_abertas": 20,
        "valor_abertas": 80000,
        "won_time": 12.5,
        "lost_time": 8.3,
        "open_time": 20.1
      }
    ]
  },
  "filters": {
    "status": "all",
    "unidade_id": "92",
    "created_date_start": "2025-01-01",
    "created_date_end": "2025-01-31"
  },
  "unidade_info": [
    {
      "id": 92,
      "nome": "VILA MARIANA"
    }
  ]
}
```

### Campos da Resposta

#### Campos Sempre Presentes
- `total`: Total de oportunidades
- `valor_total`: Soma total dos valores

#### Campos Condicionais (baseado no status filtrado)

**Se não filtrar apenas por `lost` ou `open`:**
- `total_ganhas`: Total de oportunidades ganhas
- `valor_ganhas`: Soma dos valores das oportunidades ganhas
- `won_time`: Tempo médio (em dias) entre criação e ganho
- `media_valor_ganhas`: Valor médio das oportunidades ganhas
- `percentual_ganhas`: Percentual de oportunidades ganhas
- `percentual_valor_ganhas`: Percentual do valor total representado por ganhas

**Se não filtrar apenas por `gain` ou `open`:**
- `total_perdidas`: Total de oportunidades perdidas
- `valor_perdidas`: Soma dos valores das oportunidades perdidas
- `lost_time`: Tempo médio (em dias) entre criação e perda
- `media_valor_perdidas`: Valor médio das oportunidades perdidas
- `percentual_perdidas`: Percentual de oportunidades perdidas
- `percentual_valor_perdidas`: Percentual do valor total representado por perdidas

**Se não filtrar apenas por `gain` ou `lost`:**
- `total_abertas`: Total de oportunidades abertas
- `valor_abertas`: Soma dos valores das oportunidades abertas
- `open_time`: Tempo médio (em dias) desde a criação até agora
- `media_valor_abertas`: Valor médio das oportunidades abertas
- `percentual_abertas`: Percentual de oportunidades abertas
- `percentual_valor_abertas`: Percentual do valor total representado por abertas

**Se filtrar por `user_id` ou `unidade_id`:**
- `por_vendedor`: Array com estatísticas individuais por vendedor

---

## 💡 Exemplos de Uso

### 1. Estatísticas Gerais
```
GET /api/oportunidades/stats
```

### 2. Oportunidades Abertas de uma Unidade
```
GET /api/oportunidades/stats?status=open&unidade_id=92
```

### 3. Oportunidades Ganhas em um Período
```
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31
```

### 4. Oportunidades Perdidas em um Período com Detalhamento
```
GET /api/oportunidades/stats?status=lost&lost_date_start=2025-01-01&lost_date_end=2025-01-31&all=1&unidade_id=92
```

### 5. Oportunidades Criadas em um Período (Todos os Status)
```
GET /api/oportunidades/stats?created_date_start=2025-01-01&created_date_end=2025-01-31&unidade_id=92
```

### 6. Oportunidades de um Funil Específico
```
GET /api/oportunidades/stats?funil_id=4&created_date_start=2025-01-01&created_date_end=2025-01-31
```

### 7. Oportunidades de Múltiplos Vendedores
```
GET /api/oportunidades/stats?user_id=123,456,789&created_date_start=2025-01-01&created_date_end=2025-01-31
```

### 8. Oportunidades com Valor Mínimo
```
GET /api/oportunidades/stats?valor_min=10000&status=open
```

### 9. Gráfico de Oportunidades Criadas por Dia
```
GET /api/oportunidades/stats?group_by=day&created_date_start=2025-01-01&created_date_end=2025-01-31
```

### 10. Estatísticas por Funil
```
GET /api/oportunidades/stats?group_by=funil&created_date_start=2025-01-01&created_date_end=2025-01-31
```

### 11. Oportunidades Ganhas com Taxa de Conversão
```
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31&all=1&unidade_id=92
```

### 12. Oportunidades Abertas Criadas no Período vs. Outros Períodos
```
GET /api/oportunidades/stats?status=open&created_date_start=2025-01-01&created_date_end=2025-01-31&all=1&unidade_id=92
```

---

## 🎯 Casos de Uso Comuns

### Dashboard de Cards

**Card "Oportunidades Abertas":**
```
GET /api/oportunidades/stats?status=open&unidade_id=92
```

**Card "Oportunidades Ganhas":**
```
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31&unidade_id=92
```

**Card "Oportunidades Perdidas":**
```
GET /api/oportunidades/stats?status=lost&lost_date_start=2025-01-01&lost_date_end=2025-01-31&unidade_id=92
```

### Análise Detalhada com `all=1`

**Card "Oportunidades Abertas" com Divisão:**
```
GET /api/oportunidades/stats?status=open&created_date_start=2025-01-01&created_date_end=2025-01-31&all=1&unidade_id=92
```

**Resposta inclui:**
- Total geral de abertas
- Quantas foram criadas no período
- Quantas foram criadas em outros períodos
- Valores correspondentes

**Card "Oportunidades Ganhas" com Taxa de Conversão:**
```
GET /api/oportunidades/stats?status=won&gain_date_start=2025-01-01&gain_date_end=2025-01-31&all=1&unidade_id=92
```

**Resposta inclui:**
- Total de ganhas no período
- Quantas foram criadas no período vs. fora
- Taxa de conversão (ganhas / criadas no período)

### Gráficos

**Gráfico de Linha - Oportunidades Criadas por Dia:**
```
GET /api/oportunidades/stats?group_by=day&created_date_start=2025-01-01&created_date_end=2025-01-31&unidade_id=92
```

**Gráfico de Barras - Oportunidades por Status:**
```
GET /api/oportunidades/stats?group_by=status&created_date_start=2025-01-01&created_date_end=2025-01-31&unidade_id=92
```

**Gráfico de Pizza - Oportunidades por Funil:**
```
GET /api/oportunidades/stats?group_by=funil&created_date_start=2025-01-01&created_date_end=2025-01-31&unidade_id=92
```

### Performance por Vendedor

```
GET /api/oportunidades/stats?unidade_id=92&created_date_start=2025-01-01&created_date_end=2025-01-31
```

A resposta inclui o array `por_vendedor` com estatísticas individuais.

---

## ⚠️ Tratamento de Erros

### Erro de Autenticação
```json
{
  "success": false,
  "message": "Não autorizado"
}
```

### Erro de Validação
```json
{
  "success": false,
  "message": "Erro ao buscar estatísticas de oportunidades",
  "error": "Mensagem de erro específica"
}
```

### Unidade sem Vendedores Ativos
```json
{
  "success": true,
  "data": {
    "stats": [],
    "total": 0,
    "valor_total": 0,
    "total_ganhas": 0,
    "total_perdidas": 0,
    "total_abertas": 0,
    "valor_ganhas": 0,
    "valor_perdidas": 0,
    "valor_abertas": 0
  },
  "filters": {
    "unidade_id": "999"
  },
  "message": "Unidade(s) 999 não possui(em) vendedores ativos ou não foi(ram) encontrada(s)"
}
```

### Vendedor Não Encontrado
```json
{
  "success": true,
  "data": {
    "stats": [],
    "total": 0,
    "valor_total": 0,
    "total_ganhas": 0,
    "total_perdidas": 0,
    "total_abertas": 0,
    "valor_ganhas": 0,
    "valor_perdidas": 0,
    "valor_abertas": 0
  },
  "filters": {
    "user_id": "999"
  },
  "message": "Vendedor(es) 999 não encontrado(s) ou não está(ão) ativo(s)"
}
```

---

## 🌍 Timezone

**Todas as comparações de data são feitas no timezone de São Paulo (America/Sao_Paulo).**

O banco de dados armazena datas em UTC, mas a API converte automaticamente para o horário de São Paulo usando `CONVERT_TZ`.

**Exemplo:**
- Se você enviar `created_date_start=2025-01-15`, a API busca oportunidades onde `createDate` (convertido para São Paulo) é >= `2025-01-15 00:00:00` (horário de São Paulo).

**Importante:**
- Sempre envie datas no formato `YYYY-MM-DD`
- A API trata automaticamente a conversão de timezone
- Horários são sempre `00:00:00` para início e `23:59:59` para fim (horário de São Paulo)

---

## 📝 Notas Importantes

1. **Filtro de Unidade:** Apenas vendedores **ativos** são considerados. Se a unidade não tiver vendedores ativos, a resposta será vazia.

2. **Parâmetro `all=1`:** Use apenas quando precisar de análises detalhadas sobre o período de criação. Para consultas simples, não é necessário.

3. **Agrupamento:** Quando usar `group_by`, a estrutura da resposta muda. Veja a seção [Parâmetros de Agrupamento](#parâmetros-de-agrupamento).

4. **Status Múltiplos:** Você pode combinar múltiplos status separando por vírgula: `status=open,won`.

5. **Performance:** Para grandes volumes de dados, use filtros de data para limitar o escopo da consulta.

6. **Timezone:** Todas as datas são sempre tratadas no timezone de São Paulo, independente do timezone do servidor ou cliente.

---

## 🔄 Changelog

### Versão Atual
- ✅ Suporte completo ao parâmetro `all=1` com análises detalhadas
- ✅ Taxa de conversão para oportunidades ganhas
- ✅ Informações de unidades na resposta (`unidade_info`)
- ✅ Estatísticas por vendedor (`por_vendedor`)
- ✅ Timezone de São Paulo aplicado em todas as comparações de data
- ✅ Resposta JSON limpa (sem campos `null`)
- ✅ Queries otimizadas

---

## 📞 Suporte

Para dúvidas ou problemas, consulte o código-fonte em `app/api/oportunidades/stats/route.ts`.
