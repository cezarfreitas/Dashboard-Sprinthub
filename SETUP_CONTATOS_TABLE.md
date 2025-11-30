# 🔧 Como Criar a Tabela contatos_whatsapp

A API `/api/contatos` precisa da tabela `contatos_whatsapp` criada no banco de dados. Escolha um dos métodos abaixo:

---

## ✅ Método 1: Script Automático (RECOMENDADO)

Execute o script Node.js que cria a tabela automaticamente:

```bash
node scripts/setup-contatos-table.js
```

**Vantagens:**
- ✅ Cria a tabela automaticamente
- ✅ Verifica se já existe
- ✅ Mostra a estrutura criada
- ✅ Usa as credenciais do `.env.local`

**Output esperado:**
```
=== 🔧 SETUP DA TABELA CONTATOS_WHATSAPP ===

1️⃣  Conectando ao banco de dados...
✅ Conectado ao banco!

2️⃣  Verificando se a tabela já existe...

3️⃣  Criando tabela contatos_whatsapp...
✅ Tabela criada com sucesso!

4️⃣  Estrutura da tabela criada:
┌─────────┬──────────────┬──────┬─────┬─────────────────────────────┬──────────┐
│  Field  │     Type     │ Null │ Key │          Default            │  Extra   │
├─────────┼──────────────┼──────┼─────┼─────────────────────────────┼──────────┤
│id_con...│ varchar(50)  │  NO  │ PRI │            NULL             │          │
│wpp_fi...│ varchar(20)  │  NO  │ MUL │            NULL             │          │
│wpp_co...│ varchar(20)  │  NO  │ MUL │            NULL             │          │
│vendedor │ varchar(255) │  NO  │     │            NULL             │          │
│vendedo..│     int      │  NO  │ MUL │            NULL             │          │
│  nome   │ varchar(255) │  NO  │ MUL │            NULL             │          │
│  ativo  │  tinyint(1)  │ YES  │ MUL │              1              │          │
│observ...│     text     │ YES  │     │            NULL             │          │
│created..│  timestamp   │ YES  │ MUL │      CURRENT_TIMESTAMP      │          │
│updated..│  timestamp   │ YES  │     │      CURRENT_TIMESTAMP      │on update │
└─────────┴──────────────┴──────┴─────┴─────────────────────────────┴──────────┘

=== ✅ SETUP CONCLUÍDO COM SUCESSO ===
```

---

## ✅ Método 2: MySQL Workbench / phpMyAdmin

1. Abra o MySQL Workbench ou phpMyAdmin
2. Selecione o banco `dash_inteli`
3. Execute o arquivo `scripts/create-table-contatos.sql`

**OU copie e cole este SQL:**

```sql
CREATE TABLE IF NOT EXISTS contatos_whatsapp (
  id_contato VARCHAR(50) NOT NULL COMMENT 'ID único do contato - Chave Primária',
  wpp_filial VARCHAR(20) NOT NULL COMMENT 'Telefone WhatsApp da filial',
  wpp_contato VARCHAR(20) NOT NULL COMMENT 'Telefone WhatsApp do contato',
  vendedor VARCHAR(255) NOT NULL COMMENT 'Nome completo do vendedor',
  vendedor_id INT NOT NULL COMMENT 'ID do vendedor na tabela vendedores',
  nome VARCHAR(255) NOT NULL COMMENT 'Nome do contato',
  ativo TINYINT(1) DEFAULT 1 COMMENT 'Contato ativo (1) ou inativo (0)',
  observacoes TEXT DEFAULT NULL COMMENT 'Observações sobre o contato',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id_contato),
  KEY idx_vendedor_id (vendedor_id),
  KEY idx_wpp_filial (wpp_filial),
  KEY idx_wpp_contato (wpp_contato),
  KEY idx_nome (nome),
  KEY idx_ativo (ativo),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Contatos WhatsApp vinculados a vendedores e filiais';
```

---

## ✅ Método 3: Terminal MySQL

