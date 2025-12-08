# 📊 API: Oportunidades Abertas por Unidades

## Endpoint

```
GET /api/oportunidades-paradas/unidades
```

---

## 🎯 Objetivo

Listar **todas as oportunidades com status OPEN** de todos os vendedores relacionados às unidades especificadas.

---

## 📝 Parâmetros (Query String)

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `unidades` | string | ✅ Sim | IDs das unidades separados por vírgula |

### Exemplos:

```
GET /api/oportunidades-paradas/unidades?unidades=14
GET /api/oportunidades-paradas/unidades?unidades=14,45
GET /api/oportunidades-paradas/unidades?unidades=14,45,90
```

---

## 📦 Estrutura da Resposta

```typescript
{
  success: boolean
  filtros: {
    unidades_ids: number[]
  }
  resumo: {
    total_unidades: number
    total_vendedores: number
    total_oportunidades: number
    valor_total: number
    valor_medio: number
  }
  resumo_por_unidade: Array<{
    unidade_id: number
    unidade_nome: string
    total_vendedores_unidade: number
    total_vendedores_com_oportunidades: number
    total_oportunidades: number
    valor_total: number
    vendedores: Array<{
      id: number
      nome: string
      tem_oportunidades: boolean
      total_oportunidades: number
      valor_total: number
    }>
  }>
  resumo_por_vendedor: Array<{
    vendedor_id: number
    vendedor_nome: string
    unidade_id: number
    unidade_nome: string
    total_oportunidades: number
    valor_total: number
    oportunidade_mais_antiga_dias: number
  }>
  oportunidades: Array<{
    id: number
    title: string
    value: number
    crm_column: string | null
    lead_id: number | null
    sequence: number | null
    status: string
    user: string
    vendedor_id: number
    vendedor_nome: string
    unidade_id: number
    unidade_nome: string
    last_column_change: string | null
    createDate: string
    updateDate: string
    coluna_funil_id: number | null
    funil_nome: string | null
    dias_sem_atualizacao: number
  }>
  vendedores: Array<{
    id: number
    nome: string
    unidade_id: number
    unidade_nome: string
  }>
}
```

---

## 📊 Exemplo de Resposta Completa

```json
{
  "success": true,
  "filtros": {
    "unidades_ids": [14, 45]
  },
  "resumo": {
    "total_unidades": 2,
    "total_vendedores": 8,
    "total_oportunidades": 156,
    "valor_total": 2450000.00,
    "valor_medio": 15705.13
  },
  "resumo_por_unidade": [
    {
      "unidade_id": 14,
      "unidade_nome": "São Paulo Centro",
      "total_vendedores_unidade": 5,
      "total_vendedores_com_oportunidades": 4,
      "total_oportunidades": 98,
      "valor_total": 1580000.00,
      "vendedores": [
        {
          "id": 123,
          "nome": "João Silva",
          "tem_oportunidades": true,
          "total_oportunidades": 25,
          "valor_total": 450000.00
        },
        {
          "id": 124,
          "nome": "Maria Santos",
          "tem_oportunidades": true,
          "total_oportunidades": 18,
          "valor_total": 320000.00
        },
        {
          "id": 125,
          "nome": "Pedro Costa",
          "tem_oportunidades": false,
          "total_oportunidades": 0,
          "valor_total": 0
        }
      ]
    },
    {
      "unidade_id": 45,
      "unidade_nome": "Rio de Janeiro Sul",
      "total_vendedores_unidade": 3,
      "total_vendedores_com_oportunidades": 3,
      "total_oportunidades": 58,
      "valor_total": 870000.00,
      "vendedores": [
        {
          "id": 456,
          "nome": "Ana Oliveira",
          "tem_oportunidades": true,
          "total_oportunidades": 22,
          "valor_total": 380000.00
        }
      ]
    }
  ],
  "resumo_por_vendedor": [
    {
      "vendedor_id": 123,
      "vendedor_nome": "João Silva",
      "unidade_id": 14,
      "unidade_nome": "São Paulo Centro",
      "total_oportunidades": 25,
      "valor_total": 450000.00,
      "oportunidade_mais_antiga_dias": 45
    },
    {
      "vendedor_id": 456,
      "vendedor_nome": "Maria Santos",
      "unidade_id": 14,
      "unidade_nome": "São Paulo Centro",
      "total_oportunidades": 18,
      "valor_total": 320000.00,
      "oportunidade_mais_antiga_dias": 32
    }
  ],
  "oportunidades": [
    {
      "id": 789456,
      "title": "Proposta Comercial - Empresa ABC",
      "value": 25000.00,
      "crm_column": "Negociação",
      "lead_id": 12345,
      "sequence": 2,
      "status": "open",
      "user": "123",
      "vendedor_id": 123,
      "vendedor_nome": "João Silva",
      "unidade_id": 14,
      "unidade_nome": "São Paulo Centro",
      "last_column_change": "2024-11-15T10:30:00.000Z",
      "createDate": "2024-10-01T08:00:00.000Z",
      "updateDate": "2024-11-15T10:30:00.000Z",
      "coluna_funil_id": 45,
      "funil_nome": "Vendas Corporativas",
      "dias_sem_atualizacao": 23
    }
  ],
  "vendedores": [
    {
      "id": 123,
      "nome": "João Silva",
      "unidade_id": 14,
      "unidade_nome": "São Paulo Centro"
    }
  ]
}
```

