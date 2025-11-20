# 🚀 Guia de Deploy no Easypanel

## 📋 Configuração do Build

O Easypanel irá executar automaticamente:
1. **Build**: `npm run build` - Compila a aplicação Next.js
2. **Start**: `npm start` - Inicia o servidor em produção

## ⚙️ Configurações no Easypanel

### 1. Build Settings

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm start
```

**Node Version:**
```
18.x ou superior
```

### 2. Environment Variables

Configure as seguintes variáveis de ambiente no Easypanel:

#### Obrigatórias:
```bash
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Database
DB_HOST=seu-host-mysql
DB_PORT=3306
DB_USER=seu-usuario
DB_PASSWORD=sua-senha
DB_NAME=nome-do-banco

# JWT
JWT_SECRET=seu-jwt-secret-forte

# URLs
NEXT_PUBLIC_URL_PUBLIC=https://seu-dominio.com
URLPATCH=https://seu-crm.com/api
```

#### Opcionais:
```bash
# Email (se usar reset de senha)
RESEND_API_KEY=sua-chave-resend

# Outros
NEXT_TELEMETRY_DISABLED=1
```

### 3. Port Configuration

- **Port**: `3000`
- **Protocol**: `HTTP`

### 4. Health Check

**Path**: `/api/health`
**Port**: `3000`
**Interval**: `30s`
**Timeout**: `10s`
**Retries**: `3`

### 5. Resources (Recomendado)

- **CPU**: `0.5` cores (mínimo) / `1.0` cores (recomendado)
- **Memory**: `512Mi` (mínimo) / `1Gi` (recomendado)
- **Storage**: `1Gi`

## 📦 Como Funciona

### Build Process no Dockerfile

O Dockerfile já está configurado para fazer tudo automaticamente:

1. **Stage 1: Base** - Imagem base Node.js 18 Alpine
2. **Stage 2: Dependencies** - Instala todas as dependências
3. **Stage 3: Production Dependencies** - Separa dependências de produção
4. **Stage 4: Builder** - Executa `npm run build`:
   ```bash
   npm run build
   ```
   - Gera arquivos otimizados em `.next/`
   - Compila TypeScript
   - Otimiza imagens e assets
   - Minifica código

5. **Stage 5: Runner** - Imagem final de produção:
   - Copia apenas arquivos necessários
   - Usa dependências de produção
   - Executa `npm start` para rodar a aplicação

### Comando de Inicialização

O Dockerfile usa `npm start` que:
- Inicia servidor Next.js na porta 3000
- Usa arquivos compilados do build (`.next/`)
- Configurado para produção automaticamente

## 🔧 Troubleshooting

### Erro: "Build failed"

**Causa**: Erros durante o build.

**Solução**:
1. Verifique os logs de build no Easypanel
2. Confirme que `NODE_ENV=production` está definida
3. Verifique se há erros de TypeScript
4. Teste build localmente:
   ```bash
   npm run build
   ```

### Erro: "Cannot find module"

**Causa**: Dependências não instaladas ou build incompleto.

**Solução**:
1. Verifique se `package.json` está correto
2. Confirme que build foi concluído
3. Verifique logs de instalação de dependências

### Erro: "Port already in use"

**Causa**: Porta 3000 já está em uso.

**Solução**:
1. Verifique se há outro serviço na porta 3000
2. Configure porta diferente no Easypanel
3. Atualize variável `PORT` se necessário

### Erro: "Database connection failed"

**Causa**: Variáveis de ambiente do banco não configuradas.

**Solução**:
1. Verifique `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
2. Confirme que o banco aceita conexões externas
3. Teste conexão manualmente

## 📝 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Build command: `npm run build`
- [ ] Start command: `npm start`
- [ ] Port: `3000`
- [ ] Health check configurado: `/api/health`
- [ ] Recursos (CPU/Memory) configurados
- [ ] Domínio configurado (se aplicável)
- [ ] SSL/HTTPS habilitado (se aplicável)

## 🚀 Deploy

1. **Conecte o Repositório**
   - Adicione o repositório Git no Easypanel
   - Configure branch: `master` ou `main`

2. **Configure Build**
   - Build Command: `npm run build`
   - Start Command: `npm start`

3. **Configure Environment**
   - Adicione todas as variáveis de ambiente necessárias

4. **Deploy**
   - Clique em "Deploy" no Easypanel
   - Aguarde o build completar
   - Verifique logs para erros

5. **Verificar**
   - Acesse `/api/health` para verificar saúde
   - Teste funcionalidades principais
   - Verifique logs de erro

## 📊 Monitoramento

### Health Check

O endpoint `/api/health` retorna:
- Status da aplicação
- Status do banco de dados
- Informações do sistema

### Logs

Acesse logs no Easypanel para:
- Erros de runtime
- Requisições HTTP
- Erros de banco de dados

## 🔄 Atualizações

Para atualizar a aplicação:

1. Faça push para o repositório
2. O Easypanel detectará mudanças
3. Execute novo build automaticamente
4. Aplicação será reiniciada

Ou manualmente:
1. Clique em "Redeploy" no Easypanel
2. Aguarde build e restart

---

**Nota**: Este guia assume que você está usando a configuração padrão do Next.js com output standalone. Para customizações, ajuste o `next.config.js` conforme necessário.

