# 🎯 INSTRUÇÕES FINAIS PARA EASYPANEL

**Data:** 10 de dezembro de 2025  
**Status:** ✅ Correções aplicadas no código

---

## 🔧 MUDANÇAS REALIZADAS NO CÓDIGO

### ✅ 1. `/api/health` - MINIMALISTA (CORRIGIDO)

**Antes:** ❌
- Verificava conexão com banco de dados
- Retornava 503 se banco estivesse down
- Causava loop de restart no EasyPanel

**Depois:** ✅
- Apenas confirma que processo Node.js está vivo
- **SEMPRE** retorna 200 OK
- Zero dependências externas
- Resposta instantânea

```typescript
// app/api/health/route.ts
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-12-10T...",
  "env": "production"
}
```

### ✅ 2. `/api/status` - MONITORAMENTO DETALHADO (NOVO)

Criado endpoint separado para monitoramento completo:
- ✅ Verifica banco de dados
- ✅ Monitora memória
- ✅ Calcula uptime
- ✅ **SEMPRE retorna 200**, mas com status interno

```typescript
// app/api/status/route.ts
{
  "status": "healthy" | "degraded" | "unhealthy",
  "checks": {
    "database": { "status": "up", "responseTime": "5ms" },
    "memory": { "used": 128, "total": 512, "percentage": 25 }
  }
}
```

---

## 📋 CHECKLIST OBRIGATÓRIO NO EASYPANEL

### 🔴 PASSO 1: Commit e Push

```bash
git add .
git commit -m "fix: healthcheck minimalista para evitar loop de restart"
git push origin master
```

---

### 🔴 PASSO 2: Configurar Environment Variables

**No EasyPanel → Seu App → Settings → Environment Variables**

Verificar/Adicionar estas variáveis:

```bash
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1

# Banco de dados (ajuste conforme seu setup)
DB_HOST=seu-mysql-host
DB_USER=seu-usuario
DB_PASSWORD=sua-senha
DB_DATABASE=dash_inteli

# JWT/Auth (gere secrets seguros)
JWT_SECRET=seu-jwt-secret-seguro-aqui
SESSION_SECRET=seu-session-secret-aqui
NEXTAUTH_SECRET=seu-nextauth-secret-aqui

# URL pública
NEXT_PUBLIC_APP_URL=https://seu-dominio.easypanel.host
```

**⚠️ CRÍTICO:**
- `NODE_ENV` **DEVE** ser exatamente `production` (sem espaços)
- Se existir com valor diferente, **APAGUE e crie novamente**

---

### 🔴 PASSO 3: Verificar Start Command

**No EasyPanel → Seu App → Settings → General → Start Command**

Deixe um destes:
- ✅ **VAZIO** (recomendado - usa o ENTRYPOINT do Dockerfile)
- ✅ `/usr/local/bin/docker-entrypoint.sh`

❌ **NÃO use:**
- `npm run start`
- `npm start`
- `node server.js`

**Por quê?** O Dockerfile já define o ENTRYPOINT correto. Duplicar causa conflitos.

---

### 🔴 PASSO 4: Verificar Health Check

**No EasyPanel → Seu App → Settings → Health Check**

Configure EXATAMENTE assim:

```
Path: /api/health
Port: 3000
Interval: 30s
Timeout: 10s
Retries: 3
```

**⚠️ NÃO use `/api/status` aqui!** Use apenas `/api/health`.

---

### 🔴 PASSO 5: Redeploy Completo

1. **Save** todas as configurações
2. **Stop** o app
3. **Deploy** (vai buildar do zero)
4. Aguarde completar

---

## ✅ VERIFICAÇÕES PÓS-DEPLOY

### 1️⃣ Verificar Logs

**No EasyPanel → Seu App → Logs**

Procure por:

```
✅ CORRETO:
✓ Ready in XXXms
- Local: http://0.0.0.0:3000
- Network: http://0.0.0.0:3000
[Sem mais reinícios]

❌ ERRADO:
✓ Ready...
🛑 Recebido sinal de parada...
[Loop infinito]
```

Se aparecer "sinal de parada", o healthcheck ainda está falho.

---

### 2️⃣ Testar Healthcheck Manualmente

```bash
# Substitua pelo seu domínio
curl -i https://seu-dominio.easypanel.host/api/health
```