---

## 🔍 Critérios de Filtro

### Oportunidades Incluídas:
- ✅ `status IN ('open', 'aberta', 'active')`
- ✅ `gain_date IS NULL` (não foi ganha)
- ✅ `lost_date IS NULL` (não foi perdida)
- ✅ `archived = 0` (não está arquivada)
- ✅ Vendedor pertence a uma das unidades especificadas
- ✅ Vendedor está ativo (`vendedores.ativo = 1`)

### Relacionamento:
1. **Unidades** → busca todos os vendedores ativos (`vendedores.unidade_id`)
2. **Vendedores** → busca todas as oportunidades abertas (`oportunidades.user = vendedores.id`)
3. **Oportunidades** → enriquece com dados de funil (`colunas_funil`, `funis`)

---

## 📈 Ordenação

**Oportunidades ordenadas por:**
1. `updateDate ASC` (mais antigas primeiro - sem atualização há mais tempo)
2. `value DESC` (maior valor primeiro)

**Resumos ordenados por:**
- `total_oportunidades DESC` (maior quantidade primeiro)

---

## ⚠️ Respostas de Erro

### 400 - Bad Request

```json
{
  "success": false,
  "message": "Parâmetro 'unidades' é obrigatório. Ex: ?unidades=14,45"
}
```

```json
{
  "success": false,
  "message": "Nenhum ID de unidade válido fornecido"
}
```

### 500 - Internal Server Error

```json
{
  "success": false,
  "message": "Erro ao buscar oportunidades",
  "error": "Detalhes do erro"
}
```

---

## 💡 Casos de Uso

### 1. Dashboard de Gestor
Visualizar todas as oportunidades abertas das unidades sob sua gestão.

### 2. Análise de Performance
Identificar vendedores com muitas oportunidades abertas ou oportunidades antigas, e também vendedores sem oportunidades.

### 3. Gestão de Pipeline
Monitorar o pipeline total de vendas por unidade.

### 4. Relatórios Gerenciais
Gerar relatórios consolidados de oportunidades em andamento.

---

## 🔗 APIs Relacionadas

- `GET /api/vendedores/lista?unidades=14,45` - Listar vendedores das unidades
- `GET /api/oportunidades-paradas?unidade_id=14&dias=7` - Análise de oportunidades paradas
- `GET /api/unidades/[id]/oportunidades-abertas` - Oportunidades de uma unidade específica

---

## 📝 Notas Técnicas

1. **Performance**: Usa `LEFT JOIN` para buscar dados relacionados em uma única query
2. **Validação**: IDs de unidades são validados e duplicatas são removidas
3. **Enriquecimento**: Cada oportunidade inclui nome do vendedor, unidade e funil
4. **Cálculos**: `dias_sem_atualizacao` calculado via `DATEDIFF(NOW(), updateDate)`
5. **Agrupamentos**: Fornece 3 visões: geral, por unidade e por vendedor

---

## 🎯 Exemplo de Integração

```typescript
// Buscar oportunidades abertas de múltiplas unidades
const response = await fetch('/api/oportunidades-paradas/unidades?unidades=14,45')
const data = await response.json()

if (data.success) {
  console.log(`Total de oportunidades: ${data.resumo.total_oportunidades}`)
  console.log(`Valor total: R$ ${data.resumo.valor_total.toLocaleString('pt-BR')}`)
  
  // Listar por unidade com vendedores
  data.resumo_por_unidade.forEach(unidade => {
    console.log(`${unidade.unidade_nome}: ${unidade.total_oportunidades} oportunidades`)
    console.log(`  Vendedores: ${unidade.total_vendedores_com_oportunidades}/${unidade.total_vendedores_unidade} com oportunidades`)
    
    // Listar vendedores da unidade
    unidade.vendedores.forEach(vendedor => {
      if (vendedor.tem_oportunidades) {
        console.log(`    - ${vendedor.nome}: ${vendedor.total_oportunidades} ops (R$ ${vendedor.valor_total.toLocaleString('pt-BR')})`)
      } else {
        console.log(`    - ${vendedor.nome}: sem oportunidades abertas`)
      }
    })
  })
  
  // Listar oportunidades mais antigas
  const oportunidadesAntigas = data.oportunidades
    .filter(op => op.dias_sem_atualizacao > 30)
  console.log(`Oportunidades > 30 dias: ${oportunidadesAntigas.length}`)
}
```

