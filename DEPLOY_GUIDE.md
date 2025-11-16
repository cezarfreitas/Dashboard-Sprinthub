# 🚀 GUIA COMPLETO DE DEPLOY - VPS

## 📋 ÍNDICE

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação Inicial](#instalação-inicial)
3. [Configuração](#configuração)
4. [Deploy](#deploy)
5. [Comandos Úteis](#comandos-úteis)
6. [Monitoramento](#monitoramento)
7. [Troubleshooting](#troubleshooting)
8. [Manutenção](#manutenção)

---

## 🎯 PRÉ-REQUISITOS

### Sistema Operacional
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- 2GB RAM mínimo (4GB recomendado)
- 20GB disco livre
- Acesso SSH com sudo

### Software Necessário

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Make (opcional mas recomendado)
sudo apt install make

# Git
sudo apt install git

# Verificar instalação
docker --version
docker-compose --version
make --version
```

---

## 🛠️ INSTALAÇÃO INICIAL

### 1. Clone o Repositório

```bash
# SSH (recomendado)
git clone git@github.com:seu-usuario/dash-inteli.git
cd dash-inteli

# HTTPS
git clone https://github.com/seu-usuario/dash-inteli.git
cd dash-inteli
```

### 2. Setup Automático

```bash
# Comando único para setup completo
make setup
```

Este comando irá:
- ✅ Verificar pré-requisitos
- ✅ Criar estrutura de diretórios
- ✅ Copiar arquivo .env.production.example
- ✅ Gerar secrets de segurança

### 3. Estrutura de Diretórios Criada

```
├── data/
│   ├── mysql/          # Dados do MySQL
│   ├── mysql-logs/     # Logs do MySQL
│   └── redis/          # Dados do Redis
├── backups/            # Backups automáticos
└── .env.production     # Configurações (NÃO commitear)
```

---

## ⚙️ CONFIGURAÇÃO

### 1. Editar .env.production

```bash
nano .env.production
```

**Variáveis OBRIGATÓRIAS:**

```bash
# Database
DB_PASSWORD=senha-forte-aqui
MYSQL_ROOT_PASSWORD=senha-super-forte-root

# Security
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Domain (se usar HTTPS)
DOMAIN=seu-dominio.com
```

**Gerar secrets automaticamente:**

```bash
make generate-secrets
# ou
npm run generate-secrets
```

### 2. Verificar Configuração

```bash
# Ver variáveis configuradas (sem mostrar secrets)
grep -v "PASSWORD\|SECRET" .env.production
```

---

## 🚀 DEPLOY

### Deploy Completo (Primeira vez)

```bash
# 1. Build da imagem
make build

# 2. Iniciar serviços
make start

# 3. Ver status
make status

# 4. Ver logs
make logs
```

### Deploy com Script Automatizado

```bash
# Deploy completo (com backup automático)
make deploy

# Deploy rápido (sem backup)
make deploy-fast

# Deploy sem rebuild (usa imagem existente)
make deploy-no-build
```

**O script faz:**
- ✅ Verifica pré-requisitos
- ✅ Cria backup automático do banco
- ✅ Build da nova imagem
- ✅ Deploy com zero-downtime
- ✅ Health checks automáticos
- ✅ Rollback automático se falhar
- ✅ Limpeza de imagens antigas

---

## 📝 COMANDOS ÚTEIS

### Lifecycle

```bash
make start          # Inicia todos os serviços
make stop           # Para todos os serviços
make restart        # Reinicia todos os serviços
make down           # Para e remove containers
```

### Logs e Monitoramento

```bash
make logs           # Logs da aplicação (tempo real)
make logs-all       # Logs de todos os serviços
make logs-mysql     # Logs do MySQL
make status         # Status de todos os serviços
make stats          # CPU, RAM em tempo real
make monitor        # Monitoramento contínuo
```

### Database

```bash
make db-backup      # Backup manual
make db-restore FILE=backup.sql.gz  # Restaurar backup
make db-shell       # Abrir shell do MySQL
make db-migrate     # Executar migrações
```

### Manutenção

```bash
make clean          # Limpar recursos não usados
make clean-all      # Limpeza completa (CUIDADO!)
make update-images  # Atualizar imagens base
make health-check   # Testar health endpoint
```

### Shell e Debug

```bash
make shell          # Shell no container da app
make shell-root     # Shell como root
make inspect        # Inspecionar configuração
```

### Segurança

```bash
make security-scan  # Scan de vulnerabilidades
make security-audit # Audit de dependências
make security-fix   # Corrigir vulnerabilidades
```

---

## 📊 MONITORAMENTO

### Health Check

```bash
# Endpoint de saúde
curl http://localhost:3000/api/health

# Resposta esperada:
{
  "status": "healthy",
  "timestamp": "2024-11-16T10:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": "up",
    "memory": {
      "used": 150,
      "total": 512,
      "percentage": 29
    }
  },
  "version": "1.0.0",
  "responseTime": "15ms"
}
```

### Logs Estruturados

```bash
# Logs em tempo real com filtro
docker-compose -f docker-compose.production.yml logs -f app | grep ERROR

# Últimas 100 linhas
docker-compose -f docker-compose.production.yml logs --tail=100 app

# Logs de hoje
docker-compose -f docker-compose.production.yml logs --since $(date +%Y-%m-%d) app
```

### Estatísticas de Recursos

```bash
# CPU, RAM, Network, Disk I/O
docker stats

# Uso de disco do Docker
make disk-usage

# Detalhes de um container
docker inspect dash-inteli-app
```

---

## 🐛 TROUBLESHOOTING

### Container não inicia

```bash
# 1. Ver logs
make logs

# 2. Ver eventos do Docker
docker events

# 3. Testar health check
curl http://localhost:3000/api/health

# 4. Verificar portas
sudo netstat -tulpn | grep :3000

# 5. Restart forçado
make down && make start
```

### Erro de conexão com MySQL

```bash
# 1. Verificar status do MySQL
docker-compose -f docker-compose.production.yml ps mysql

# 2. Ver logs do MySQL
make logs-mysql

# 3. Testar conexão
docker-compose -f docker-compose.production.yml exec mysql \
  mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD}

# 4. Restart do MySQL
docker-compose -f docker-compose.production.yml restart mysql
```

### Erro de memória (OOM)

```bash
# 1. Ver uso de memória
docker stats --no-stream

# 2. Aumentar limite no docker-compose.production.yml:
#    memory: 2G  (padrão é 1G)

# 3. Limpar cache
docker system prune -f

# 4. Reiniciar com novo limite
make restart
```

### Deploy falhou

```bash
# 1. Ver logs do deploy
cat deploy.log

# 2. Rollback automático
make rollback

# 3. Verificar secrets
grep -c "CHANGE_ME" .env.production  # Deve retornar 0

# 4. Testar build local
make build

# 5. Verificar disk space
df -h
```

### Health check falha

```bash
# 1. Ver resposta do health check
curl -v http://localhost:3000/api/health

# 2. Verificar conectividade interna
docker-compose -f docker-compose.production.yml exec app \
  curl http://localhost:3000/api/health

# 3. Ver logs de erro
make logs | grep ERROR

# 4. Restart da app
docker-compose -f docker-compose.production.yml restart app
```

---

## 🔧 MANUTENÇÃO

### Backups

#### Backup Automático

Configurado por padrão para rodar às 2h da manhã:

```bash
# Ver configuração no docker-compose.production.yml
# service: backup
# CRON_TIME: "0 2 * * *"
```

#### Backup Manual

```bash
# Criar backup agora
make db-backup

# Backups ficam em:
ls -lh ./backups/

# Exemplo de saída:
# backup-20241116-140530.sql.gz
```

#### Restaurar Backup

```bash
# Listar backups disponíveis
ls -lh ./backups/

# Restaurar backup específico
make db-restore FILE=./backups/backup-20241116-140530.sql.gz
```

### Atualizações

```bash
# 1. Pull do código atualizado
git pull origin main

# 2. Deploy com backup automático
make deploy

# 3. Se algo der errado
make rollback
```

### Rotação de Secrets

```bash
# 1. Backup do banco
make db-backup

# 2. Gerar novos secrets
make generate-secrets

# 3. Atualizar .env.production com novos secrets

# 4. Rebuild e restart
make build
make restart

# 5. Testar
make health-check
```

### Limpeza de Disco

```bash
# Ver uso de disco
make disk-usage

# Limpar containers parados, imagens antigas, etc
make clean

# Limpar tudo (CUIDADO: remove volumes)
make clean-all

# Limpar apenas logs antigos
find ./data/mysql-logs -name "*.log" -mtime +7 -delete
find ./backups -name "*.sql.gz" -mtime +30 -delete
```

---

## 🔐 HTTPS / SSL

### Opção 1: Let's Encrypt com Traefik

Já configurado no `docker-compose.production.yml`:

```yaml
labels:
  - "traefik.http.routers.dash-inteli.tls=true"
  - "traefik.http.routers.dash-inteli.tls.certresolver=letsencrypt"
```

### Opção 2: Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx

# Configurar
sudo nano /etc/nginx/sites-available/dash-inteli

# Exemplo de config:
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Habilitar
sudo ln -s /etc/nginx/sites-available/dash-inteli /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL com Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## 📈 OTIMIZAÇÕES DE PRODUÇÃO

### Performance

```yaml
# docker-compose.production.yml - aumentar recursos
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

### Logs

```bash
# Configurar rotação de logs
# No docker-compose.production.yml:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Cache

```bash
# Habilitar Redis para rate limiting
# Descomentar serviço redis no docker-compose.production.yml

# Configurar app para usar Redis
# Adicionar no .env.production:
REDIS_HOST=redis
REDIS_PORT=6379
```

---

## 🎯 CHECKLIST DE DEPLOY

### Pré-Deploy

- [ ] Código testado localmente
- [ ] .env.production configurado
- [ ] Secrets gerados (não CHANGE_ME)
- [ ] Backup do banco criado
- [ ] Disk space verificado (df -h)
- [ ] Memória disponível (free -h)

### Deploy

- [ ] `make build` executado com sucesso
- [ ] `make deploy` executado
- [ ] Health check passou
- [ ] Aplicação acessível
- [ ] Login funciona
- [ ] Database conectado

### Pós-Deploy

- [ ] Logs sem erros críticos
- [ ] CPU/RAM em níveis normais
- [ ] Backup automático configurado
- [ ] Monitoramento ativo
- [ ] Documentação atualizada

---

## 📞 COMANDOS RÁPIDOS

```bash
# Setup inicial
make setup && make build && make start

# Deploy
make deploy

# Ver status
make status && make stats

# Logs em tempo real
make logs

# Backup
make db-backup

# Rollback
make rollback

# Reiniciar tudo
make restart

# Limpar
make clean

# Help (ver todos comandos)
make help
```

---

## 🆘 SUPORTE

### Logs para Debug

```bash
# Coletar todas as informações para suporte
echo "=== Docker Version ===" > debug.log
docker --version >> debug.log
echo "=== Docker Compose Version ===" >> debug.log
docker-compose --version >> debug.log
echo "=== Status ===" >> debug.log
make status >> debug.log
echo "=== Stats ===" >> debug.log
make stats >> debug.log 2>&1
echo "=== Logs App ===" >> debug.log
make logs --tail=100 >> debug.log 2>&1
echo "=== Logs MySQL ===" >> debug.log
make logs-mysql --tail=50 >> debug.log 2>&1
echo "=== Health Check ===" >> debug.log
curl -v http://localhost:3000/api/health >> debug.log 2>&1
echo "=== Disk Usage ===" >> debug.log
make disk-usage >> debug.log

# Enviar debug.log para suporte
```

---

**Deploy otimizado e production-ready!** 🚀🔒

