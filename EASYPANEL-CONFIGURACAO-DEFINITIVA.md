# 🎯 EasyPanel - Configuração Definitiva para Next.js

**Baseado na documentação oficial do EasyPanel**

---

## 📖 CONTEXTO

O EasyPanel usa **Traefik** como proxy reverso automático. Isso significa:

✅ **Você NÃO precisa mapear portas manualmente**  
✅ Traefik detecta automaticamente containers via **labels**  
✅ SSL/TLS é automático via Let's Encrypt  
✅ Roteamento por domínio é automático

---

## 🔧 COMO FUNCIONA

```
[Internet] → [Traefik :80/:443] → [Seu Container :3000]
                     ↓
            Lê labels do Docker
            Roteia automaticamente
```

### Fluxo:

1. **Traefik** escuta nas portas 80 (HTTP) e 443 (HTTPS)
2. **Lê labels** do seu container Docker
3. **Roteia** requisições baseado em `Host()`
4. **Redireciona** para porta interna do container (3000)

---

## ✅ SEU SETUP ATUAL (CORRETO!)

### 1. **Dockerfile** ✅

```dockerfile
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
```

### 2. **easypanel-deploy.yml** ✅

```yaml
services:
  dash-inteli:
    ports:
      - "3000:3000"  # Expõe porta para Traefik encontrar
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dash-inteli.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.dash-inteli.tls=true"
      - "traefik.http.routers.dash-inteli.tls.certresolver=letsencrypt"
      - "traefik.http.services.dash-inteli.loadbalancer.server.port=3000"
```

**Essas labels dizem ao Traefik:**
- ✅ "Eu existo, me roteia!" (`traefik.enable=true`)
- ✅ "Aceito requisições de `your-domain.com`" (`Host()`)
- ✅ "Uso porta 3000 internamente" (`loadbalancer.server.port=3000`)
- ✅ "Quero SSL automático" (`tls=true`, `certresolver=letsencrypt`)

---

## 🎯 CONFIGURAÇÃO NO EASYPANEL

### Opção 1: Via Interface (Recomendado)

#### **1. Criar/Editar Serviço:**

1. No EasyPanel, vá em **Projects** → Seu Projeto
2. Clique em **Add Service** ou edite serviço existente
3. Escolha **App** (não Template)

#### **2. Configurar Git:**

```
Repository: https://github.com/cezarfreitas/Dashboard-Sprinthub.git
Branch: master
Build Method: Dockerfile
```

#### **3. Configurar Domínio:**

Na seção **Domains**, adicione:

```
Domain: dash-inteli.easypanel.host
```

Ou seu domínio customizado:

```
Domain: seu-dominio.com
```

O EasyPanel vai **automaticamente**:
- ✅ Gerar labels Traefik corretas
- ✅ Configurar SSL via Let's Encrypt
- ✅ Rotear porta 80/443 → 3000

#### **4. Variáveis de Ambiente:**

Na seção **Environment**, adicione:

```
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DB_HOST=mysql.easypanel.host
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_DATABASE=dash_inteli
JWT_SECRET=seu-secret-aqui
SESSION_SECRET=seu-secret-aqui
NEXTAUTH_SECRET=seu-secret-aqui
NEXT_PUBLIC_APP_URL=https://dash-inteli.easypanel.host
```

#### **5. Recursos (opcional):**

```
CPU Limit: 1 core
Memory Limit: 1GB
```

#### **6. Deploy:**

Clique em **Deploy**

---

### Opção 2: Via YAML (Avançado)

Se o EasyPanel suportar import de YAML:

```yaml
version: '3.8'

services:
  dash-inteli:
    build:
      context: .
      dockerfile: Dockerfile
    
    environment:
      NODE_ENV: production
      PORT: 3000
      HOSTNAME: 0.0.0.0
      # Adicionar todas outras vars aqui
    
    labels:
      traefik.enable: "true"
      traefik.http.routers.dash-inteli.rule: "Host(`dash-inteli.easypanel.host`)"
      traefik.http.routers.dash-inteli.tls: "true"
      traefik.http.routers.dash-inteli.tls.certresolver: "letsencrypt"
      traefik.http.services.dash-inteli.loadbalancer.server.port: "3000"
    
    restart: unless-stopped
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 🔍 VERIFICAR SE TRAEFIK ESTÁ FUNCIONANDO

### 1. Verificar se Traefik está rodando:

```bash
docker service ls | grep traefik
```

Deve retornar algo como:
```
ID       NAME      MODE         REPLICAS   IMAGE
xxx      traefik   replicated   1/1        traefik:latest
```

### 2. Ver logs do Traefik:

```bash
docker service logs traefik --tail 50
```

Procure por:
```
✓ Configuration loaded from labels
✓ Server dash-inteli up
```

### 3. Verificar labels do seu container:

```bash
docker inspect <seu-container-id> | grep traefik
```

Deve mostrar todas as labels configuradas.

---

## 🐛 TROUBLESHOOTING

### ❌ Problema: "502 Bad Gateway"

**Causa:** Traefik não consegue conectar no container na porta 3000

**Solução:**
1. Verificar se container está rodando: `docker ps`
2. Verificar se porta 3000 está aberta: `docker exec -it <container> netstat -tuln | grep 3000`
3. Verificar health check: `docker exec -it <container> curl http://localhost:3000/api/health`

