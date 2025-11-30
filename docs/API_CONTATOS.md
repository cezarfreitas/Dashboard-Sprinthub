# 📞 API de Contatos WhatsApp

API completa e independente para gerenciar contatos WhatsApp vinculados a vendedores e filiais.

---

## 📋 Tabela de Conteúdo

- [Endpoints](#endpoints)
- [Modelos de Dados](#modelos-de-dados)
- [Exemplos de Uso](#exemplos-de-uso)
- [Códigos de Status](#códigos-de-status)
- [Validações](#validações)

---

## 🔗 Endpoints

### 1. POST /api/contatos
**Criar novo contato**

**Body:**
```json
{
  "id_contato": "65853",
  "wpp_filial": "5527981920127",
  "wpp_contato": "5511989882867",
  "vendedor": "Gilmar ES OUTDOOR",
  "vendedor_id": "228",
  "nome": "cezar freitas",
  "observacoes": "Cliente potencial" // opcional
}
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "message": "Contato criado com sucesso",
  "contato": {
    "id_contato": "65853",
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "vendedor": "Gilmar ES OUTDOOR",
    "vendedor_id": 228,
    "nome": "cezar freitas",
    "ativo": true,
    "observacoes": "Cliente potencial",
    "created_at": "2024-11-30T10:30:00.000Z",
    "updated_at": "2024-11-30T10:30:00.000Z"
  }
}
```

**Validações:**
- ✅ Campos obrigatórios: `id_contato`, `wpp_filial`, `wpp_contato`, `vendedor`, `vendedor_id`, `nome`
- ✅ `id_contato` deve ser único
- ✅ `vendedor_id` deve existir na tabela `vendedores` e estar ativo
- ✅ Telefones devem ter formato válido (10-15 dígitos)

---

### 2. GET /api/contatos
**Listar contatos com filtros opcionais**

**Query Parameters:**
```
?vendedor_id=228           // Filtrar por vendedor
&wpp_filial=5527981920127  // Filtrar por filial
&wpp_contato=5511989882867 // Filtrar por telefone do contato
&nome=cezar                // Buscar por nome (LIKE)
&ativo=true                // Filtrar por status (true/false)
&page=1                    // Página (default: 1)
&limit=50                  // Itens por página (default: 50, max: 100)
```

**Exemplos:**
```bash
# Listar todos os contatos ativos
GET /api/contatos?ativo=true

# Listar contatos de um vendedor específico
GET /api/contatos?vendedor_id=228

# Listar contatos de uma filial
GET /api/contatos?wpp_filial=5527981920127

# Buscar por nome
GET /api/contatos?nome=cezar

# Paginação
GET /api/contatos?page=2&limit=20
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "contatos": [
    {
      "id_contato": "65853",
      "wpp_filial": "5527981920127",
      "wpp_contato": "5511989882867",
      "vendedor": "Gilmar ES OUTDOOR",
      "vendedor_id": 228,
      "nome": "cezar freitas",
      "ativo": true,
      "observacoes": "Cliente potencial",
      "created_at": "2024-11-30T10:30:00.000Z",
      "updated_at": "2024-11-30T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

### 3. GET /api/contatos/[id]
**Buscar contato específico**

**Exemplo:**
```bash
GET /api/contatos/65853
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "contato": {
    "id_contato": "65853",
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "vendedor": "Gilmar ES OUTDOOR",
    "vendedor_id": 228,
    "nome": "cezar freitas",
    "ativo": true,
    "observacoes": "Cliente potencial",
    "created_at": "2024-11-30T10:30:00.000Z",
    "updated_at": "2024-11-30T10:30:00.000Z"
  }
}
```

---

### 4. PATCH /api/contatos/[id]
**Atualizar contato**

**Body (enviar apenas campos que deseja atualizar):**
```json
{
  "nome": "Cezar Freitas Silva",
  "observacoes": "Cliente VIP - Alta prioridade",
  "ativo": true
}
```

**Campos atualizáveis:**
- `wpp_filial`
- `wpp_contato`
- `vendedor`
- `vendedor_id`
- `nome`
- `ativo`
- `observacoes`

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Contato atualizado com sucesso",
  "contato": {
    "id_contato": "65853",
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "vendedor": "Gilmar ES OUTDOOR",
    "vendedor_id": 228,
    "nome": "Cezar Freitas Silva",
    "ativo": true,
    "observacoes": "Cliente VIP - Alta prioridade",
    "created_at": "2024-11-30T10:30:00.000Z",
    "updated_at": "2024-11-30T11:45:00.000Z"
  }
}
```

---

### 5. DELETE /api/contatos/[id]
**Desativar ou remover contato**

**Soft Delete (default - apenas desativa):**
```bash
DELETE /api/contatos/65853
```

**Hard Delete (remove permanentemente):**
```bash
DELETE /api/contatos/65853?hard=true
```

**Resposta Soft Delete (200 OK):**
```json
{
  "success": true,
  "message": "Contato desativado com sucesso"
}
```

**Resposta Hard Delete (200 OK):**
```json
{
  "success": true,
  "message": "Contato removido permanentemente"
}
```

---

## 📊 Modelos de Dados

### Contato
```typescript
interface Contato {
  id_contato: string        // PK - ID único do contato
  wpp_filial: string        // Telefone WhatsApp da filial
  wpp_contato: string       // Telefone WhatsApp do contato
  vendedor: string          // Nome completo do vendedor
  vendedor_id: number       // ID do vendedor (FK)
  nome: string              // Nome do contato
  ativo: boolean            // Status do contato
  observacoes?: string      // Observações (opcional)
  created_at: string        // Data de criação (ISO 8601)
  updated_at: string        // Data de atualização (ISO 8601)
}
```

---

## 💡 Exemplos de Uso

### JavaScript/TypeScript (Fetch)

#### Criar Contato
```typescript
const novoContato = {
  id_contato: "65853",
  wpp_filial: "5527981920127",
  wpp_contato: "5511989882867",
  vendedor: "Gilmar ES OUTDOOR",
  vendedor_id: "228",
  nome: "cezar freitas"
}

const response = await fetch('/api/contatos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(novoContato)
})

const data = await response.json()
console.log(data)
```

#### Listar Contatos de um Vendedor
```typescript
const vendedorId = 228
const response = await fetch(`/api/contatos?vendedor_id=${vendedorId}&ativo=true`)
const data = await response.json()

console.log(`Total: ${data.pagination.total} contatos`)
data.contatos.forEach(contato => {
  console.log(`${contato.nome} - ${contato.wpp_contato}`)
})
```

#### Atualizar Contato
```typescript
const response = await fetch('/api/contatos/65853', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    observacoes: "Cliente realizou compra - follow up em 30 dias"
  })
})

const data = await response.json()
console.log(data.message)
```

#### Desativar Contato
```typescript
const response = await fetch('/api/contatos/65853', {
  method: 'DELETE'
})

const data = await response.json()
console.log(data.message) // "Contato desativado com sucesso"
```

### cURL

#### Criar Contato
```bash
curl -X POST http://localhost:3000/api/contatos \
  -H "Content-Type: application/json" \
  -d '{
    "id_contato": "65853",
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "vendedor": "Gilmar ES OUTDOOR",
    "vendedor_id": "228",
    "nome": "cezar freitas"
  }'
```

#### Listar Contatos
```bash
curl http://localhost:3000/api/contatos?vendedor_id=228
```

#### Atualizar Contato
```bash
curl -X PATCH http://localhost:3000/api/contatos/65853 \
  -H "Content-Type: application/json" \
  -d '{
    "observacoes": "Cliente VIP"
  }'
```

#### Deletar Contato
```bash
# Soft delete
curl -X DELETE http://localhost:3000/api/contatos/65853

# Hard delete
curl -X DELETE "http://localhost:3000/api/contatos/65853?hard=true"
```

---

## 📡 Códigos de Status

| Código | Significado | Quando Ocorre |
|--------|------------|---------------|
| **200** | OK | Sucesso em GET, PATCH, DELETE |
| **201** | Created | Contato criado com sucesso (POST) |
| **400** | Bad Request | Dados inválidos ou faltando |
| **404** | Not Found | Contato ou vendedor não encontrado |
| **409** | Conflict | `id_contato` já existe |
| **500** | Server Error | Erro interno do servidor |

---

## ✅ Validações

### Campos Obrigatórios (POST)
- ✅ `id_contato` - Único, não pode ser vazio
- ✅ `wpp_filial` - Formato: 10-15 dígitos
- ✅ `wpp_contato` - Formato: 10-15 dígitos
- ✅ `vendedor` - Nome completo
- ✅ `vendedor_id` - Deve existir na tabela `vendedores`
- ✅ `nome` - Nome do contato

### Regras de Negócio
- 🔒 `id_contato` é **imutável** (não pode ser alterado após criação)
- 🔒 `vendedor_id` deve referenciar um vendedor **ativo**
- 🔒 Soft delete mantém o registro no banco (apenas `ativo = 0`)
- 🔒 Hard delete (`?hard=true`) remove permanentemente

### Formatos Válidos
```javascript
// Telefones aceitos:
"5527981920127"  ✅
"27981920127"    ✅
"981920127"      ❌ (muito curto)
"abc123"         ❌ (não numérico)

// ID Contato:
"65853"          ✅
"ABC-123"        ✅
""               ❌ (vazio)
```

---

## 🔍 Queries Úteis (SQL)

```sql
-- Buscar contatos ativos de um vendedor
SELECT * FROM contatos_whatsapp 
WHERE vendedor_id = 228 AND ativo = 1;

-- Contar contatos por vendedor
SELECT vendedor, COUNT(*) as total
FROM contatos_whatsapp 
WHERE ativo = 1
GROUP BY vendedor_id, vendedor;

-- Buscar contatos de uma filial específica
SELECT * FROM contatos_whatsapp 
WHERE wpp_filial = '5527981920127';

-- Contatos inativos (soft deleted)
SELECT * FROM contatos_whatsapp 
WHERE ativo = 0;
```

---

## 🚀 Próximos Passos Sugeridos

1. **Autenticação:** Adicionar middleware de autenticação
2. **Webhook:** Criar endpoint para receber updates de WhatsApp
3. **Estatísticas:** Endpoint `/api/contatos/stats` para métricas
4. **Bulk Operations:** Importar/exportar múltiplos contatos
5. **Histórico:** Tabela de auditoria para rastrear alterações

---

## 📝 Notas Importantes

- ⚠️ **Independente:** Esta API não interfere com outras funcionalidades do sistema
- 🔒 **Isolada:** Usa apenas a tabela `contatos_whatsapp`
- ✅ **Validada:** Todas as entradas são validadas antes de inserir no banco
- 🔗 **FK Segura:** Valida `vendedor_id` antes de aceitar
- 📊 **Paginada:** Todas as listagens suportam paginação

---

## 🐛 Troubleshooting

### Erro: "Vendedor não encontrado ou inativo"
**Causa:** O `vendedor_id` não existe ou o vendedor está inativo  
**Solução:** Verificar se o vendedor existe: `SELECT * FROM vendedores WHERE id = 228`

### Erro: "Contato com este id_contato já existe"
**Causa:** Tentando criar contato com `id_contato` duplicado  
**Solução:** Use `PATCH /api/contatos/[id]` para atualizar ou escolha outro `id_contato`

### Erro: "Formato inválido para wpp_filial"
**Causa:** Telefone com formato inválido  
**Solução:** Use apenas números (10-15 dígitos): `5527981920127`

---

**Versão:** 1.0  
**Data:** 30/11/2024  
**Autor:** Dashboard SprintHub

