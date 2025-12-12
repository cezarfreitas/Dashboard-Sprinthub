# API - Consulta e Sincronização de Oportunidade Individual

## Endpoints

```
GET  /api/oportunidades/[id]  - Consulta oportunidade da API
POST /api/oportunidades/[id]  - Consulta e insere/atualiza no banco
```

## Descrição

Endpoint exclusivo para trabalhar com oportunidades individuais:

- **GET**: Consulta uma oportunidade específica diretamente da API do SprintHub e retorna o JSON completo
- **POST**: Consulta a oportunidade na API do SprintHub e insere/atualiza no banco de dados local seguindo o padrão da tabela `oportunidades`

## Parâmetros

### Path Parameters

| Parâmetro | Tipo   | Obrigatório | Descrição                           |
|-----------|--------|-------------|-------------------------------------|
| `id`      | number | Sim         | ID da oportunidade no CRM SprintHub |

## Exemplos de Uso

### GET - Consultar oportunidade (sem salvar)

```bash
GET /api/oportunidades/47854
```

### POST - Consultar e salvar no banco

```bash
POST /api/oportunidades/47854
```

### Usando cURL

```bash
# Apenas consultar
curl -X GET "http://localhost:3000/api/oportunidades/47854"

# Consultar e salvar no banco
curl -X POST "http://localhost:3000/api/oportunidades/47854"
```

### Usando JavaScript/Fetch

```javascript
// GET - Apenas consultar
const responseGet = await fetch('/api/oportunidades/47854')
const dataGet = await responseGet.json()

if (dataGet.success) {
  console.log('Oportunidade (API):', dataGet.data)
}

// POST - Consultar e salvar no banco
const responsePost = await fetch('/api/oportunidades/47854', {
  method: 'POST'
})
const dataPost = await responsePost.json()

if (dataPost.success) {
  console.log('Operação:', dataPost.operation) // 'inserted' ou 'updated'
  console.log('Dados da API:', dataPost.data.api)
  console.log('Dados do Banco:', dataPost.data.database)
}
```

## Resposta

### GET - Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Oportunidade 47854 consultada com sucesso",
  "data": {
    "id": 47854,
    "title": "Nome da Oportunidade",
    "value": 15000.00,
    "status": "open",
    "crm_column": 123,
    "lead_id": 456,
    "user": "789",
    "createDate": "2024-01-15T10:30:00.000Z",
    "updateDate": "2024-01-20T14:45:00.000Z",
    "fields": { ... },
    "dataLead": { ... },
    ...
  },
  "database": {
    "status": "exists",
    "exists": true,
    "record": {
      "id": "47854",
      "title": "Nome da Oportunidade",
      "value": "15000.00",
      "status": "open",
      "created_at": "2024-12-10T10:00:00.000Z"
    }
  }
}
```

**Nota**: O campo `database` indica se a oportunidade já existe no banco de dados local:
- `database.status`: `"exists"` (encontrada) ou `"not_found"` (não encontrada)
- `database.exists`: `true` ou `false`
- `database.record`: Registro do banco (se existir) ou `null`

### GET - Sucesso mas NÃO existe no banco

```json
{
  "success": true,
  "message": "Oportunidade 47854 consultada com sucesso",
  "data": { ... },
  "database": {
    "status": "not_found",
    "exists": false,
    "record": null
  }
}
```

### POST - Sucesso ao Inserir (200 OK)

```json
{
  "success": true,
  "message": "Oportunidade 47854 inserida com sucesso",
  "operation": "inserted",
  "data": {
    "api": {
      "id": 47854,
      "title": "Nome da Oportunidade",
      "value": 15000.00,
      ...
    },
    "database": {
      "id": "47854",
      "title": "Nome da Oportunidade",
      "value": "15000.00",
      "crm_column": "123",
      "lead_id": "456",
      "status": "open",
      "created_at": "2024-12-12T10:30:00.000Z",
      ...
    }
  }
}
```

### POST - Sucesso ao Atualizar (200 OK)

```json
{
  "success": true,
  "message": "Oportunidade 47854 atualizada com sucesso",
  "operation": "updated",
  "data": {
    "api": { ... },
    "database": { ... }
  }
}
```

### Erro - ID Inválido (400 Bad Request)

```json
{
  "success": false,
  "message": "ID da oportunidade inválido",
  "error": "O ID deve ser um número válido"
}
```

### Erro - Oportunidade Não Encontrada (404 Not Found)

```json
{
  "success": false,
  "message": "Erro ao consultar oportunidade 99999",
  "error": "API SprintHub retornou status 404: Not Found",
  "details": "..."
}
```

### Erro - Configuração Ausente (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Configuração da API não encontrada",
  "error": "Variáveis de ambiente APITOKEN, I ou URLPATCH não configuradas"
}
```

### Erro - Erro Genérico (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Erro ao consultar oportunidade",
  "error": "Mensagem de erro detalhada"
}
```

## Detalhes Técnicos

### API Externa Utilizada

O endpoint faz uma requisição GET para a API do SprintHub:

```
{{URLPATCH}}/crmopportunity/{{ID}}?i={{I}}&apitoken={{APITOKEN}}
```

Exemplo real:
```
https://api.sprinthub.app/crmopportunity/47854?i=123&apitoken=***
```

### Variáveis de Ambiente Necessárias

| Variável   | Descrição                            | Exemplo                          |
|------------|--------------------------------------|----------------------------------|
| `URLPATCH` | URL base da API SprintHub            | https://api.sprinthub.app        |
| `I`        | ID do grupo/empresa no SprintHub     | 123                              |
| `APITOKEN` | Token de autenticação da API         | abc123xyz456                     |

### Headers da Requisição

```
Content-Type: application/json
User-Agent: CRM-by-INTELI/1.0
```

### Timeout

Não há timeout configurado (usa o padrão do fetch do Next.js).

### Cache

```typescript
export const dynamic = 'force-dynamic'
```

O endpoint não utiliza cache, sempre consultando a API em tempo real.

## Logs

O endpoint gera logs no console para facilitar debugging:

```
🔍 Consultando oportunidade 47854...
🌐 URL: https://api.sprinthub.app/crmopportunity/47854?i=123&apitoken=***
✅ Oportunidade 47854 consultada com sucesso
📦 Dados recebidos: {"id":47854,"title":"..."}
```

Em caso de erro:

```
❌ Erro na API SprintHub: 404 Not Found
📄 Resposta: {"error":"Opportunity not found"}
```

## Segurança

- ✅ O token da API (`apitoken`) é ocultado nos logs (substituído por `***`)
- ✅ Validação do ID como número inteiro
- ✅ Tratamento de erros completo
- ✅ Sanitização de responses de erro (limita a 500 caracteres)

## Uso Previsto

Este endpoint foi criado para:

1. ✅ **Consulta Individual**: Visualizar dados completos de uma oportunidade específica
2. ✅ **Debugging**: Inspecionar o JSON bruto da API do SprintHub
3. ✅ **Integração**: Servir como base para criar/atualizar oportunidades no futuro

## Próximos Passos (Futuro)

- [ ] Implementar método POST para criar oportunidades
- [ ] Implementar método PUT/PATCH para atualizar oportunidades
- [ ] Adicionar validação de campos obrigatórios
- [ ] Implementar rate limiting
- [ ] Adicionar suporte a autenticação/autorização

## Autor

Sistema CRM by INTELI

## Data de Criação

Dezembro 2024

