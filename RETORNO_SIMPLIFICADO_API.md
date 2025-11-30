# 📊 Retorno Simplificado da API

## ✅ Formato do Retorno

A API `/api/contatos/check` agora retorna um **JSON simplificado** com apenas os campos essenciais.

---

## 📋 Cenários Possíveis

### **1️⃣ Contato EXISTE - Sem atendimento**

**Request:**
```
GET /api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867
```

**Response (200 OK):**
```json
{
  "exists": true,
  "id_contato": "65853",
  "nome": "cezar freitas",
  "vendedor_id": 228
}
```

**Campos:**
- `exists` - Contato existe no banco
- `id_contato` - ID do contato encontrado
- `nome` - Nome do contato
- `vendedor_id` - ID do vendedor

---

### **2️⃣ Contato EXISTE + Atendimento + SprintHub SUCESSO**

**Request:**
```
GET /api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454
```

**Response (200 OK):**
```json
{
  "exists": true,
  "id_contato": "65853",
  "nome": "cezar freitas",
  "vendedor_id": 228,
  "sprinthub": {
    "success": true,
    "message": "Relação criada com sucesso",
    "data": {
      "lead_id": "65853",
      "attendance_id": "15454"
    }
  },
  "sprinthub_success": true,
  "sprinthub_status": 200
}
```

**Campos adicionais:**
- `sprinthub` - **Resposta EXATA do SprintHub**
- `sprinthub_success` - SprintHub retornou sucesso?
- `sprinthub_status` - Código HTTP do SprintHub

---

### **3️⃣ Contato EXISTE + Atendimento + SprintHub ERRO**

**Request:**
```
GET /api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454
```

**Response (200 OK):**
```json
{
  "exists": true,
  "id_contato": "65853",
  "nome": "cezar freitas",
  "vendedor_id": 228,
  "sprinthub": {
    "msg": "O atendimento não foi encontrado."
  },
  "sprinthub_success": false,
  "sprinthub_status": 400
}
```

**Análise:**
- ✅ Contato existe no nosso banco
- ❌ SprintHub retornou erro (status 400)
- 📄 Campo `sprinthub` contém a resposta exata do SprintHub

---

### **4️⃣ Contato NÃO EXISTE**

**Request:**
```
GET /api/contatos/check?wpp_filial=5527981920127&wpp_contato=9999999999999
```

**Response (200 OK):**
```json
{
  "exists": false,
  "message": "Contato não encontrado"
}
```

**Campos:**
- `exists` - false
- `message` - Mensagem informativa

---

### **5️⃣ Parâmetros Faltando**

**Request:**
```
GET /api/contatos/check?wpp_filial=5527981920127
```

**Response (400 Bad Request):**
```json
{
  "exists": false,
  "error": "Parâmetros obrigatórios: wpp_filial e wpp_contato"
}
```

---

## 🔑 Campos Principais

| Campo | Tipo | Quando aparece | Descrição |
|-------|------|----------------|-----------|
| `exists` | boolean | Sempre | Contato existe no banco? |
| `id_contato` | string | Se exists=true | ID do contato encontrado |
| `nome` | string | Se exists=true | Nome do contato |
| `vendedor_id` | number | Se exists=true | ID do vendedor |
| `sprinthub` | object | Se atendimento fornecido | **Resposta EXATA do SprintHub** |
| `sprinthub_success` | boolean | Se atendimento fornecido | SprintHub retornou sucesso? |
| `sprinthub_status` | number | Se atendimento fornecido | Código HTTP do SprintHub |
| `message` | string | Se exists=false | Mensagem de erro |
| `error` | string | Em caso de erro | Descrição do erro |

---

## 💡 Como Usar no Código

### **Verificação Simples:**
```javascript
const response = await fetch(
  '/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867'
)
const data = await response.json()

if (data.exists) {
  console.log('ID:', data.id_contato)
  console.log('Nome:', data.nome)
} else {
  console.log('Não existe')
}
```

### **Com SprintHub:**
```javascript
const response = await fetch(
  '/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454'
)
const data = await response.json()

if (data.exists) {
  console.log('Contato:', data.id_contato)
  
  // Verificar resposta do SprintHub
  if (data.sprinthub_success) {
    console.log('✅ SprintHub OK:', data.sprinthub)
  } else {
    console.log('❌ SprintHub Error:', data.sprinthub)
    console.log('Status:', data.sprinthub_status)
  }
}
```

### **Tratamento Completo:**
```javascript
const { exists, id_contato, nome, sprinthub, sprinthub_success } = await fetch(
  '/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454'
).then(r => r.json())

if (!exists) {
  return console.log('Contato não existe no banco')
}

console.log(`Contato ${nome} (ID: ${id_contato})`)

if (sprinthub) {
  if (sprinthub_success) {
    console.log('SprintHub:', sprinthub)
  } else {
    console.error('Erro SprintHub:', sprinthub.msg || sprinthub.message)
  }
}
```

---

## 📊 Resumo das Mudanças

### **ANTES (Verboso):**
```json
{
  "success": true,
  "exists": true,
  "message": "Contato encontrado...",
  "parametros": { ... },
  "contato": { 
    "id_contato": "...",
    "wpp_filial": "...",
    "wpp_contato": "...",
    "vendedor": "...",
    ...10 campos...
  },
  "sprinthub": {
    "success": true,
    "called": true,
    "status_code": 200,
    "payload_sent": { ... },
    "response": { ... },
    "error": null
  }
}
```

### **AGORA (Simplificado):**
```json
{
  "exists": true,
  "id_contato": "65853",
  "nome": "cezar freitas",
  "vendedor_id": 228,
  "sprinthub": { 
    // RESPOSTA EXATA DO SPRINTHUB
  },
  "sprinthub_success": true,
  "sprinthub_status": 200
}
```

**Redução:** ~15 linhas → ~7 linhas ✅

---

## 🔍 Campo `sprinthub`

Este campo contém **exatamente** o que o SprintHub retornou:

### **Sucesso:**
```json
"sprinthub": {
  "success": true,
  "message": "Relação criada com sucesso"
}
```

### **Erro:**
```json
"sprinthub": {
  "msg": "O atendimento não foi encontrado."
}
```

### **Outro formato possível:**
```json
"sprinthub": "OK - Processado"  // Se retornar texto
```

---

## 🧪 Teste Agora:

```bash
# Sem atendimento (não chama SprintHub)
curl "http://localhost:3000/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867"

# Com atendimento (chama SprintHub)
curl "http://localhost:3000/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454"
```

---

**Retorno agora é limpo e direto ao ponto!** ✅

