# 🗄️ Instalação e Configuração do Banco de Dados

## 📦 **Dependências Necessárias**

### **1. Instalar dependências do MySQL:**
```bash
npm install mysql2
npm install @types/mysql2 --save-dev
```

### **2. Instalar Prisma (opcional, para ORM):**
```bash
npm install prisma @prisma/client
npm install @types/node --save-dev
```

## 🔧 **Configuração**

### **1. Criar arquivo .env.local:**
```bash
# Na raiz do projeto
touch .env.local
```

### **2. Adicionar variáveis ao .env.local:**
```bash
DATABASE_URL=mysql://inteli_db:20ab5823b8f45c747cb1@server.idenegociosdigitais.com.br:3359/inteli_db
DB_HOST=server.idenegociosdigitais.com.br
DB_PORT=3359
DB_NAME=inteli_db
DB_USER=inteli_db
DB_PASSWORD=20ab5823b8f45c747cb1
```

## 🚀 **Como Usar**

### **1. Conexão Direta com MySQL:**
```typescript
import { executeQuery, testConnection } from '@/lib/database'

// Testar conexão
await testConnection()

// Executar query
const users = await executeQuery('SELECT * FROM users')
```

### **2. Com Prisma (ORM):**
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Usar o Prisma
const users = await prisma.user.findMany()
```

## 📁 **Arquivos Criados**

- ✅ `config/database.ts` - Configurações do banco
- ✅ `lib/database.ts` - Funções de conexão MySQL
- ✅ `prisma/schema.prisma` - Schema do Prisma
- ✅ `env.example` - Exemplo de variáveis
- ✅ `VARIAVEIS-AMBIENTE.md` - Documentação

## 🎯 **Próximos Passos**

1. **Instalar dependências** (mysql2 ou prisma)
2. **Criar .env.local** com as variáveis
3. **Testar conexão** com o banco
4. **Criar tabelas** necessárias
5. **Implementar queries** no projeto

## ⚠️ **Importante**

- **Nunca commite** o arquivo `.env.local`
- **Use variáveis de ambiente** para senhas
- **Teste a conexão** antes de usar
- **Configure pool** de conexões adequadamente
