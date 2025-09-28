# Deploy no Easypanel - Dashboard Inteligente

## 📋 Pré-requisitos

1. Conta no Easypanel
2. Banco de dados MySQL configurado
3. Domínio configurado (opcional)

## 🚀 Passos para Deploy

### 1. Preparar Variáveis de Ambiente

Configure as seguintes variáveis no Easypanel:

```bash
# Banco de Dados
DB_HOST=seu-host-mysql
DB_PORT=3359
DB_NAME=inteli_db
DB_USER=inteli_db
DB_PASSWORD=sua-senha-segura

# Aplicação
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Segurança
JWT_SECRET=sua-chave-jwt-segura
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# APIs (se necessário)
VTEX_TOKEN=seu-token-vtex
OPENAI_API_KEY=sua-chave-openai
ANYMARKETING_TOKEN=seu-token-anymarketing

# Next.js
NEXT_TELEMETRY_DISABLED=1
```

### 2. Configuração no Easypanel

1. **Criar Novo Projeto:**
   - Nome: `dash-inteli`
   - Tipo: `Application`
   - Source: `Git Repository`

2. **Configurar Build:**
   - Dockerfile: `./Dockerfile`
   - Context: `.`
   - Port: `3000`

3. **Configurar Recursos:**
   - CPU: `0.5 cores`
   - RAM: `512MB`
   - Storage: `1GB`

4. **Configurar Rede:**
   - Port: `3000`
   - Protocol: `HTTP`

### 3. Configurar Banco de Dados

1. **Criar Database MySQL no Easypanel:**
   - Nome: `inteli_db`
   - Usuário: `inteli_db`
   - Senha: (gerar senha segura)

2. **Executar Scripts SQL:**
   - Execute os scripts em `scripts/` na ordem:
     - `create-unidades-table.sql`
     - `create-vendedores-table.sql`
     - `create-roleta-logs-table.sql`
     - `create-configuracoes-table.sql`

### 4. Deploy

1. **Conectar Repositório:**
   - URL do repositório Git
   - Branch: `main`

2. **Deploy:**
   - O Easypanel fará o build automaticamente
   - Aguarde a conclusão do build
   - Verifique os logs se houver erros

### 5. Verificação Pós-Deploy

1. **Health Check:**
   - Acesse `https://seu-dominio.com`
   - Verifique se a aplicação carrega

2. **Teste de Funcionalidades:**
   - Login
   - Dashboard
   - APIs
   - Sistema de Roletas

## 🔧 Otimizações Implementadas

### Dockerfile Multi-stage
- **deps**: Instala apenas dependências de produção
- **builder**: Build otimizado do Next.js
- **runner**: Imagem final minimalista

### Next.js Standalone
- Output otimizado para containers
- Redução significativa do tamanho da imagem
- Melhor performance de startup

### Variáveis de Ambiente
- Configuração segura via Easypanel
- Separação entre desenvolvimento e produção
- Desabilitação do telemetry

## 📊 Monitoramento

### Logs
- Acesse os logs via Easypanel
- Monitore erros e performance

### Health Checks
- Endpoint: `/`
- Intervalo: 30 segundos
- Timeout: 10 segundos

### Métricas
- CPU usage
- Memory usage
- Response time

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de Conexão com Banco:**
   - Verifique variáveis de ambiente
   - Confirme conectividade da rede

2. **Build Falha:**
   - Verifique logs de build
   - Confirme dependências

3. **Aplicação não Inicia:**
   - Verifique variáveis obrigatórias
   - Confirme porta 3000

### Comandos Úteis

```bash
# Ver logs
easypanel logs dash-inteli

# Restart aplicação
easypanel restart dash-inteli

# Ver status
easypanel status dash-inteli
```

## 🔒 Segurança

### Variáveis Sensíveis
- Use secrets do Easypanel para dados sensíveis
- Nunca commite senhas ou tokens
- Rotacione chaves regularmente

### HTTPS
- Configure SSL/TLS no Easypanel
- Use domínio próprio
- Habilite HSTS

## 📈 Performance

### Otimizações
- Imagem Docker otimizada (~200MB)
- Build standalone do Next.js
- Cache otimizado
- Compressão habilitada

### Escalabilidade
- Configuração para múltiplas instâncias
- Load balancer automático
- Auto-scaling baseado em CPU/RAM
