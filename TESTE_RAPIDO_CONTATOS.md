# ✅ Tabela Criada! Agora Teste a API

A tabela `contatos_whatsapp` foi criada com sucesso no banco `inteli_db`! 

---

## 🚀 Teste Rápido (3 minutos)

### 1️⃣ Verificar se o Vendedor Existe

**Execute no phpMyAdmin:**
```sql
SELECT id, name, lastName, ativo FROM vendedores WHERE id = 228;
```

**Se NÃO existir**, use outro vendedor_id ou crie um teste:
```sql
-- Ver vendedores disponíveis
SELECT id, name, lastName FROM vendedores WHERE ativo = 1 LIMIT 10;
```

---

### 2️⃣ Iniciar o Servidor Next.js

```bash
npm run dev
```

Aguarde aparecer:
```
✓ Ready in XXXXms
- Local: http://localhost:3000
```

---

### 3️⃣ Testar Inserção

**Opção A - Script Automático:**
```bash
node scripts/test-insert-contato.js
```

**Opção B - cURL (Windows PowerShell):**
```powershell
curl -X POST http://localhost:3000/api/contatos `
  -H "Content-Type: application/json" `
  -d '{\"id_contato\":\"65853\",\"wpp_filial\":\"5527981920127\",\"wpp_contato\":\"5511989882867\",\"vendedor\":\"Gilmar ES OUTDOOR\",\"vendedor_id\":\"228\",\"nome\":\"cezar freitas\"}'
```

**Opção C - Console do Navegador:**

1. Abra http://localhost:3000
2. Pressione F12 (Console)
3. Cole e execute:

```javascript
fetch('/api/contatos', {
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
})
.then(r => r.json())
.then(console.log)
```

---

### 4️⃣ Verificar no Banco

**Volte ao phpMyAdmin e execute:**
```sql
SELECT * FROM contatos_whatsapp;
```

**Deve aparecer:**
```
id_contato: 65853
nome: cezar freitas
vendedor: Gilmar ES OUTDOOR
...
```

---

## 📊 Resposta Esperada (Sucesso)

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
    "observacoes": null,
    "created_at": "2024-11-30T...",
    "updated_at": "2024-11-30T..."
  }
}
```

---

## ⚠️ Possíveis Erros

### ❌ "Vendedor não encontrado ou inativo"

**Causa:** vendedor_id 228 não existe ou está inativo

**Solução:**
```sql
-- Ver vendedores disponíveis
SELECT id, name, lastName FROM vendedores WHERE ativo = 1 LIMIT 10;

-- Use um ID que existe, exemplo:
-- vendedor_id: "123" (substitua no JSON)
```

### ❌ "Contato com este id_contato já existe"

**Causa:** Já inseriu um contato com id_contato = "65853"

**Solução:** Use outro ID:
```javascript
id_contato: '65854'  // ou outro número único
```

### ❌ "Erro ao conectar com o servidor"

**Causa:** Servidor Next.js não está rodando

**Solução:**
```bash
# Terminal 1
npm run dev

# Terminal 2 (depois que o servidor iniciar)
node scripts/test-insert-contato.js
```

---

## 🔄 Testar Outras Operações

### Listar Todos os Contatos
```javascript
fetch('/api/contatos')
  .then(r => r.json())
  .then(console.log)
```

### Buscar Contato Específico
```javascript
fetch('/api/contatos/65853')
  .then(r => r.json())
  .then(console.log)
```

### Atualizar Contato
```javascript
fetch('/api/contatos/65853', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    observacoes: 'Cliente VIP - Follow up em 7 dias'
  })
})
.then(r => r.json())
.then(console.log)
```

### Desativar Contato
```javascript
fetch('/api/contatos/65853', {
  method: 'DELETE'
})
.then(r => r.json())
.then(console.log)
```

---

## 📚 Documentação Completa

Para mais exemplos e detalhes, consulte:
- `docs/API_CONTATOS.md` - Documentação completa da API
- `scripts/test-contatos-api.js` - Suite completa de testes

---

## ✅ Checklist de Teste

- [ ] Tabela `contatos_whatsapp` criada ✅
- [ ] Verificar se vendedor_id existe no banco
- [ ] Servidor Next.js rodando (`npm run dev`)
- [ ] Testar POST (criar contato)
- [ ] Verificar no phpMyAdmin se foi inserido
- [ ] Testar GET (listar contatos)
- [ ] Testar PATCH (atualizar)
- [ ] Testar DELETE (desativar)

---

**Próximo Passo:** Execute `node scripts/test-insert-contato.js` 🚀

