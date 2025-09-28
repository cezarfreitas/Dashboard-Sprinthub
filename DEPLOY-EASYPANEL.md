# 🚀 Deploy Rápido no Easypanel

## ✅ Checklist de Preparação

- [x] **Dockerfile** otimizado criado
- [x] **Next.js standalone** configurado
- [x] **Build** testado e funcionando
- [x] **Documentação** de deploy criada
- [x] **Scripts** de verificação prontos

## 🎯 Deploy em 3 Passos

### 1. Configurar Variáveis de Ambiente no Easypanel

```bash
# Obrigatórias
DB_HOST=seu-host-mysql
DB_PORT=3359
DB_NAME=inteli_db
DB_USER=inteli_db
DB_PASSWORD=sua-senha-segura
JWT_SECRET=sua-chave-jwt-segura
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Opcionais
VTEX_TOKEN=seu-token-vtex
OPENAI_API_KEY=sua-chave-openai
ANYMARKETING_TOKEN=seu-token-anymarketing
NEXT_TELEMETRY_DISABLED=1
```

### 2. Configurar Projeto no Easypanel

- **Nome:** `dash-inteli`
- **Tipo:** Application
- **Dockerfile:** `./Dockerfile`
- **Porta:** `3000`
- **Recursos:** 0.5 CPU, 512MB RAM

### 3. Deploy

1. Conectar repositório Git
2. Executar build automático
3. Verificar aplicação funcionando

## 🔧 Arquivos Criados

- `Dockerfile` - Container otimizado multi-stage
- `.dockerignore` - Ignora arquivos desnecessários
- `next.config.js` - Configurado com output standalone
- `easypanel.json` - Configuração específica do Easypanel
- `deploy.md` - Documentação completa
- `scripts/check-deploy.js` - Script de verificação

## 📊 Otimizações Implementadas

- **Imagem Docker:** ~200MB (vs ~1GB sem otimização)
- **Build standalone:** Reduz dependências desnecessárias
- **Multi-stage build:** Separação de responsabilidades
- **Cache otimizado:** Melhor performance de build

## 🚨 Importante

1. **Configure todas as variáveis de ambiente** antes do deploy
2. **Execute os scripts SQL** no banco de dados
3. **Verifique os logs** após o deploy
4. **Teste todas as funcionalidades** após deploy

## 📞 Suporte

- Documentação completa: `deploy.md`
- Verificação: `node scripts/check-deploy.js`
- Logs: Easypanel Dashboard

---

**Status:** ✅ Pronto para Deploy
**Última verificação:** Todas as verificações passaram
