# 🚀 Guia de Deploy - EasyPanel / VPS

## ⚠️ PROBLEMA: Serviço não acessível externamente

### 📋 Diagnóstico Rápido

O Next.js está rodando **DENTRO** do container, mas não está acessível externamente porque:

1. ✅ **Container está rodando** - `Ready in 1173ms`
2. ❌ **Escutando apenas em localhost** - `Local: http://localhost:3000`
3. ✅ **Solução aplicada** - `next start -H 0.0.0.0` no `package.json`

---

## 🔧 Configurações Necessárias no EasyPanel

### 1️⃣ Variáveis de Ambiente OBRIGATÓRIAS

No painel do EasyPanel, configure estas variáveis:

```env
# ===== CORE =====
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# ===== DATABASE (MySQL) =====
DB_HOST=seu-host-mysql
DB_USER=seu-usuario
DB_PASSWORD=sua-senha
DB_DATABASE=dash_inteli
DB_PORT=3306

# ===== JWT & SECURITY =====
JWT_SECRET=seu-secret-longo-e-aleatorio-minimo-32-caracteres
JWT_EXPIRES_IN=7d
SESSION_SECRET=outro-secret-longo-e-aleatorio-minimo-32-caracteres
NEXTAUTH_SECRET=mais-um-secret-longo-e-aleatorio-minimo-32-caracteres

# ===== APP URLs =====
NEXT_PUBLIC_APP_URL=https://seu-dominio.easypanel.host
NEXT_PUBLIC_URL_PUBLIC=https://seu-dominio.easypanel.host
NEXT_PUBLIC_BASE_URL=https://seu-dominio.easypanel.host
NEXT_PUBLIC_APP_TITLE=Dashboard Inteli

# ===== EMAIL (opcional) =====
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-app
EMAIL_FROM=seu-email@gmail.com

# ===== TIMEZONE =====
TZ=America/Sao_Paulo

# ===== OPTIMIZATIONS =====
NEXT_TELEMETRY_DISABLED=1
NEXT_SHARP_PATH=/app/node_modules/sharp
```

---

### 2️⃣ Configuração de Portas no EasyPanel

**IMPORTANTE:** Configure assim:

```
Container Port: 3000
Exposed Port: 80 (ou 443 se usar HTTPS)
```

O EasyPanel vai fazer o mapeamento:
- Requisições externas → `seu-dominio:80`
- Redirecionadas para → `container:3000`

---

### 3️⃣ Dockerfile - Verificar se está correto

O Dockerfile já está configurado corretamente:

```dockerfile
# Linha 127 - Força escutar em 0.0.0.0
ENV HOSTNAME="0.0.0.0"

# Linha 155 - Expõe porta 3000
EXPOSE 3000

# Linha 159 - Comando de start (package.json tem -H 0.0.0.0)
CMD ["npm", "start"]
```

---

### 4️⃣ Package.json - Comando Start

✅ **JÁ CONFIGURADO:**

```json
"start": "next start -H 0.0.0.0"
```

A flag `-H 0.0.0.0` força o Next.js a escutar em todas as interfaces de rede.

---

## 🔍 Verificar se está funcionando

### Dentro do Container (EasyPanel Terminal/Logs):

```bash
# Ver se está escutando em 0.0.0.0
curl http://localhost:3000/api/health

# Deve retornar:
# {"status":"healthy","timestamp":"...","uptime":123,...}
```

### De Fora (seu navegador):

```
https://seu-dominio.easypanel.host/api/health
```

---

## 🐛 Problemas Comuns e Soluções

### ❌ Problema 1: "Cannot reach service"

**Causa:** Porta não mapeada corretamente

**Solução:**
1. Ir em **Settings** → **Ports**
2. Adicionar: Container Port `3000` → Exposed Port `80`
3. Salvar e rebuild

---

### ❌ Problema 2: "502 Bad Gateway"

**Causa:** Container rodando mas Next.js não iniciou

**Solução:**
1. Ver logs: `Easypanel → Your App → Logs`
2. Verificar se aparece: `✓ Ready in XXXms`
3. Se não aparecer, verificar variáveis de ambiente (DB_HOST, etc)

---

### ❌ Problema 3: "Unhealthy" no Health Check

**Causa:** Banco de dados não acessível

**Solução:**
1. Verificar `DB_HOST`, `DB_USER`, `DB_PASSWORD` no EasyPanel
2. Testar conexão no terminal do container:
```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_DATABASE
```

---

### ❌ Problema 4: Still listening on localhost

**Causa:** Build antigo sem a flag `-H 0.0.0.0`

**Solução:**
1. Fazer **Full Rebuild** (não só restart)
2. No EasyPanel: **Settings** → **Rebuild**
3. Esperar build completar (pode demorar 3-5 min)

---

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas no EasyPanel
- [ ] `DB_HOST`, `DB_USER`, `DB_PASSWORD` corretos
- [ ] `JWT_SECRET`, `SESSION_SECRET`, `NEXTAUTH_SECRET` gerados (32+ chars)
- [ ] `NEXT_PUBLIC_APP_URL` com domínio correto do EasyPanel
- [ ] Porta `3000` exposta e mapeada para `80`
- [ ] Git push feito com última versão
- [ ] Full rebuild no EasyPanel
- [ ] Logs mostram: `✓ Ready in XXXms`
- [ ] Logs mostram: `http://0.0.0.0:3000` (NÃO localhost)
- [ ] `/api/health` retorna 200 OK de fora

---

## 🔐 Gerar Secrets Seguros

Use este comando para gerar secrets aleatórios:

```bash
# No seu terminal local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Execute 3 vezes para gerar:
- `JWT_SECRET`
- `SESSION_SECRET`
- `NEXTAUTH_SECRET`

---

## 📊 Monitoramento

### Health Check URL:
```
GET https://seu-dominio.easypanel.host/api/health
```

### Response esperado:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-08T...",
  "uptime": 3600,
  "checks": {
    "database": "up",
    "memory": {
      "used": 120,
      "total": 256,
      "percentage": 46
    }
  },
  "version": "0.1.0",
  "responseTime": "45ms"
}
```

---

## 🆘 Ainda não funciona?

### Debug no Terminal do Container (EasyPanel):

```bash
# Ver se processo está rodando
ps aux | grep node

# Ver portas abertas
netstat -tulpn | grep 3000

# Testar health internamente
curl -v http://localhost:3000/api/health

# Ver variáveis de ambiente
env | grep -E "(DB_|NEXT_|JWT_|HOSTNAME|PORT)"
```

---

## 📝 Notas Importantes

1. **Rebuild é necessário:** Apenas restart NÃO aplica mudanças no código ou Dockerfile
2. **Cache:** EasyPanel faz cache de layers do Docker - rebuild pode demorar menos
3. **Logs:** Sempre verificar logs durante e após deploy
4. **Health Check:** Container só fica "healthy" se `/api/health` retornar 200

---

## 🎯 Próximos Passos Após Deploy Funcionar

1. Configurar domínio customizado (se aplicável)
2. Habilitar HTTPS/SSL automático
3. Configurar backups automáticos do banco
4. Monitorar uso de recursos (CPU/RAM)
5. Configurar alertas de downtime

---

**Última atualização:** 8 de dezembro de 2024

