# Teste do Endpoint de Consulta e Sincronização de Oportunidade

## Como Testar

### 1. Via Browser (GET - Apenas Consulta)

Abra o navegador e acesse diretamente a URL:

```
http://localhost:3000/api/oportunidades/47854
```

**Nota**: O browser faz apenas GET, para testar POST use os métodos abaixo.

### 2. Via cURL (Terminal)

```bash
# GET - Apenas consultar (não salva no banco)
curl -X GET "http://localhost:3000/api/oportunidades/47854" -H "Content-Type: application/json"

# POST - Consultar e salvar no banco (INSERT ou UPDATE)
curl -X POST "http://localhost:3000/api/oportunidades/47854" -H "Content-Type: application/json"

# Testar com outro ID
curl -X POST "http://localhost:3000/api/oportunidades/13312" -H "Content-Type: application/json"
```

### 3. Via Postman

**GET - Apenas consultar:**
1. Criar nova requisição GET
2. URL: `http://localhost:3000/api/oportunidades/47854`
3. Headers: `Content-Type: application/json`
4. Send

**POST - Consultar e salvar:**
1. Criar nova requisição POST
2. URL: `http://localhost:3000/api/oportunidades/47854`
3. Headers: `Content-Type: application/json`
4. Send

### 4. Via JavaScript/Fetch (Console do Browser)

Abra o console do navegador (F12) e execute:

```javascript
// GET - Apenas consultar
async function consultarOportunidade(id) {
  try {
    const response = await fetch(`/api/oportunidades/${id}`)
    const data = await response.json()
    
    console.log('✅ GET Resposta:', data)
    
    if (data.success) {
      console.log('📦 Dados da API:', data.data)
      console.log('💾 Status no Banco:', data.database.status)
      console.log('💾 Existe no Banco?', data.database.exists ? 'SIM' : 'NÃO')
      
      if (data.database.exists) {
        console.log('💾 Registro do Banco:', data.database.record)
      } else {
        console.log('⚠️ Oportunidade não encontrada no banco local. Use POST para sincronizar.')
      }
    } else {
      console.error('❌ Erro:', data.error)
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error)
  }
}

// POST - Consultar e salvar no banco
async function sincronizarOportunidade(id) {
  try {
    const response = await fetch(`/api/oportunidades/${id}`, {
      method: 'POST'
    })
    const data = await response.json()
    
    console.log('✅ POST Resposta:', data)
    
    if (data.success) {
      console.log('🔄 Operação:', data.operation) // 'inserted' ou 'updated'
      console.log('📦 Dados da API:', data.data.api)
      console.log('💾 Dados do Banco:', data.data.database)
      console.log('🔢 ID:', data.data.database.id)
      console.log('📝 Título:', data.data.database.title)
      console.log('💰 Valor:', data.data.database.value)
      console.log('📊 Status:', data.data.database.status)
    } else {
      console.error('❌ Erro:', data.error)
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error)
  }
}

// Testar GET (apenas consulta)
consultarOportunidade(47854)

// Testar POST (consulta e salva)
sincronizarOportunidade(47854)
sincronizarOportunidade(13312)
```

### 5. Via Thunder Client (VS Code Extension)

1. Instalar Thunder Client no VS Code
2. Nova requisição
3. Método: GET
4. URL: `http://localhost:3000/api/oportunidades/47854`
5. Send

## Cenários de Teste

### ✅ Teste 1: GET - Consulta Válida

**Request:**
```
GET /api/oportunidades/47854
```

**Esperado:**
- Status: 200 OK
- Response com `success: true`
- Campo `data` com objeto da oportunidade da API

### ✅ Teste 2: POST - Inserir Nova Oportunidade

**Request:**
```
POST /api/oportunidades/47854
```

**Esperado (se não existe no banco):**
- Status: 200 OK
- Response com `success: true`
- `operation: "inserted"`
- Campos `data.api` e `data.database`
- Logs: "➕ Inserindo nova oportunidade..."

### ✅ Teste 3: POST - Atualizar Oportunidade Existente

**Request:**
```
POST /api/oportunidades/47854
```

**Esperado (se já existe no banco):**
- Status: 200 OK
- Response com `success: true`
- `operation: "updated"`
- Campos `data.api` e `data.database`
- Logs: "🔄 Atualizando oportunidade..."

### ❌ Teste 4: ID Inválido (não numérico)

**Request:**
```
GET /api/oportunidades/abc
```

