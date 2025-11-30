# 🔗 API de Relação de Contatos com SprintHub

## 📋 Endpoint

**POST /api/contatos/relaction**

Verifica se um contato existe no banco e, se existir, chama automaticamente a API do SprintHub.

---

## 📥 Request

### **Body (JSON):**
```json
{
  "wpp_filial": "5527981920127",
  "wpp_contato": "5511989882867",
  "atendimento": "15454"
}
```

### **Campos:**
- `wpp_filial` (obrigatório) - Telefone WhatsApp da filial
- `wpp_contato` (obrigatório) - Telefone WhatsApp do contato
- `atendimento` (obrigatório) - ID do atendimento

---

## 📤 Responses

### **✅ Cenário 1: SUCESSO - Contato existe e API SprintHub chamada**

**Status:** `200 OK`

```json
{
  "success": true,
  "exists": true,
  "message": "Contato encontrado e API SprintHub chamada",
  "parametros": {
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "atendimento": "15454"
  },
  "contato": {
    "id_contato": "65853",
    "nome": "cezar freitas",
    "vendedor": "Gilmar ES OUTDOOR",
    "vendedor_id": 228,
    "ativo": true
  },
  "sprinthub": {
    "success": true,
    "called": true,
    "status_code": 200,
    "payload_sent": {
      "lead": "65853",
      "attendance": "15454"
    },
    "response": {
      "success": true,
      "message": "Relação criada com sucesso",
      "data": {
        "lead_id": "65853",
        "attendance_id": "15454",
        "created_at": "2024-11-30T10:30:00Z"
      }
    },
    "error": null
  }
}
```

**Detalhes:**
- ✅ Contato encontrado no banco
- ✅ API SprintHub chamada com sucesso
- ✅ Retorna dados do contato
- ✅ Retorna resposta completa do SprintHub

---

### **❌ Cenário 2: ERRO - Contato NÃO existe**

**Status:** `404 Not Found`

```json
{
  "success": false,
  "exists": false,
  "message": "Contato 5511989882867 não encontrado na filial 5527981920127",
  "parametros": {
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "atendimento": "15454"
  }
}
```

**Detalhes:**
- ❌ Contato não encontrado no banco
- ❌ API SprintHub NÃO foi chamada
- ℹ️ Retorna mensagem informando que o contato não existe

---

### **⚠️ Cenário 3: PARCIAL - Contato existe mas API SprintHub falhou**

**Status:** `200 OK`

```json
{
  "success": true,
  "exists": true,
  "message": "Contato encontrado e API SprintHub chamada",
  "parametros": {
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "atendimento": "15454"
  },
  "contato": {
    "id_contato": "65853",
    "nome": "cezar freitas",
    "vendedor": "Gilmar ES OUTDOOR",
    "vendedor_id": 228,
    "ativo": true
  },
  "sprinthub": {
    "success": false,
    "called": true,
    "status_code": 401,
    "payload_sent": {
      "lead": "65853",
      "attendance": "15454"
    },
    "response": {
      "success": false,
      "error": "Unauthorized",
      "message": "Token inválido ou expirado"
    },
    "error": "SprintHub API retornou status 401"
  }
}
```

**Detalhes:**
- ✅ Contato encontrado no banco
- ⚠️ API SprintHub foi chamada mas retornou erro
- ℹ️ Retorna detalhes do erro do SprintHub

---

### **❌ Cenário 4: ERRO - Campos obrigatórios faltando**

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Campos obrigatórios: wpp_filial, wpp_contato, atendimento",
  "example": {
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "atendimento": "15454"
  }
}
```

**Detalhes:**
- ❌ Um ou mais campos obrigatórios não foram enviados
- ℹ️ Retorna exemplo de payload correto

---

### **❌ Cenário 5: ERRO - Erro interno do servidor**

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "message": "Erro ao processar requisição",
  "error": "Connection timeout"
}
```

**Detalhes:**
- ❌ Erro inesperado no servidor
- ℹ️ Retorna mensagem de erro técnico

---

## 💡 Exemplos de Uso

### **1. cURL**
```bash
curl -X POST http://localhost:3000/api/contatos/relaction \
  -H "Content-Type: application/json" \
  -d '{
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "atendimento": "15454"
  }'
```

