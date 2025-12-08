# 🔧 TROUBLESHOOTING - EasyPanel Porta 80

## ✅ STATUS ATUAL

Seu container está **FUNCIONANDO PERFEITAMENTE**:

```
✓ Build concluído com sucesso
✓ Next.js rodando: http://0.0.0.0:3000
✓ Container healthy
✓ Ready in 996ms
```

## ❌ PROBLEMA

**Container não está acessível externamente na porta 80**

---

## 🎯 SOLUÇÃO: Configurar Port Mapping no EasyPanel

### Passo 1: Acessar Configurações de Rede

1. No EasyPanel, vá em seu projeto
2. Clique em **Settings** ou **Network** 
3. Procure por **Ports** ou **Port Mapping**

### Passo 2: Configurar Mapeamento de Portas

Configure o seguinte:

```
Internal Port (Container): 3000
External Port (Public):    80
Protocol:                  HTTP
```

**OU**

```
Container Port: 3000  →  Public Port: 80
```

### Passo 3: Habilitar Acesso Público

Certifique-se de que:
- [ ] Port forwarding está ativo
- [ ] Public access está habilitado
- [ ] HTTP está permitido (não apenas HTTPS)

### Passo 4: Salvar e Aplicar

- Clique em **Save** ou **Apply**
- O EasyPanel pode reiniciar o container automaticamente
- Aguarde 10-30 segundos

---

## 🔍 VERIFICAR CONFIGURAÇÃO

### No EasyPanel:

Procure por uma seção similar a:

```
┌─────────────────────────────────────┐
│ Network Configuration               │
├─────────────────────────────────────┤
│ Container Port: 3000                │
│ External Port:  80                  │
│ Protocol:       HTTP                │
│ Public Access:  ✓ Enabled           │
└─────────────────────────────────────┘
```

---

## 📊 OPÇÕES DE CONFIGURAÇÃO

### Opção 1: HTTP (Porta 80) - Recomendado para teste

```
Container: 3000  →  Public: 80
URL: http://seu-dominio.easypanel.host
```

### Opção 2: HTTPS (Porta 443) - Recomendado para produção

```
Container: 3000  →  Public: 443
URL: https://seu-dominio.easypanel.host
SSL: Auto (Let's Encrypt)
```

### Opção 3: Ambas (HTTP + HTTPS)

```
Container: 3000  →  Public: 80, 443
HTTP → Redirect to HTTPS: ✓
```

---

## 🧪 TESTAR APÓS CONFIGURAR

### 1. Teste Interno (no terminal do container):

```bash
curl http://localhost:3000/api/health
```

**Resultado esperado:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "up"
  }
}
```

### 2. Teste Externo (do seu navegador):

```
http://seu-dominio.easypanel.host/api/health
```

**Resultado esperado:** Mesma resposta JSON acima

---

## ❓ POSSÍVEIS TELAS NO EASYPANEL

### Interface 1: Settings → Network
```
Port Mappings:
┌──────────────┬──────────────┬──────────┐
│ Container    │ Host         │ Protocol │
├──────────────┼──────────────┼──────────┤
│ 3000         │ 80           │ HTTP     │
└──────────────┴──────────────┴──────────┘
```

### Interface 2: Settings → Domains
```
Domains:
┌────────────────────────────────────────┐
│ seu-dominio.easypanel.host             │
│ Port: 80                               │
│ Target: http://container:3000          │
└────────────────────────────────────────┘
```

### Interface 3: Settings → Services
```
Service Configuration:
Port: 3000
Expose: ✓ Yes
Public Port: 80
```

---

## 🚨 SE AINDA NÃO FUNCIONAR

### Verificação 1: Logs do EasyPanel

Procure por erros como:
- `Port 80 already in use`
- `Failed to bind port`
- `Permission denied`

### Verificação 2: Firewall do VPS

```bash
# SSH no servidor VPS
sudo ufw status

# Se porta 80 estiver bloqueada:
sudo ufw allow 80/tcp
sudo ufw reload
```

### Verificação 3: Outro serviço na porta 80

```bash
# SSH no servidor VPS
sudo netstat -tulpn | grep :80

# Se houver outro serviço:
# Pare-o ou use outra porta (ex: 8080)
```

### Verificação 4: Proxy Reverso do EasyPanel

O EasyPanel pode estar usando Traefik ou Nginx como proxy reverso. Verifique:

1. **Dashboard do EasyPanel** → **Services**
2. Procure por `traefik` ou `nginx-proxy`
3. Verifique os logs desse serviço

---

## 🎯 CONFIGURAÇÃO IDEAL

### No EasyPanel (exemplo completo):

```yaml
Service: dash-inteli
Image: seu-registry/dash-inteli:latest
Ports:
  - 3000:80      # Mapear container 3000 → público 80
Environment:
  - NODE_ENV=production
  - PORT=3000
  - HOSTNAME=0.0.0.0
  - DB_HOST=mysql.easypanel.host
  - DB_USER=seu_usuario
  - DB_PASSWORD=sua_senha
  - DB_DATABASE=dash_inteli
  - JWT_SECRET=seu-secret-aqui
  - SESSION_SECRET=seu-secret-aqui
  - NEXTAUTH_SECRET=seu-secret-aqui
  - NEXT_PUBLIC_APP_URL=http://seu-dominio.easypanel.host
Domains:
  - seu-dominio.easypanel.host
Health Check:
  Path: /api/health
  Port: 3000
  Interval: 30s
```

---

## 📸 SCREENSHOTS ÚTEIS

Se possível, tire screenshots das seguintes telas no EasyPanel:

1. **Settings → General** (configurações gerais)
2. **Settings → Network/Ports** (mapeamento de portas)
3. **Settings → Domains** (domínios configurados)
4. **Logs** (últimas 50 linhas)

---

## 🔄 ALTERNATIVA: Usar Porta Customizada

Se porta 80 não funcionar, tente:

```
Container: 3000  →  Public: 8080
URL: http://seu-dominio.easypanel.host:8080
```

Teste:
```bash
curl http://seu-dominio.easypanel.host:8080/api/health
```

---

## ✅ CHECKLIST FINAL

Antes de continuar troubleshooting, confirme:

- [ ] Container está rodando (status: healthy)
- [ ] Logs mostram: `Network: http://0.0.0.0:3000`
- [ ] Logs mostram: `✓ Ready in XXXms`
- [ ] Porta 3000 está mapeada para 80 no EasyPanel
- [ ] Public access está habilitado
- [ ] Domínio está configurado corretamente
- [ ] Firewall permite porta 80
- [ ] Health check interno funciona (curl localhost:3000)

---

## 💡 DICA PRO

Se o EasyPanel tiver uma opção de **"Generate Domain"** ou **"Auto-configure"**, use-a. Ela geralmente configura automaticamente:
- Domínio público
- Mapeamento de portas
- SSL/TLS
- Proxy reverso

---

## 📞 PRÓXIMOS PASSOS

1. **Encontre a seção de Port Mapping no EasyPanel**
2. **Configure: 3000 → 80**
3. **Salve e aguarde 30 segundos**
4. **Teste:** `http://seu-dominio.easypanel.host/api/health`
5. **Se funcionar:** Configure SSL para HTTPS
6. **Se não funcionar:** Compartilhe screenshots das configurações

---

**Última atualização:** 8 de dezembro de 2024

**Status do Container:** ✅ Funcionando perfeitamente  
**Status de Rede:** ❌ Precisa configurar port mapping

