# 🔧 Configuração de Variáveis de Ambiente

## 📋 **Arquivo .env.local**

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```bash
# Configurações do Banco de Dados MySQL
DATABASE_URL=mysql://inteli_db:20ab5823b8f45c747cb1@server.idenegociosdigitais.com.br:3359/inteli_db

# Configurações do Banco (separadas para facilitar uso)
DB_HOST=server.idenegociosdigitais.com.br
DB_PORT=3359
DB_NAME=inteli_db
DB_USER=inteli_db
DB_PASSWORD=20ab5823b8f45c747cb1

# Configurações da Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Configurações de API (se necessário)
VTEX_TOKEN=seu_token_vtex_aqui
OPENAI_API_KEY=sua_chave_openai_aqui
ANYMARKETING_TOKEN=seu_token_anymarketing_aqui
```

## 🚀 **Como Usar**

### **1. Criar o arquivo .env.local:**
```bash
# No terminal, na raiz do projeto
touch .env.local
```

### **2. Adicionar as variáveis:**
Copie o conteúdo acima para o arquivo `.env.local`

### **3. Usar no código:**
```typescript
import { databaseConfig, getDatabaseUrl } from '@/config/database'

// Usar URL completa
const dbUrl = getDatabaseUrl()

// Usar configurações separadas
const { host, port, database, username, password } = getDatabaseConfig()
```

## 🔒 **Segurança**

- ✅ **Nunca commite** o arquivo `.env.local` no Git
- ✅ **Use .env.example** para documentar as variáveis
- ✅ **Mantenha senhas seguras** e não as exponha
- ✅ **Use variáveis de ambiente** em produção

## 📁 **Estrutura de Arquivos**

```
📁 dash-inteli/
├── 📄 .env.local (criar manualmente)
├── 📄 .env.example (exemplo)
├── 📁 config/
│   └── 📄 database.ts (configurações)
└── 📄 VARIAVEIS-AMBIENTE.md (este arquivo)
```

## 🎯 **Configurações Disponíveis**

### **Banco de Dados:**
- `DATABASE_URL` - URL completa de conexão
- `DB_HOST` - Host do servidor
- `DB_PORT` - Porta do servidor
- `DB_NAME` - Nome do banco
- `DB_USER` - Usuário do banco
- `DB_PASSWORD` - Senha do banco

### **Aplicação:**
- `NEXT_PUBLIC_APP_URL` - URL da aplicação
- `NODE_ENV` - Ambiente (development/production)

### **APIs Externas:**
- `VTEX_TOKEN` - Token da API VTEX
- `OPENAI_API_KEY` - Chave da API OpenAI
- `ANYMARKETING_TOKEN` - Token da API AnyMarketing

## ⚠️ **Importante**

1. **Crie o arquivo `.env.local`** manualmente na raiz do projeto
2. **Adicione as variáveis** conforme mostrado acima
3. **Nunca commite** arquivos com senhas no Git
4. **Use as configurações** através do arquivo `config/database.ts`