### **2. JavaScript/Fetch**
```javascript
const response = await fetch('/api/contatos/relaction', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    wpp_filial: '5527981920127',
    wpp_contato: '5511989882867',
    atendimento: '15454'
  })
})

const data = await response.json()

if (data.success && data.exists) {
  console.log('✅ Contato encontrado!')
  console.log('ID do Lead:', data.contato.id_contato)
  console.log('Nome:', data.contato.nome)
  
  if (data.sprinthub.success) {
    console.log('✅ SprintHub chamado com sucesso!')
    console.log('Resposta:', data.sprinthub.response)
  } else {
    console.warn('⚠️ Erro ao chamar SprintHub:', data.sprinthub.error)
  }
} else {
  console.error('❌ Contato não encontrado')
}
```

### **3. Axios**
```javascript
import axios from 'axios'

try {
  const { data } = await axios.post('/api/contatos/relaction', {
    wpp_filial: '5527981920127',
    wpp_contato: '5511989882867',
    atendimento: '15454'
  })

  if (data.exists) {
    console.log('Contato:', data.contato)
    console.log('SprintHub:', data.sprinthub)
  }
} catch (error) {
  if (error.response?.status === 404) {
    console.log('Contato não existe')
  } else {
    console.error('Erro:', error.response?.data)
  }
}
```

### **4. Console do Navegador**
```javascript
fetch('/api/contatos/relaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wpp_filial: '5527981920127',
    wpp_contato: '5511989882867',
    atendimento: '15454'
  })
})
.then(r => r.json())
.then(data => console.log(data))
```

---

## 🔄 Fluxo de Execução

```
1. Recebe requisição POST
   ↓
2. Valida campos obrigatórios
   ↓
3. Busca contato no banco (wpp_filial + wpp_contato)
   ↓
4. Se NÃO existe → Retorna 404
   ↓
5. Se existe → Chama API SprintHub
   ↓
   Payload: {
     "lead": "id_contato_do_banco",
     "attendance": "atendimento_recebido"
   }
   ↓
6. Retorna resposta completa:
   - Dados do contato
   - Status da chamada SprintHub
   - Resposta do SprintHub
```

---

## 📊 Estrutura da Resposta

### **Objeto Principal:**
```typescript
{
  success: boolean          // Operação teve sucesso?
  exists: boolean           // Contato existe no banco?
  message: string           // Mensagem descritiva
  parametros: {             // Parâmetros recebidos
    wpp_filial: string
    wpp_contato: string
    atendimento: string
  }
  contato?: {               // Dados do contato (se existir)
    id_contato: string
    nome: string
    vendedor: string
    vendedor_id: number
    ativo: boolean
  }
  sprinthub?: {             // Resultado da chamada (se contato existir)
    success: boolean        // SprintHub respondeu com sucesso?
    called: boolean         // API foi chamada?
    payload_sent: {         // Payload enviado ao SprintHub
      lead: string
      attendance: string
    }
    response: any           // Resposta do SprintHub
    error: string | null    // Erro (se houver)
  }
}
```

---

## 🔗 API do SprintHub

### **Endpoint Chamado:**
```
POST https://sprinthub-api-master.sprinthub.app/sac360/relaction
     ?i=grupointeli
     &apitoken=e24be9a5-c50d-44a6-8128-e21ab15e63af
```

### **Payload Enviado:**
```json
{
  "lead": "65853",      // id_contato encontrado no banco
  "attendance": "15454" // atendimento recebido na requisição
}
```

---

## 📡 Possíveis Retornos da API SprintHub

### **✅ Sucesso (200 OK)**
```json
{
  "success": true,
  "message": "Relação criada com sucesso",
  "data": {
    "lead_id": "65853",
    "attendance_id": "15454",
    "created_at": "2024-11-30T10:30:00Z"
  }
}
```

### **❌ Token Inválido (401 Unauthorized)**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

### **❌ Lead Não Encontrado (404 Not Found)**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Lead não encontrado no sistema"
}
```

### **❌ Dados Inválidos (400 Bad Request)**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Parâmetros inválidos",
  "details": {
    "lead": "Campo obrigatório",
    "attendance": "Campo obrigatório"
  }
}
```