**Esperado:**
- Status: 400 Bad Request
- Response com `success: false`
- Mensagem: "ID da oportunidade inválido"

### ❌ Teste 5: ID Inexistente

**Request:**
```
GET /api/oportunidades/999999999
```

**Esperado:**
- Status: 404 Not Found (ou outro status da API SprintHub)
- Response com `success: false`
- Mensagem de erro da API

### ❌ Teste 6: Sem Variáveis de Ambiente

Remover temporariamente as variáveis `APITOKEN`, `I` ou `URLPATCH` do `.env`

**Esperado:**
- Status: 500 Internal Server Error
- Response com `success: false`
- Mensagem: "Configuração da API não encontrada"

## Exemplo de Resposta Real

### GET - Resposta de Sucesso (Existe no Banco)

```json
{
  "success": true,
  "message": "Oportunidade 47854 consultada com sucesso",
  "data": {
    "id": 47854,
    "title": "PAULO - CONSULTOR FINANCEIRO",
    "value": 15000.00,
    "crm_column": 501,
    "lead_id": 12345,
    "sequence": 1,
    "status": "open",
    "loss_reason": null,
    "gain_reason": null,
    "expectedCloseDate": "2024-02-15",
    "sale_channel": "WhatsApp",
    "campaign": "Campanha Janeiro 2024",
    "user": "789",
    "last_column_change": "2024-01-20T14:30:00.000Z",
    "last_status_change": "2024-01-15T10:00:00.000Z",
    "gain_date": null,
    "lost_date": null,
    "reopen_date": null,
    "await_column_approved": false,
    "await_column_approved_user": null,
    "reject_appro": false,
    "reject_appro_desc": null,
    "conf_installment": null,
    "fields": {
      "custom_field_1": "Valor customizado",
      "custom_field_2": "Outro valor"
    },
    "dataLead": {
      "name": "Paulo Silva",
      "email": "paulo@example.com",
      "phone": "+5511999999999",
      "source": "Facebook Ads"
    },
    "createDate": "2024-01-15T10:00:00.000Z",
    "updateDate": "2024-01-20T14:30:00.000Z",
    "archived": false
  },
  "database": {
    "status": "exists",
    "exists": true,
    "record": {
      "id": "47854",
      "title": "PAULO - CONSULTOR FINANCEIRO",
      "value": "15000.00",
      "status": "open",
      "created_at": "2024-12-10T10:00:00.000Z"
    }
  }
}
```

### GET - Resposta de Sucesso (NÃO Existe no Banco)

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

**💡 Dica**: Se `database.exists` for `false`, você pode usar `POST` para sincronizar a oportunidade com o banco local.

### POST - Resposta de Sucesso (Inserção)

```json
{
  "success": true,
  "message": "Oportunidade 47854 inserida com sucesso",
  "operation": "inserted",
  "data": {
    "api": {
      "id": 47854,
      "title": "PAULO - CONSULTOR FINANCEIRO",
      "value": 15000.00,
      "status": "open",
      ...
    },
    "database": {
      "id": "47854",
      "title": "PAULO - CONSULTOR FINANCEIRO",
      "value": "15000.00",
      "status": "open",
      "created_at": "2024-12-12T14:30:00.000Z",
      ...
    }
  }
}
```

### POST - Resposta de Sucesso (Atualização)

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

### Resposta de Erro 404

```json
{
  "success": false,
  "message": "Erro ao consultar oportunidade 999999999",
  "error": "API SprintHub retornou status 404: Not Found",
  "details": "{\"error\":\"Opportunity not found\"}"
}
```

## Logs do Console (Backend)

### GET - Logs de Consulta

```
🔍 Consultando oportunidade 47854...
🌐 URL: https://api.sprinthub.app/crmopportunity/47854?i=123&apitoken=***
✅ Oportunidade 47854 consultada com sucesso
📦 Dados recebidos: {"id":47854,"title":"PAULO - CONSULTOR FINANCEIRO","value":15000...
GET /api/oportunidades/47854 200 in 1234ms
```

### POST - Logs de Inserção

```
🔍 Consultando oportunidade 47854 para inserir/atualizar...
🌐 URL: https://api.sprinthub.app/crmopportunity/47854?i=123&apitoken=***
✅ Oportunidade 47854 consultada com sucesso
📦 Dados recebidos: {"id":47854,"title":"PAULO - CONSULTOR FINANCEIRO"...
➕ Inserindo nova oportunidade 47854 no banco...
✅ Oportunidade 47854 inserida com sucesso
POST /api/oportunidades/47854 200 in 1567ms
```

