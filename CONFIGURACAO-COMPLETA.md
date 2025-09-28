# 🎯 Configuração Completa do Banco de Dados

## ✅ **Arquivos Criados**

### **1. Configurações:**
- ✅ `config/database.ts` - Configurações centralizadas
- ✅ `lib/database.ts` - Funções de conexão MySQL
- ✅ `prisma/schema.prisma` - Schema do Prisma (opcional)

### **2. Documentação:**
- ✅ `VARIAVEIS-AMBIENTE.md` - Instruções de variáveis
- ✅ `INSTALACAO-BANCO.md` - Guia de instalação
- ✅ `env.example` - Exemplo de variáveis

### **3. API de Teste:**
- ✅ `app/api/test-db/route.ts` - Endpoint para testar conexão

## 🚀 **Passos para Configurar**

### **1. Instalar Dependências:**
```bash
npm install mysql2
npm install @types/mysql2 --save-dev
```

### **2. Criar Arquivo .env.local:**
```bash
# Na raiz do projeto
touch .env.local
```

### **3. Adicionar Variáveis:**
```bash
DATABASE_URL=mysql://inteli_db:20ab5823b8f45c747cb1@server.idenegociosdigitais.com.br:3359/inteli_db
DB_HOST=server.idenegociosdigitais.com.br
DB_PORT=3359
DB_NAME=inteli_db
DB_USER=inteli_db
DB_PASSWORD=20ab5823b8f45c747cb1
```

### **4. Testar Conexão:**
```bash
# Acessar no navegador
http://localhost:3000/api/test-db
```

## 🎯 **Como Usar no Código**

### **1. Importar Configurações:**
```typescript
import { databaseConfig, getDatabaseUrl } from '@/config/database'
import { executeQuery, testConnection } from '@/lib/database'
```

### **2. Testar Conexão:**
```typescript
const isConnected = await testConnection()
if (isConnected) {
  console.log('✅ Banco conectado!')
}
```

### **3. Executar Queries:**
```typescript
// Query simples
const users = await executeQuery('SELECT * FROM users')

// Query com parâmetros
const user = await executeQuery(
  'SELECT * FROM users WHERE id = ?', 
  [userId]
)
```

## 🔧 **Endpoints Disponíveis**

### **GET /api/test-db**
- Testa a conexão com o banco
- Retorna status da conexão

### **POST /api/test-db**
- Executa query personalizada
- Body: `{ "query": "SELECT * FROM users", "params": [] }`

## 📊 **Estrutura Final**

```
📁 dash-inteli/
├── 📁 config/
│   └── 📄 database.ts
├── 📁 lib/
│   └── 📄 database.ts
├── 📁 prisma/
│   └── 📄 schema.prisma
├── 📁 app/api/test-db/
│   └── 📄 route.ts
├── 📄 .env.local (criar manualmente)
├── 📄 env.example
├── 📄 VARIAVEIS-AMBIENTE.md
├── 📄 INSTALACAO-BANCO.md
└── 📄 CONFIGURACAO-COMPLETA.md
```

## 🎊 **Resultado**

Agora você tem:
- ✅ **Configuração completa** do banco MySQL
- ✅ **Variáveis de ambiente** organizadas
- ✅ **Funções de conexão** prontas
- ✅ **API de teste** funcionando
- ✅ **Documentação completa**

**Próximo passo:** Instalar as dependências e criar o arquivo `.env.local`! 🚀
