# 🧪 Teste da API Relaction + SprintHub

## ✅ O que foi implementado:

A API `/api/contatos/relaction` agora:

1. ✅ Verifica se contato existe (wpp_filial + wpp_contato)
2. ✅ Se existir, chama automaticamente a API do SprintHub
3. ✅ **Retorna a resposta COMPLETA do SprintHub no JSON**

---

## 🚀 Como Testar:

### **1. Iniciar o servidor**
```bash
npm run dev
```

### **2. Executar o teste**
```bash
node scripts/test-relaction.js
```

---

## 📊 O que você verá no retorno:

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
    "success": true,                    // ✅ SprintHub retornou sucesso?
    "called": true,                     // ✅ API foi chamada?
    "status_code": 200,                 // 📡 Código HTTP do SprintHub
    "payload_sent": {                   // 📤 O QUE FOI ENVIADO
      "lead": "65853",
      "attendance": "15454"
    },
    "response": {                       // 📥 RESPOSTA EXATA DO SPRINTHUB
      "success": true,
      "message": "Relação criada com sucesso",
      "data": {
        "lead_id": "65853",
        "attendance_id": "15454",
        "created_at": "2024-11-30T10:30:00Z"
      }
    },
    "error": null                       // ❌ Erro (se houver)
  }
}
```

---

## 🔍 Campo `sprinthub.response`

Este campo contém **EXATAMENTE** o que a API do SprintHub retornou:

### **Exemplo 1: Sucesso**
```json
"response": {
  "success": true,
  "message": "Relação criada com sucesso",
  "data": { ... }
}
```

### **Exemplo 2: Erro de Autenticação**
```json
"response": {
  "success": false,
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

### **Exemplo 3: Erro de Validação**
```json
"response": {
  "success": false,
  "error": "Bad Request",
  "message": "Parâmetros inválidos"
}
```

### **Exemplo 4: Resposta em Texto**
Se o SprintHub retornar texto ao invés de JSON:
```json
"response": "OK - Relação criada"
```

---

## 📱 Teste via Console do Navegador

1. Abra http://localhost:3000
2. Pressione **F12** → **Console**
3. Cole e execute:

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
.then(data => {
  console.log('=== NOSSA API ===')
  console.log('Contato existe?', data.exists)
  
  if (data.exists) {
    console.log('ID do Contato:', data.contato.id_contato)
    
    console.log('\n=== SPRINTHUB ===')
    console.log('Status Code:', data.sprinthub.status_code)
    console.log('Sucesso?', data.sprinthub.success)
    console.log('Resposta:', data.sprinthub.response)
  }
})
```

---

## 📦 Estrutura do Retorno

```typescript
interface RelactionResponse {
  success: boolean
  exists: boolean
  message: string
  parametros: {
    wpp_filial: string
    wpp_contato: string
    atendimento: string
  }
  contato?: {
    id_contato: string
    nome: string
    vendedor: string
    vendedor_id: number
    ativo: boolean
  }
  sprinthub?: {
    success: boolean              // SprintHub retornou sucesso (200-299)
    called: boolean               // API foi chamada (true se contato existir)
    status_code: number           // Código HTTP da resposta (200, 401, 404, etc)
    payload_sent: {               // Payload enviado ao SprintHub
      lead: string                // id_contato do banco
      attendance: string          // atendimento recebido
    }
    response: any                 // RESPOSTA EXATA DO SPRINTHUB (JSON ou texto)
    error: string | null          // Mensagem de erro (se houver)
  }
}
```

---

## 🔄 Fluxo Completo

```
1. POST /api/contatos/relaction
   Body: { wpp_filial, wpp_contato, atendimento }
   ↓
2. Busca contato no banco MySQL
   WHERE wpp_filial = ? AND wpp_contato = ?
   ↓
3a. NÃO EXISTE → Retorna 404
    {
      "success": false,
      "exists": false,
      "message": "Contato não encontrado"
    }
   
3b. EXISTE → Chama SprintHub
    POST https://sprinthub-api...
    Body: { "lead": "id_contato_do_banco", "attendance": "atendimento" }
    ↓
4. Retorna resposta completa:
   {
     "contato": { ... dados do banco ... },
     "sprinthub": {
       "status_code": 200,
       "response": { ... RETORNO EXATO DO SPRINTHUB ... }
     }
   }
```

---

## 🧪 Comandos de Teste

### **Teste completo:**
```bash
node scripts/test-relaction.js
```

### **Teste rápido via cURL:**
```bash
curl -X POST http://localhost:3000/api/contatos/relaction \
  -H "Content-Type: application/json" \
  -d '{
    "wpp_filial": "5527981920127",
    "wpp_contato": "5511989882867",
    "atendimento": "15454"
  }'
```

---

## 📋 Checklist

- [x] Tabela `contatos_whatsapp` criada
- [x] Contato `65853` inserido no banco
- [ ] Servidor Next.js rodando (`npm run dev`)
- [ ] Executar teste: `node scripts/test-relaction.js`
- [ ] Verificar campo `sprinthub.response` na resposta

---

## 💡 Dicas

- O campo `sprinthub.response` contém **exatamente** o que o SprintHub retornou
- O campo `sprinthub.status_code` mostra o código HTTP (200, 401, 404, etc)
- Se `sprinthub.success = false`, veja `sprinthub.error` para detalhes
- A resposta pode ser JSON ou texto, dependendo do SprintHub

---

**Arquivo da API:** `app/api/contatos/relaction/route.ts`  
**Documentação:** `docs/API_CONTATOS_RELACTION.md`  
**Teste:** `scripts/test-relaction.js`

