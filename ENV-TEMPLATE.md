# 🔐 Template de Variáveis de Ambiente

## 📋 INSTRUÇÕES

1. **Desenvolvimento Local:** Crie arquivo `.env.local` com estas variáveis
2. **Produção (EasyPanel):** Configure estas variáveis no painel de ambiente
3. **NUNCA** commite arquivos `.env` com valores reais no Git

---

## ⚡ VARIÁVEIS OBRIGATÓRIAS

### 🔧 Core - Configurações Essenciais

```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
TZ=America/Sao_Paulo
```

**⚠️ CRÍTICO:** `HOSTNAME=0.0.0.0` é essencial para acesso externo no container!

---

### 🗄️ Database - MySQL

```env
DB_HOST=mysql.easypanel.host
DB_USER=seu_usuario
DB_PASSWORD=sua_senha_segura
DB_DATABASE=dash_inteli
DB_PORT=3306
```

**Como obter no EasyPanel:**
- Vá em: **Services** → **MySQL** → **Connection Details**
- Copie: Host, User, Password

---

### 🔐 JWT & Security

```env
JWT_SECRET=secret-aleatorio-32-caracteres-minimo
JWT_EXPIRES_IN=7d
SESSION_SECRET=outro-secret-aleatorio-32-caracteres
NEXTAUTH_SECRET=mais-um-secret-aleatorio-32-caracteres
```

**Gerar secrets seguros:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Execute **3 vezes** para gerar os 3 secrets diferentes.

---

### 🌐 URLs da Aplicação

```env
NEXT_PUBLIC_APP_URL=https://seu-app.easypanel.host
NEXT_PUBLIC_URL_PUBLIC=https://seu-app.easypanel.host
NEXT_PUBLIC_BASE_URL=https://seu-app.easypanel.host
NEXT_PUBLIC_APP_TITLE=Dashboard Inteli
```

**Substitua:** `seu-app.easypanel.host` pelo seu domínio real do EasyPanel.

---

## 📧 VARIÁVEIS OPCIONAIS

### Email - SMTP (Para recuperação de senha)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-app-google
EMAIL_FROM=seu-email@gmail.com
EMAIL_SECURE=false
```

**Gmail:** Use **App Password**, não sua senha normal
- Gere em: https://myaccount.google.com/apppasswords

---

### Performance & Otimizações

```env
NEXT_TELEMETRY_DISABLED=1
NEXT_SHARP_PATH=/app/node_modules/sharp
```

---

### Cron & Sincronização

```env
ENABLE_CRON=true
```

---

## 🔍 VALIDAÇÃO

### Checklist antes de fazer deploy:

- [ ] `HOSTNAME=0.0.0.0` configurado
- [ ] `DB_HOST`, `DB_USER`, `DB_PASSWORD` corretos
- [ ] 3 secrets gerados (JWT_SECRET, SESSION_SECRET, NEXTAUTH_SECRET)
- [ ] `NEXT_PUBLIC_APP_URL` com domínio correto
- [ ] `TZ` configurado para America/Sao_Paulo

---

## 🧪 TESTAR CONFIGURAÇÃO

### Após deploy, testar:

```bash
# Health check (deve retornar 200)
curl https://seu-app.easypanel.host/api/health

# Deve retornar:
{
  "status": "healthy",
  "checks": {
    "database": "up"
  }
}
```

---

## 🐛 TROUBLESHOOTING

### ❌ "Cannot connect to database"

**Causa:** Credenciais incorretas ou host inacessível

**Solução:**
1. Verificar `DB_HOST` (deve ser acessível do container)
2. Testar no terminal do container:
```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_DATABASE
```

---

### ❌ "Invalid JWT token"

**Causa:** Secret não configurado ou mudou

**Solução:**
1. Gerar novo JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
2. Configurar no EasyPanel
3. Rebuild do container

---

### ❌ "Container not accessible externally"

**Causa:** `HOSTNAME` não configurado corretamente

**Solução:**
1. Verificar no EasyPanel: `HOSTNAME=0.0.0.0`
2. Full rebuild (não apenas restart)
3. Verificar logs: deve aparecer `http://0.0.0.0:3000`

---

## 📝 EXEMPLO COMPLETO

### Desenvolvimento (Local):

```env
NODE_ENV=development
PORT=3000
HOSTNAME=localhost
TZ=America/Sao_Paulo

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=dash_inteli
DB_PORT=3306

JWT_SECRET=dev-secret-not-for-production
JWT_EXPIRES_IN=7d
SESSION_SECRET=dev-session-secret
NEXTAUTH_SECRET=dev-nextauth-secret

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_URL_PUBLIC=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_TITLE=Dashboard Inteli [DEV]

NEXT_TELEMETRY_DISABLED=1
```

---

### Produção (EasyPanel):

```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
TZ=America/Sao_Paulo

DB_HOST=mysql-dash-inteli.easypanel.host
DB_USER=dash_user
DB_PASSWORD=SuaSenhaSegura123!@#
DB_DATABASE=dash_inteli
DB_PORT=3306

JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_EXPIRES_IN=7d
SESSION_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
NEXTAUTH_SECRET=m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4e5f6g7h8i9j0k1l2

NEXT_PUBLIC_APP_URL=https://dash-inteli.easypanel.host
NEXT_PUBLIC_URL_PUBLIC=https://dash-inteli.easypanel.host
NEXT_PUBLIC_BASE_URL=https://dash-inteli.easypanel.host
NEXT_PUBLIC_APP_TITLE=Dashboard Inteli

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@suaempresa.com
EMAIL_PASSWORD=sua-app-password-aqui
EMAIL_FROM=Dashboard Inteli <noreply@suaempresa.com>

NEXT_TELEMETRY_DISABLED=1
NEXT_SHARP_PATH=/app/node_modules/sharp
ENABLE_CRON=true
```

---

**Última atualização:** 8 de dezembro de 2024

