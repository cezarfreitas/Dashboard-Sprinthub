# API - Lista de Vendedores

## Endpoint
```
GET /api/vendedores/lista
```

## Descrição
Lista todos os vendedores do sistema com seus dados completos, incluindo informações da unidade.

## Parâmetros (Query String)

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `unidade_id` | number | Não | Filtrar vendedores por unidade específica |
| `ativo` | boolean | Não | Filtrar por vendedores ativos (true/1) ou inativos (false/0) |

## Exemplos de Uso

### 1. Listar todos os vendedores
```
GET /api/vendedores/lista
```

### 2. Listar vendedores de uma unidade específica
```
GET /api/vendedores/lista?unidade_id=5
```

### 3. Listar apenas vendedores ativos
```
GET /api/vendedores/lista?ativo=true
```

### 4. Listar vendedores ativos de uma unidade
```
GET /api/vendedores/lista?unidade_id=5&ativo=true
```

## Resposta de Sucesso

```json
{
  "success": true,
  "vendedores": [
    {
      "id": 247,
      "name": "João",
      "lastName": "Silva",
      "email": "joao.silva@empresa.com",
      "cpf": "123.456.789-00",
      "username": "joao.silva",
      "telephone": "(11) 98765-4321",
      "unidade_id": 5,
      "unidade_nome": "CE OUTDOOR",
      "ativo": true,
      "status": "active"
    },
    {
      "id": 248,
      "name": "Maria",
      "lastName": "Santos",
      "email": "maria.santos@empresa.com",
      "cpf": "987.654.321-00",
      "username": "maria.santos",
      "telephone": "(11) 91234-5678",
      "unidade_id": 5,
      "unidade_nome": "CE OUTDOOR",
      "ativo": true,
      "status": "active"
    }
  ],
  "unidades": [
    {
      "id": 5,
      "nome": "CE OUTDOOR",
      "responsavel": "José Manager",
      "ativo": 1,
      "grupo_id": 2,
      "total_vendedores": 25,
      "vendedores_ativos": 23
    },
    {
      "id": 8,
      "nome": "SP INDOOR",
      "responsavel": "Maria Gestora",
      "ativo": 1,
      "grupo_id": 2,
      "total_vendedores": 18,
      "vendedores_ativos": 17
    }
  ],
  "por_unidade": {
    "CE OUTDOOR": [
      {
        "id": 247,
        "name": "João",
        "lastName": "Silva",
        // ... outros campos
      }
    ],
    "Sem Unidade": [
      {
        "id": 300,
        "name": "Ana",
        "lastName": "Costa",
        // ... outros campos
      }
    ]
  },
  "stats": {
    "total": 150,
    "ativos": 140,
    "inativos": 10,
    "com_unidade": 145,
    "sem_unidade": 5,
    "unidades": 12
  },
  "message": "150 vendedores encontrados em 12 unidades"
}
```

## Resposta de Erro

```json
{
  "success": false,
  "message": "Erro ao listar vendedores",
  "error": "Mensagem de erro detalhada"
}
```

## Campos do Vendedor

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | ID único do vendedor |
| `name` | string | Primeiro nome |
| `lastName` | string | Sobrenome |
| `email` | string | Email |
| `cpf` | string\|null | CPF formatado |
| `username` | string | Nome de usuário |
| `telephone` | string\|null | Telefone |
| `unidade_id` | number\|null | ID da unidade vinculada |
| `unidade_nome` | string\|null | Nome da unidade |
| `ativo` | boolean | Se o vendedor está ativo |
| `status` | string | Status do vendedor (active/inactive/blocked) |

## Estatísticas

O campo `stats` contém:
- `total`: Total de vendedores retornados
- `ativos`: Quantidade de vendedores ativos
- `inativos`: Quantidade de vendedores inativos
- `com_unidade`: Vendedores vinculados a uma unidade
- `sem_unidade`: Vendedores sem unidade
- `unidades`: Quantidade de unidades diferentes

## Campos da Unidade

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | ID único da unidade |
| `nome` | string | Nome da unidade |
| `responsavel` | string\|null | Nome do responsável pela unidade |
| `ativo` | boolean | Se a unidade está ativa |
| `grupo_id` | number\|null | ID do grupo da unidade |
| `total_vendedores` | number | Total de vendedores na unidade |
| `vendedores_ativos` | number | Quantidade de vendedores ativos |

## Agrupamento por Unidade

O campo `por_unidade` agrupa os vendedores por nome da unidade:
```json
{
  "CE OUTDOOR": [vendedores...],
  "SP INDOOR": [vendedores...],
  "Sem Unidade": [vendedores...]
}
```

## Campo Unidades

O campo `unidades` retorna um array com informações detalhadas das unidades que possuem vendedores:
- Nome da unidade
- Responsável
- Status ativo/inativo
- Total de vendedores (ativos e inativos)
- Quantidade de vendedores ativos

## Logs

A API gera logs no console para debug:
- 📋 Parâmetros recebidos
- 🔍 Query SQL gerada
- 📦 Parâmetros da query
- ✅ Quantidade de vendedores encontrados
- ❌ Erros (se houver)

## Casos de Uso

### 1. Listar vendedores do gestor
```javascript
const gestorUnidadeId = 5
const response = await fetch(`/api/vendedores/lista?unidade_id=${gestorUnidadeId}&ativo=true`)
const data = await response.json()
console.log(`${data.stats.total} vendedores ativos na unidade`)
```

### 2. Verificar vendedores sem unidade
```javascript
const response = await fetch('/api/vendedores/lista')
const data = await response.json()
console.log(`${data.stats.sem_unidade} vendedores sem unidade`)
```

### 3. Preencher dropdown de vendedores
```javascript
const response = await fetch('/api/vendedores/lista?ativo=true')
const data = await response.json()
const options = data.vendedores.map(v => ({
  value: v.id,
  label: `${v.name} ${v.lastName}`
}))
```

## Notas

- A API retorna vendedores ordenados por `name` e `lastName`
- Vendedores sem unidade são agrupados em "Sem Unidade"
- O status do vendedor pode ser: `active`, `inactive`, ou `blocked`
- A API usa `LEFT JOIN` com a tabela `unidades` para sempre retornar o vendedor, mesmo sem unidade