```bash
# Conectar ao MySQL
mysql -u root -p dash_inteli

# Executar o script
source scripts/create-table-contatos.sql

# OU executar direto
mysql -u root -p dash_inteli < scripts/create-table-contatos.sql
```

---

## 🔍 Verificar se a Tabela Foi Criada

### Opção 1: Via Node.js
```bash
node scripts/setup-contatos-table.js
```
Se a tabela já existir, ele mostrará a estrutura.

### Opção 2: Via MySQL
```sql
-- Ver se existe
SHOW TABLES LIKE 'contatos_whatsapp';

-- Ver estrutura
DESCRIBE contatos_whatsapp;

-- Contar registros
SELECT COUNT(*) FROM contatos_whatsapp;
```

---

## 🧪 Testar a API Após Criar a Tabela

### 1. Iniciar o servidor
```bash
npm run dev
```

### 2. Testar criação de contato

**Via cURL:**
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

**Via JavaScript (Console do Browser):**
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

**Resposta esperada:**
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

### 3. Executar suite completa de testes
```bash
node scripts/test-contatos-api.js
```

---

## 🐛 Troubleshooting

### ❌ Erro: "Table 'dash_inteli.contatos_whatsapp' doesn't exist"

**Causa:** Tabela não foi criada ainda  
**Solução:** Execute um dos métodos acima

### ❌ Erro: "Access denied for user"

**Causa:** Credenciais incorretas  
**Solução:** Verifique `.env.local`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dash_inteli
DB_USER=root
DB_PASSWORD=sua_senha
```

### ❌ Erro: "Can't connect to MySQL server"

**Causa:** MySQL não está rodando  
**Solução:**
```bash
# Windows
net start MySQL

# Linux/Mac
sudo service mysql start
# ou
brew services start mysql
```

### ❌ Erro: "Vendedor não encontrado ou inativo"

**Causa:** O `vendedor_id` não existe na tabela `vendedores`  
**Solução:** Verifique se o vendedor existe:
```sql
SELECT id, name FROM vendedores WHERE id = 228;
```

---

## 📊 Estrutura da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **id_contato** | VARCHAR(50) | PK - ID único do contato |
| **wpp_filial** | VARCHAR(20) | Telefone WhatsApp da filial |
| **wpp_contato** | VARCHAR(20) | Telefone WhatsApp do contato |
| **vendedor** | VARCHAR(255) | Nome completo do vendedor |
| **vendedor_id** | INT | FK para tabela vendedores |
| **nome** | VARCHAR(255) | Nome do contato |
| **ativo** | TINYINT(1) | Status: 1=ativo, 0=inativo |
| **observacoes** | TEXT | Observações sobre o contato |
| **created_at** | TIMESTAMP | Data de criação |
| **updated_at** | TIMESTAMP | Data de atualização |

**Índices:**
- PRIMARY KEY: `id_contato`
- INDEX: `vendedor_id`, `wpp_filial`, `wpp_contato`, `nome`, `ativo`, `created_at`

---

## ✅ Próximos Passos

Após criar a tabela:

1. ✅ Testar criação de contato: `POST /api/contatos`
2. ✅ Testar listagem: `GET /api/contatos`
3. ✅ Rodar testes completos: `node scripts/test-contatos-api.js`
4. ✅ Consultar documentação: `docs/API_CONTATOS.md`

---

## 📚 Arquivos Relacionados

- **Migration:** `db/migrations/007_create_contatos_whatsapp.sql`
- **Setup automático:** `scripts/setup-contatos-table.js`
- **Setup SQL:** `scripts/create-table-contatos.sql`
- **Testes:** `scripts/test-contatos-api.js`
- **API:** `app/api/contatos/`
- **Documentação:** `docs/API_CONTATOS.md`
- **Schema completo:** `banco.sql` (linhas 210-230)

---

**Status:** ⏳ Aguardando criação da tabela  
**Comando:** `node scripts/setup-contatos-table.js`

