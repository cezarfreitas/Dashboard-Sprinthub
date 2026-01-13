# 🚀 Deploy no EasyPanel - Guia Rápido

## ✅ O que já está configurado (correto):

1. **`package.json`** (linha 8):
```json
"start": "next start -H 0.0.0.0"
```

2. **`Dockerfile`** (linha 127):
```dockerfile
ENV HOSTNAME="0.0.0.0"
```

3. **`Dockerfile`** (linha 155):
```dockerfile
EXPOSE 3000
```

---

## 🔧 Como fazer o deploy corretamente:

### Opção 1: Deploy Automático (Recomendado)

1. **Commitar as alterações atuais:**
```bash
git add .
git commit -m "fix: Configurar Next.js para escutar em 0.0.0.0"
git push origin master
```

2. **No EasyPanel:**
   - Vá no seu projeto/app
   - Clique em **"Rebuild"** ou **"Deploy"**
   - Aguarde o novo build completar
   - Teste acessando a URL pública

---

### Opção 2: Deploy Manual (se não usar Git no EasyPanel)

1. **No terminal local, fazer um novo build:**
```bash
npm run build
```

2. **No EasyPanel:**
   - Pare o container atual
   - Faça upload dos arquivos atualizados OU
   - Reconfigure para usar o Git (recomendado)
   - Inicie novamente

---

## 🧪 Como testar se está funcionando:

### 1. **Verificar logs do container:**
No EasyPanel, veja os logs e procure por:
```
- Local:        http://0.0.0.0:3000
```
✅ Se aparecer `0.0.0.0` = CORRETO
❌ Se aparecer `localhost` = INCORRETO (precisa rebuild)

### 2. **Testar acesso externo:**
- Acesse a URL pública do EasyPanel
- Deve carregar normalmente
- Se aparecer "Bad Gateway" = ainda está em `localhost`

---

## 📋 Checklist Pré-Deploy:

- [x] `package.json` tem `-H 0.0.0.0` no script start
- [x] `Dockerfile` tem `ENV HOSTNAME="0.0.0.0"`
- [x] `Dockerfile` tem `EXPOSE 3000`
- [ ] Código commitado no Git
- [ ] Rebuild feito no EasyPanel
- [ ] Logs mostram "0.0.0.0:3000"
- [ ] URL pública acessível

---

## ⚠️ Troubleshooting:

### "Ainda mostra localhost nos logs"
- Você fez rebuild? O container precisa ser recriado do zero
- No EasyPanel: **Stop → Rebuild → Start**

### "Bad Gateway / 502"
- Container não está escutando em `0.0.0.0`
- Verifique se o port mapping está correto (3000:3000)

### "Next.js não inicia"
- Verifique se `.env` tem todas as variáveis necessárias
- Verifique logs do container para erros de build

---

## 🎯 Passo a Passo FINAL:

```bash
# 1. No seu terminal local:
git add .
git commit -m "fix: Configurar Next.js para escutar em 0.0.0.0"
git push origin master

# 2. No EasyPanel:
# - Vá em Applications → [seu-app]
# - Clique em "Settings" → "General"
# - Role até "Deploy"
# - Clique em "Rebuild"
# - Aguarde (~2-5 min)

# 3. Verificar logs:
# - Vá em "Logs"
# - Procure por "Local: http://0.0.0.0:3000"

# 4. Testar:
# - Acesse a URL pública
# - Deve carregar normalmente!
```

---

## 🔍 Comandos úteis para debug:

### Ver se o processo está escutando:
```bash
# Dentro do container (se tiver acesso SSH):
netstat -tulpn | grep 3000
# Deve mostrar: 0.0.0.0:3000 (não 127.0.0.1:3000)
```

### Testar conexão local dentro do container:
```bash
curl -I http://0.0.0.0:3000/api/health
# Deve retornar 200 OK
```

---

**🎉 Depois do rebuild, sua aplicação estará acessível externamente!**




























