# Dashboard Gestor - Postman Collection

Collection completa de todas as APIs da área do gestor do Dashboard SprintHub.

## 📦 Como Importar

1. Abra o Postman
2. Clique em **Import** (canto superior esquerdo)
3. Selecione o arquivo `Gestor-API-Collection.json`
4. A collection será importada com todas as requisições organizadas

## 🔐 Autenticação

### Variáveis de Ambiente

A collection utiliza as seguintes variáveis:

- `gestor_id`: ID do gestor autenticado (exemplo: `254`)
- `unidade_id`: ID da unidade a ser consultada (exemplo: `92`)
- `gestor_token`: Token de autenticação (se houver implementação futura)
- `ausencia_id`: ID da ausência para deleção

**Como configurar:**
1. Clique no ícone de olho (👁️) no canto superior direito
2. Clique em **Edit** ao lado de "Gestor API Collection"
3. Configure os valores das variáveis

## 📋 Endpoints Disponíveis

### 🔑 Autenticação

#### 1. Login Gestor
- **Método:** `POST`
- **URL:** `/api/auth/gestor`
- **Body:**
```json
{
  "email": "gestor@exemplo.com"
}
```
- **Resposta:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "gestor": {
    "id": 254,
    "name": "João",
    "lastName": "Silva",
    "email": "joao.silva@exemplo.com",
    "unidades": [
      {
        "id": 92,
        "nome": "Unidade A",
        "dpto_gestao": 122
      }
    ],
    "unidade_principal": {
      "id": 92,
      "nome": "Unidade A",
      "dpto_gestao": 122
    }
  }
}
```

#### 2. Verificar Autenticação
- **Método:** `GET`
- **URL:** `/api/auth/gestor`
- **Headers:** `Authorization: Bearer {{gestor_token}}`

---

### 📊 Estatísticas

#### 3. Obter Estatísticas da Unidade
- **Método:** `GET`
- **URL:** `/api/gestor/stats?gestorId={{gestor_id}}&unidadeId={{unidade_id}}&dataInicio=2024-01-01&dataFim=2024-12-31`
- **Query Params:**
  - `gestorId` (obrigatório): ID do gestor
  - `unidadeId` (obrigatório): ID da unidade
  - `dataInicio` (opcional): Data de início (YYYY-MM-DD)
  - `dataFim` (opcional): Data de fim (YYYY-MM-DD)

- **Resposta:**
```json
{
  "success": true,
  "stats": {
    "total_vendedores": 5,
    "oportunidades_criadas": 150,
    "oportunidades_ganhas": 45,
    "valor_ganho": 125000.00,
    "oportunidades_perdidas": 30,
    "oportunidades_abertas": 75,
    "vendedores": [
      {
        "id": 123,
        "name": "Maria",
        "lastName": "Santos",
        "oportunidades_criadas": 30,
        "oportunidades_ganhas": 10,
        "valor_ganho": 25000.00,
        "oportunidades_perdidas": 5,
        "oportunidades_abertas": 15,
        "meta": 30000.00
      }
    ],
    "meta_total": 150000.00,
    "etapas_funil": [
      {
        "id": 1,
        "nome_coluna": "Prospecção",
        "sequencia": 1,
        "total_oportunidades": 25,
        "valor_total": 50000.00
      }
    ]
  }
}
```

---

### 🏢 Unidades

#### 4. Obter Dados da Unidade
- **Método:** `GET`
- **URL:** `/api/gestor/unidade/:id`
- **Path Params:** `id` - ID da unidade

- **Resposta:**
```json
{
  "success": true,
  "unidade": {
    "id": 92,
    "nome": "Unidade A",
    "responsavel": "João Silva",
    "total_vendedores": 5,
    "vendedores_na_fila": [
      {
        "id": 123,
        "name": "Maria",
        "lastName": "Santos",
        "email": "maria@exemplo.com",
        "sequencia": 1,
        "ativo": true
      }
    ],
    "vendedores_fora_fila": [],
    "fila_roleta": [
      {
        "vendedor_id": 123,
        "ordem": 1,
        "name": "Maria",
        "lastName": "Santos"
      }
    ]
  }
}
```

---

### 🔄 Fila de Leads

#### 5. Listar Filas
- **Método:** `GET`
- **URL:** `/api/fila?search=`
- **Headers:** `x-gestor-id: {{gestor_id}}`
- **Query Params:**
  - `search` (opcional): Termo de busca

- **Resposta:**
```json
{
  "success": true,
  "filas": [
    {
      "id": 92,
      "unidade_id": 92,
      "unidade_nome": "Unidade A",
      "total_vendedores": 5,
      "vendedores_fila": [
        {
          "id": 123,
          "nome": "Maria Santos",
          "sequencia": 1,
          "total_distribuicoes": 50,
          "ausencia_retorno": null
        }
      ],
      "ultima_distribuicao": "2024-12-08T10:30:00",
      "ultima_distribuicao_vendedor": "Maria Santos",
      "total_leads_distribuidos": 250,
      "ativo": true
    }
  ],
  "stats": {
    "total_unidades": 3,
    "unidades_com_fila": 3,
    "total_vendedores": 15,
    "total_leads_distribuidos": 750,
    "ultima_atualizacao": "2024-12-08T10:30:00"
  }
}
```

#### 6. Atualizar Fila de Vendedores
- **Método:** `PUT`
- **URL:** `/api/fila/:id`
- **Path Params:** `id` - ID da unidade
- **Body:**
```json
{
  "vendedores": [
    {
      "vendedor_id": 123,
      "sequencia": 1
    },
    {
      "vendedor_id": 456,
      "sequencia": 2
    },
    {
      "vendedor_id": 789,
      "sequencia": 3
    }
  ]
}
```

#### 7. Alternar Status da Fila
- **Método:** `PATCH`
- **URL:** `/api/fila/:id/toggle`
- **Path Params:** `id` - ID da unidade
- **Body:**
```json
{
  "ativo": true
}
```

---

### 🚫 Ausências

#### 8. Listar Ausências da Unidade
- **Método:** `GET`
- **URL:** `/api/fila/:id/ausencias`
- **Path Params:** `id` - ID da unidade

- **Resposta:**
```json
{
  "success": true,
  "ausencias": [
    {
      "id": 1,
      "unidade_id": 92,
      "vendedor_id": 123,
      "vendedor_nome": "Maria Santos",
      "data_inicio": "2024-12-15T08:00:00",
      "data_fim": "2024-12-20T18:00:00",
      "motivo": "Férias programadas",
      "created_by": 1,
      "created_at": "2024-12-01T10:00:00"
    }
  ]
}
```

#### 9. Criar Ausência
- **Método:** `POST`
- **URL:** `/api/fila/:id/ausencias`
- **Path Params:** `id` - ID da unidade
- **Body:**
```json
{
  "vendedor_id": 123,
  "data_inicio": "2024-12-15T08:00:00",
  "data_fim": "2024-12-20T18:00:00",
  "motivo": "Férias programadas",
  "created_by": 1
}
```

**Validações:**
- `vendedor_id`: Obrigatório, deve existir na unidade
- `data_inicio`: Obrigatória, formato ISO 8601
- `data_fim`: Obrigatória, deve ser posterior a `data_inicio`
- `motivo`: Obrigatório, mínimo 3 caracteres

#### 10. Remover Ausência
- **Método:** `DELETE`
- **URL:** `/api/fila/:id/ausencias/:ausenciaId`
- **Path Params:**
  - `id` - ID da unidade
  - `ausenciaId` - ID da ausência

---

### 📝 Logs de Distribuição

#### 11. Obter Logs de Distribuição
- **Método:** `GET`
- **URL:** `/api/fila/:id/logs?page=1&limit=50&dataInicio=&dataFim=`
- **Path Params:** `id` - ID da unidade
- **Query Params:**
  - `page` (padrão: 1): Número da página
  - `limit` (padrão: 50, máx: 100): Registros por página
  - `dataInicio` (opcional): Data de início (YYYY-MM-DD)
  - `dataFim` (opcional): Data de fim (YYYY-MM-DD)

- **Resposta:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "unidade_id": 92,
      "vendedor_id": 123,
      "vendedor_nome": "Maria Santos",
      "lead_id": 5678,
      "posicao_fila": 1,
      "total_fila": 5,
      "distribuido_em": "2024-12-08T10:30:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "pages": 5
  }
}
```