### **❌ Erro Interno (500 Internal Server Error)**
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Erro ao processar requisição"
}
```

### **⚠️ Relação Já Existe (409 Conflict)**
```json
{
  "success": false,
  "error": "Conflict",
  "message": "Relação entre lead e attendance já existe"
}
```

---

## 📋 Exemplo de Resposta Completa da Nossa API

```json
{
  "success": true,
  "exists": true,
  "message": "Contato encontrado e API SprintHub chamada",
  "parametros": {
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "atendimento": "15454"
  },
  "contato": {
    "id_contato": "65853",
    "nome": "cezar freitas",
    "vendedor": "Gilmar ES OUTDOOR",
    "vendedor_id": 228,
    "ativo": true
  },
  "sprinthub": {
    "success": true,
    "called": true,
    "status_code": 200,
    "payload_sent": {
      "lead": "65853",
      "attendance": "15454"
    },
    "response": {
      "success": true,
      "message": "Relação criada com sucesso",
      "data": {
        "lead_id": "65853",
        "attendance_id": "15454",
        "created_at": "2024-11-30T10:30:00Z"
      }
    },
    "error": null
  }
}
```

**Campos importantes do `sprinthub`:**
- `success` - API retornou sucesso (status 200-299)?
- `called` - API foi chamada (sempre true se contato existir)?
- `status_code` - Código HTTP retornado pela API SprintHub
- `payload_sent` - Exatamente o que foi enviado ao SprintHub
- `response` - **Resposta COMPLETA do SprintHub** (JSON ou texto)
- `error` - Mensagem de erro (se houver)

---

## 🧪 Script de Teste

Salve como `scripts/test-relaction.js`:

```javascript
const BASE_URL = 'http://localhost:3000'

async function testarRelaction() {
  console.log('\n🧪 Testando API Relaction...\n')

  const payload = {
    wpp_filial: '5527981920127',
    wpp_contato: '5511989882867',
    atendimento: '15454'
  }

  console.log('📤 Enviando:', payload)

  try {
    const response = await fetch(`${BASE_URL}/api/contatos/relaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    console.log(`\n📡 Status: ${response.status} ${response.statusText}`)

    const data = await response.json()

    console.log('\n📄 Resposta Completa:')
    console.log(JSON.stringify(data, null, 2))

    if (data.exists) {
      console.log('\n✅ CONTATO ENCONTRADO')
      console.log(`   ID: ${data.contato.id_contato}`)
      console.log(`   Nome: ${data.contato.nome}`)
      
      if (data.sprinthub.success) {
        console.log('\n✅ SPRINTHUB CHAMADO COM SUCESSO')
        console.log('   Resposta:', data.sprinthub.response)
      } else {
        console.log('\n⚠️ ERRO AO CHAMAR SPRINTHUB')
        console.log('   Erro:', data.sprinthub.error)
      }
    } else {
      console.log('\n❌ CONTATO NÃO ENCONTRADO')
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
  }
}

testarRelaction()
```

**Execute:**
```bash
node scripts/test-relaction.js
```

---

## 📝 Logs Esperados

### **Sucesso Completo:**
```
🧪 Testando API Relaction...

📤 Enviando: {
  wpp_filial: '5527981920127',
  wpp_contato: '5511989882867',
  atendimento: '15454'
}

📡 Status: 200 OK

✅ CONTATO ENCONTRADO
   ID: 65853
   Nome: cezar freitas

✅ SPRINTHUB CHAMADO COM SUCESSO
   Resposta: { status: 'success', message: 'Relação criada' }
```

### **Contato Não Existe:**
```
📡 Status: 404 Not Found

❌ CONTATO NÃO ENCONTRADO
```

---

## ⚙️ Configuração

### **URL da API SprintHub:**
Configurada em `app/api/contatos/relaction/route.ts`:

```typescript
const sprinthubUrl = 'https://sprinthub-api-master.sprinthub.app/sac360/relaction?i=grupointeli&apitoken=e24be9a5-c50d-44a6-8128-e21ab15e63af'
```

**Para alterar:**
1. Edite o arquivo `app/api/contatos/relaction/route.ts`
2. Modifique a constante `sprinthubUrl`
3. Reinicie o servidor

---

## 🐛 Troubleshooting

### **Erro: "Contato não encontrado"**
**Causa:** Não existe registro com aquele `wpp_filial` + `wpp_contato`  
**Solução:** Criar o contato primeiro usando `POST /api/contatos`

### **Erro: "SprintHub API retornou status 401"**
**Causa:** Token inválido ou expirado  
**Solução:** Verificar token no código da API

### **Erro: "Connection timeout"**
**Causa:** API do SprintHub não respondeu  
**Solução:** Verificar conectividade com o servidor SprintHub

---

## 📚 Endpoints Relacionados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/contatos/relaction` | POST | **Verifica e chama SprintHub** |
| `/api/contatos/check` | GET | Apenas verifica se existe |
| `/api/contatos` | POST | Criar novo contato |
| `/api/contatos/[id]` | GET | Buscar contato por ID |

---

**Arquivo:** `app/api/contatos/relaction/route.ts`  
**Versão:** 1.0  
**Data:** 30/11/2024