### POST - Logs de Atualização

```
🔍 Consultando oportunidade 47854 para inserir/atualizar...
🌐 URL: https://api.sprinthub.app/crmopportunity/47854?i=123&apitoken=***
✅ Oportunidade 47854 consultada com sucesso
📦 Dados recebidos: {"id":47854,"title":"PAULO - CONSULTOR FINANCEIRO"...
🔄 Atualizando oportunidade 47854 no banco...
✅ Oportunidade 47854 atualizada com sucesso
POST /api/oportunidades/47854 200 in 1432ms
```

## Checklist de Validação

### GET - Apenas Consulta

- [ ] ✅ Resposta 200 para ID válido existente
- [ ] ✅ Resposta 400 para ID inválido (não numérico)
- [ ] ✅ Resposta 404 para ID inexistente na API
- [ ] ✅ Resposta 500 se variáveis de ambiente ausentes
- [ ] ✅ JSON bem formatado e completo
- [ ] ✅ Logs informativos no console do servidor
- [ ] ✅ Token da API ocultado nos logs (`***`)
- [ ] ✅ Tratamento de erros adequado
- [ ] ✅ Campo `success` sempre presente
- [ ] ✅ Mensagens de erro descritivas

### POST - Consulta e Sincroniza

- [ ] ✅ Resposta 200 para inserção (operation: "inserted")
- [ ] ✅ Resposta 200 para atualização (operation: "updated")
- [ ] ✅ Dados salvos corretamente no banco
- [ ] ✅ Campos JSON serializados corretamente (fields, dataLead, conf_installment)
- [ ] ✅ Datas convertidas para formato MySQL
- [ ] ✅ Relacionamento com coluna_funil_id correto
- [ ] ✅ Loss_reason tratado corretamente (remove "Motivo ")
- [ ] ✅ Response contém dados da API e do banco
- [ ] ✅ UPSERT funciona (INSERT se novo, UPDATE se existe)
- [ ] ✅ Logs diferenciados para inserção/atualização

## Fluxo Completo de Teste

1. **Limpar banco (opcional)**: Para testar inserção do zero
   ```sql
   DELETE FROM oportunidades WHERE id = 47854;
   ```

2. **Testar GET**: Verificar se a oportunidade existe na API
   ```bash
   curl -X GET "http://localhost:3000/api/oportunidades/47854"
   ```

3. **Testar POST (Inserção)**: Primeira vez, deve inserir
   ```bash
   curl -X POST "http://localhost:3000/api/oportunidades/47854"
   # Esperado: operation: "inserted"
   ```

4. **Verificar banco**: Confirmar que foi inserido
   ```sql
   SELECT id, title, value, status FROM oportunidades WHERE id = 47854;
   ```

5. **Testar POST (Atualização)**: Segunda vez, deve atualizar
   ```bash
   curl -X POST "http://localhost:3000/api/oportunidades/47854"
   # Esperado: operation: "updated"
   ```

6. **Verificar banco novamente**: Confirmar que foi atualizado
   ```sql
   SELECT id, title, value, status, created_at FROM oportunidades WHERE id = 47854;
   ```

## Próximos Passos

Funcionalidades implementadas:

- [x] **GET** - Consultar oportunidade da API
- [x] **POST** - Sincronizar oportunidade (INSERT/UPDATE)

Possíveis melhorias futuras:

1. **PUT/PATCH** - Atualizar campos específicos
2. **DELETE** - Arquivar/remover oportunidade
3. **Webhook** - Sincronização automática via eventos
4. **Batch** - Sincronizar múltiplas oportunidades de uma vez

## Observações

- O endpoint consulta diretamente a API do SprintHub (não o banco local)
- Cada requisição conta como 1 chamada à API externa
- Não há cache implementado (sempre consulta em tempo real)
- O ID é case-sensitive e deve ser exatamente como está no SprintHub

## Precisa de Ajuda?

Se encontrar algum erro, verifique:

1. ✅ Servidor Next.js está rodando (`npm run dev`)
2. ✅ Variáveis de ambiente estão configuradas no `.env`
3. ✅ API SprintHub está acessível (não há bloqueio de rede)
4. ✅ Token da API está válido e não expirou
5. ✅ ID da oportunidade existe no SprintHub