---

## 🔧 Configuração Rápida

### 1. Primeiro Login
```bash
# 1. Faça login para obter os dados do gestor
POST http://localhost:3000/api/auth/gestor
Body: { "email": "seu-email@exemplo.com" }

# 2. Copie o ID retornado e configure na variável gestor_id
# 3. Copie o ID da unidade_principal e configure na variável unidade_id
```

### 2. Testar Estatísticas
```bash
# Com as variáveis configuradas, teste:
GET http://localhost:3000/api/gestor/stats?gestorId={{gestor_id}}&unidadeId={{unidade_id}}
```

### 3. Gerenciar Fila
```bash
# Listar filas (com header do gestor)
GET http://localhost:3000/api/fila
Header: x-gestor-id: {{gestor_id}}

# Atualizar ordem da fila
PUT http://localhost:3000/api/fila/{{unidade_id}}
Body: { "vendedores": [...] }
```

---

## 📌 Notas Importantes

### Campo `user_gestao` como JSON Array
Todas as APIs foram atualizadas para suportar `user_gestao` como JSON array:
- ✅ Suporta múltiplos gestores: `[254, 323]`
- ✅ Backward compatible: ainda funciona com número único `254`
- ✅ Usa `JSON_CONTAINS` nas queries SQL

### Autenticação
- O header `x-gestor-id` é usado para filtrar unidades do gestor
- O login retorna dados do gestor e suas unidades
- Futuras implementações podem usar `Authorization: Bearer {token}`

