# 🔍 Como Consultar se Contato Existe

## ✅ Endpoint Criado

### **GET /api/contatos/check**

Verifica se um `wpp_contato` existe em uma `wpp_filial` específica.

⚠️ **IMPORTANTE:** Se o parâmetro `atendimento` for fornecido, a API **automaticamente chama o SprintHub** e retorna a resposta.

---

## 📋 Uso

### **URL:**
```
GET /api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454
```

### **Parâmetros Query:**

**Obrigatórios:**
- `wpp_filial` - Telefone da filial
- `wpp_contato` - Telefone do contato

**Opcionais:**
- `atendimento` - ID do atendimento para referência (não filtra, apenas retorna o valor enviado)

---

## 💡 Exemplos

### **1. cURL - Sem atendimento**
```bash
curl "http://localhost:3000/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867"
```

### **2. cURL - Com atendimento**
```bash
curl "http://localhost:3000/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454"
```

### **3. JavaScript/TypeScript**
```javascript
const wppFilial = '5527981920127'
const wppContato = '5511989882867'
const atendimento = '15454' // opcional

// Montar URL com parâmetros opcionais
let url = `/api/contatos/check?wpp_filial=${wppFilial}&wpp_contato=${wppContato}`
if (atendimento) {
  url += `&atendimento=${atendimento}`
}

const response = await fetch(url)
const data = await response.json()

if (data.exists) {
  console.log('✅ Contato existe!', data.contato)
  console.log('Parâmetros usados:', data.parametros)
} else {
  console.log('❌ Contato não encontrado')
}
```

### **4. Console do Navegador - Sem atendimento**
```javascript
fetch('/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867')
  .then(r => r.json())
  .then(data => {
    console.log('Existe?', data.exists)
    if (data.exists) {
      console.log('Dados:', data.contato)
    }
  })
```

### **5. Console do Navegador - Com atendimento**
```javascript
fetch('/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454')
  .then(r => r.json())
  .then(data => {
    console.log('Existe?', data.exists)
    console.log('Parâmetros:', data.parametros)
    if (data.exists) {
      console.log('ID Atendimento:', data.contato.id_contato)
      console.log('Nome:', data.contato.nome)
    }
  })
```

---

## 📊 Respostas

### **✅ Quando EXISTE - Sem atendimento (200 OK)**
```json
{
  "exists": true,
  "id_contato": "65853",
  "nome": "cezar freitas",
  "vendedor_id": 228
}
```

### **✅ Quando EXISTE - Com atendimento + SprintHub Sucesso (200 OK)**
```json
{
  "exists": true,
  "id_contato": "65853",
  "nome": "cezar freitas",
  "vendedor_id": 228,
  "sprinthub": {
    "success": true,
    "message": "Relação criada com sucesso"
  },
  "sprinthub_success": true,
  "sprinthub_status": 200
}
```

### **⚠️ Quando EXISTE - Com atendimento + SprintHub Erro (200 OK)**
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

### **❌ Quando NÃO EXISTE (200 OK)**
```json
{
  "exists": false,
  "message": "Contato não encontrado"
}
```

### **❌ Quando FALTA PARÂMETRO (400 Bad Request)**
```json
{
  "exists": false,
  "error": "Parâmetros obrigatórios: wpp_filial e wpp_contato"
}
```

---

## 🔄 Fluxo de Uso Completo

### **1. Verificar se contato existe**
```javascript
const existe = await fetch(
  '/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867'
).then(r => r.json())

if (existe.exists) {
  console.log('Contato já cadastrado:', existe.contato.nome)
  // Pode atualizar se necessário
} else {
  console.log('Contato não existe, pode criar')
  // Criar novo contato
}
```

### **2. Se não existir, criar**
```javascript
if (!existe.exists) {
  const novoContato = await fetch('/api/contatos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_contato: '65853',
      wpp_filial: '5527981920127',
      wpp_contato: '5511989882867',
      vendedor: 'Gilmar ES OUTDOOR',
      vendedor_id: '228',
      nome: 'cezar freitas'
    })
  }).then(r => r.json())
  
  console.log('Contato criado:', novoContato)
}
```