**Resposta esperada:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-12-10T...",
  "env": "production"
}
```

**✅ O que importa:**
- Status HTTP **200** (não 503, não 500)
- Resposta rápida (< 100ms)
- Sempre retorna, mesmo se banco estiver down

---

### 3️⃣ Testar Status Endpoint (Monitoramento)

```bash
curl -i https://seu-dominio.easypanel.host/api/status
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": "5ms"
    },
    "memory": {
      "used": 128,
      "total": 512,
      "percentage": 25
    }
  },
  "uptime": 123,
  "env": "production"
}
```

Se banco estiver down, vai mostrar `"status": "unhealthy"` mas **ainda retorna 200**.

---

### 4️⃣ Verificar NODE_ENV

```bash
curl https://seu-dominio.easypanel.host/api/health | jq '.env'
```

**Deve retornar:**
```json
"production"
```

Se retornar `"unknown"` ou `"development"`, o NODE_ENV não foi aplicado corretamente no painel.

---

## 🐛 TROUBLESHOOTING

### ❌ Problema: App continua em loop de restart

**Possíveis causas:**

1. **Healthcheck retornando != 200**
   ```bash
   # Teste dentro do container
   docker exec -it <container-id> curl -i http://localhost:3000/api/health
   ```
   Se não retornar 200, há erro no código.

2. **Start Command duplicado**
   - Verifique se está vazio no painel
   - Se tiver valor, remova

3. **Banco de dados inacessível na inicialização**
   - Verifique se `DB_HOST` está correto
   - Teste conexão: `mysql -h DB_HOST -u DB_USER -p`

4. **Memória insuficiente**
   - Aumente limit para 1GB no painel
   - Monitore uso: `/api/status`

---

### ❌ Problema: Warning "non-standard NODE_ENV"

**Causa:** Variável no painel está com valor errado ou espaços.

**Solução:**
1. No painel, **DELETE** a variável `NODE_ENV`
2. Crie novamente: `NODE_ENV=production` (sem espaços)
3. Save → Stop → Start

---

### ❌ Problema: 502 Bad Gateway

**Causa:** Traefik não consegue conectar no container.

**Soluções:**
1. Verificar se container está rodando: `docker ps`
2. Verificar porta exposta: deve ser `3000:3000`
3. Verificar labels Traefik (EasyPanel faz automaticamente)
4. Aguardar 30s após deploy (SSL pode demorar)

---

### ❌ Problema: App roda local mas não no EasyPanel

**Checklist:**
- [ ] Variáveis de ambiente todas configuradas
- [ ] `DB_HOST` aponta para MySQL do EasyPanel (não `localhost`)
- [ ] Secrets gerados (JWT, SESSION, NEXTAUTH)
- [ ] Domínio configurado corretamente
- [ ] Health check path correto: `/api/health`

---

## 📊 DIFERENÇAS ENTRE ENDPOINTS

| Endpoint | Propósito | Retorno | Checa Banco? |
|----------|-----------|---------|--------------|
| `/api/health` | Healthcheck Docker/EasyPanel | Sempre 200 | ❌ Não |
| `/api/status` | Monitoramento/Dashboard | Sempre 200 | ✅ Sim |

**Regra de ouro:**
- 🔴 **EasyPanel healthcheck** → `/api/health`
- 🟢 **Seu monitoramento** → `/api/status`

---

## 🎯 RESULTADO FINAL ESPERADO

Depois de seguir todos os passos:

✅ App sobe uma única vez  
✅ Logs mostram `✓ Ready in XXXms`  
✅ Nenhum restart automático  
✅ `/api/health` retorna 200 instantaneamente  
✅ `/api/status` mostra saúde completa do sistema  
✅ Warning de NODE_ENV desaparece  
✅ Aplicação acessível via domínio com SSL  

---

## 📞 SE AINDA HOUVER PROBLEMAS

Colete estas informações:

1. **Logs completos do container** (últimas 100 linhas)
2. **Output de:**
   ```bash
   curl -i https://seu-dominio/api/health
   curl -i https://seu-dominio/api/status
   ```
3. **Screenshot das Environment Variables no painel**
4. **Screenshot do Start Command no painel**
5. **Screenshot da configuração de Health Check**

Com essas informações é possível diagnosticar qualquer problema restante.

---

**Autor:** Claude (Cursor AI)  
**Última atualização:** 10 de dezembro de 2025  
**Status:** ✅ Pronto para deploy