### Paginação
- APIs de listagem suportam paginação via `page` e `limit`
- Limite máximo: 100 registros por página

### Filtros de Data
- Formato: `YYYY-MM-DD` (ISO 8601)
- Se não informados, usam período padrão (geralmente mês atual)

---

## 🐛 Troubleshooting

### Erro: "Este usuário não é gestor de nenhuma unidade ativa"
- Verifique se o email está correto
- Verifique se o vendedor está configurado como gestor em alguma unidade
- Confira a tabela `unidades` campo `user_gestao` (deve ser JSON array)

### Erro: "Acesso negado: você não é gestor desta unidade"
- Verifique se o `gestorId` está correto
- Verifique se a `unidadeId` pertence ao gestor
- Confira se a unidade está ativa

### Nenhuma fila retornada
- Adicione o header `x-gestor-id` na requisição
- Verifique se o gestor tem unidades associadas
- Confirme que as unidades estão ativas

---

## 📚 Recursos Adicionais

- **Documentação do Banco:** `banco.sql` (schema completo)
- **Código das APIs:** `app/api/gestor/` e `app/api/fila/`
- **Interface do Gestor:** http://localhost:3000/gestor
- **Página de Fila:** http://localhost:3000/gestor/fila

---

## 📝 Changelog

### v1.0.0 (2024-12-08)
- ✅ Collection completa criada
- ✅ Suporte a `user_gestao` como JSON array
- ✅ Todas as APIs documentadas
- ✅ Variáveis de ambiente configuradas
- ✅ Exemplos de request/response

---

**Desenvolvido para:** Dashboard SprintHub - CRM by INTELI