---

### ❌ Problema: "Service Unavailable"

**Causa:** Container não está healthy

**Solução:**
1. Ver logs: `docker logs <container>`
2. Verificar variáveis de ambiente
3. Verificar conexão com banco de dados

---

### ❌ Problema: "Certificate Error"

**Causa:** SSL ainda não foi emitido

**Solução:**
- Aguardar 2-5 minutos (Let's Encrypt demora)
- Verificar se domínio aponta para o servidor
- Forçar HTTP temporariamente para testar

---

### ❌ Problema: "EADDRINUSE: port 3000"

**Causa:** Múltiplas instâncias rodando

**Solução:**
```bash
# No terminal do container
pkill -9 node
npm start

# Ou rebuildar com novo entrypoint (já aplicado)
```

---

## 📊 CHECKLIST FINAL

### Antes do Deploy:

- [ ] Repository no GitHub atualizado
- [ ] Dockerfile expõe porta 3000
- [ ] HOSTNAME=0.0.0.0 no Dockerfile
- [ ] package.json tem `next start -H 0.0.0.0`
- [ ] Labels Traefik configuradas

### Configurar no EasyPanel:

- [ ] Domínio configurado (ex: dash-inteli.easypanel.host)
- [ ] Variáveis de ambiente todas preenchidas
- [ ] DB_HOST, DB_USER, DB_PASSWORD corretos
- [ ] Secrets gerados (JWT_SECRET, etc)
- [ ] Build method: Dockerfile

### Após Deploy:

- [ ] Container está healthy
- [ ] Logs mostram: `✓ Ready in XXXms`
- [ ] Logs mostram: `Network: http://0.0.0.0:3000`
- [ ] Health check funciona: `/api/health` retorna 200
- [ ] Aplicação acessível via domínio

---

## 🎯 EXEMPLO DE CONFIGURAÇÃO COMPLETA

### No EasyPanel Interface:

```
┌─────────────────────────────────────────┐
│ Service Configuration                   │
├─────────────────────────────────────────┤
│ Name: dash-inteli                       │
│ Type: App                               │
│                                         │
│ Source:                                 │
│   Repository: github.com/.../Dashboard  │
│   Branch: master                        │
│   Build: Dockerfile                     │
│                                         │
│ Domains:                                │
│   - dash-inteli.easypanel.host         │
│   SSL: Auto (Let's Encrypt) ✓          │
│                                         │
│ Environment:                            │
│   NODE_ENV=production                   │
│   PORT=3000                             │
│   HOSTNAME=0.0.0.0                      │
│   DB_HOST=mysql.easypanel.host         │
│   DB_USER=dash_user                    │
│   DB_PASSWORD=********                  │
│   JWT_SECRET=********                   │
│   ...                                   │
│                                         │
│ Resources:                              │
│   CPU: 1 core                          │
│   Memory: 1GB                          │
│                                         │
│ Health Check:                           │
│   Path: /api/health                    │
│   Port: 3000                           │
│   Interval: 30s                        │
└─────────────────────────────────────────┘
```

---

## 🚀 RESULTADO ESPERADO

Após configurar tudo:

1. **Acesse via navegador:**
   ```
   https://dash-inteli.easypanel.host
   ```

2. **Deve mostrar:**
   - ✅ Sua aplicação rodando
   - ✅ SSL válido (cadeado verde)
   - ✅ Sem erros no console

3. **Health check:**
   ```bash
   curl https://dash-inteli.easypanel.host/api/health
   ```
   
   Retorna:
   ```json
   {
     "status": "healthy",
     "checks": {
       "database": "up"
     }
   }
   ```

---

## 💡 DICAS PRO

### 1. Domínio Customizado

Se quiser usar seu próprio domínio (ex: `dash.suaempresa.com`):

1. Adicione registro DNS tipo **A** apontando para IP do servidor
2. Configure no EasyPanel: `dash.suaempresa.com`
3. Traefik vai gerar SSL automaticamente

### 2. Múltiplos Domínios

Pode adicionar vários:
```
- dash-inteli.easypanel.host
- dash.suaempresa.com
- www.dash.suaempresa.com
```

### 3. Forçar HTTPS

Traefik redireciona HTTP → HTTPS automaticamente se `tls=true`

### 4. Monitorar Traefik

Acesse dashboard do Traefik (se habilitado):
```
http://SEU-IP:8080
```

---

## 📚 REFERÊNCIAS

- [EasyPanel Docs - Services](https://easypanel.io/docs/services/app)
- [Traefik Labels](https://doc.traefik.io/traefik/routing/providers/docker/)
- [Docker Port Mapping](https://docs.docker.com/config/containers/container-networking/)

---

**Última atualização:** 8 de dezembro de 2024

**Status:** ✅ Pronto para deploy no EasyPanel