---

## 🧪 Script de Teste

Salve como `scripts/test-check-contato.js`:

```javascript
const BASE_URL = 'http://localhost:3000'

async function testarConsulta() {
  console.log('\n🔍 Testando consulta de contato...\n')

  const wppFilial = '5527981920127'
  const wppContato = '5511989882867'

  try {
    const response = await fetch(
      `${BASE_URL}/api/contatos/check?wpp_filial=${wppFilial}&wpp_contato=${wppContato}`
    )

    const data = await response.json()

    console.log('Status:', response.status)
    console.log('\nResposta:')
    console.log(JSON.stringify(data, null, 2))

    if (data.exists) {
      console.log('\n✅ CONTATO EXISTE!')
      console.log(`Nome: ${data.contato.nome}`)
      console.log(`Vendedor: ${data.contato.vendedor}`)
    } else {
      console.log('\n❌ CONTATO NÃO EXISTE!')
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
  }
}

testarConsulta()
```

**Execute:**
```bash
node scripts/test-check-contato.js
```

---

## 📝 Consultas SQL Equivalentes

### **Verificar se existe**
```sql
SELECT * FROM contatos_whatsapp 
WHERE wpp_filial = '5527981920127' 
  AND wpp_contato = '5511989882867';
```

### **Contar quantos existem**
```sql
SELECT COUNT(*) as total 
FROM contatos_whatsapp 
WHERE wpp_filial = '5527981920127' 
  AND wpp_contato = '5511989882867';
```

### **Ver todos de uma filial**
```sql
SELECT wpp_contato, nome, vendedor 
FROM contatos_whatsapp 
WHERE wpp_filial = '5527981920127' 
  AND ativo = 1;
```

---

## 🎯 Casos de Uso

### **1. Validação antes de criar**
```javascript
async function criarContatoSeNaoExistir(dados) {
  const existe = await fetch(
    `/api/contatos/check?wpp_filial=${dados.wpp_filial}&wpp_contato=${dados.wpp_contato}`
  ).then(r => r.json())

  if (existe.exists) {
    return { success: false, message: 'Contato já existe' }
  }

  return fetch('/api/contatos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  }).then(r => r.json())
}
```

### **2. Verificar múltiplos contatos**
```javascript
async function verificarContatos(filial, listaContatos) {
  const resultados = []
  
  for (const contato of listaContatos) {
    const existe = await fetch(
      `/api/contatos/check?wpp_filial=${filial}&wpp_contato=${contato}`
    ).then(r => r.json())
    
    resultados.push({
      contato,
      existe: existe.exists
    })
  }
  
  return resultados
}

// Uso:
const contatos = ['5511989882867', '5511999999999', '5511888888888']
const resultado = await verificarContatos('5527981920127', contatos)
console.log(resultado)
```

### **3. Obter dados se existir**
```javascript
async function obterOuCriarContato(dados) {
  const check = await fetch(
    `/api/contatos/check?wpp_filial=${dados.wpp_filial}&wpp_contato=${dados.wpp_contato}`
  ).then(r => r.json())

  if (check.exists) {
    return check.contato // Retorna dados existentes
  }

  // Cria novo
  const novo = await fetch('/api/contatos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  }).then(r => r.json())

  return novo.contato
}
```

---

## 🔗 Endpoints Relacionados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/contatos/check` | GET | **Verificar se existe** |
| `/api/contatos` | POST | Criar novo contato |
| `/api/contatos` | GET | Listar contatos |
| `/api/contatos/[id]` | GET | Buscar por id_contato |
| `/api/contatos/[id]` | PATCH | Atualizar contato |
| `/api/contatos/[id]` | DELETE | Desativar/remover |

---

## ✅ Teste Rápido

```bash
# 1. Inicie o servidor
npm run dev

# 2. Teste a consulta
curl "http://localhost:3000/api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867"
```

---

**Documentação Completa:** `docs/API_CONTATOS.md`  
**Arquivo criado:** `app/api/contatos/check/route.ts`

