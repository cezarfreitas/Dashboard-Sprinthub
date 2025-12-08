# 🔧 SOLUÇÃO: Porta 3000 já está em uso

## ❌ ERRO:

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

---

## 🎯 CAUSA:

Múltiplas instâncias do Next.js estão rodando ao mesmo tempo. Isso acontece quando:
- O container é reiniciado mas processos antigos não são mortos
- Deploy é feito sem parar a instância anterior
- EasyPanel tenta iniciar múltiplos containers

---

## ✅ SOLUÇÃO RÁPIDA (NO TERMINAL DO EASYPANEL):

### Opção 1: Matar processos e reiniciar

```bash
# Matar todos os processos Node.js
pkill -9 node

# Aguardar 2 segundos
sleep 2

# Iniciar novamente
npm start
```

### Opção 2: Reiniciar o container completo

No EasyPanel:
1. **Stop** o serviço
2. Aguardar 10 segundos
3. **Start** o serviço

---

## 🔧 SOLUÇÃO PERMANENTE (APLICADA):

Criei um **script de entrypoint** que:
1. ✅ Verifica se porta 3000 está em uso antes de iniciar
2. ✅ Mata processos antigos se existirem
3. ✅ Trata sinais SIGTERM/SIGINT corretamente
4. ✅ Garante shutdown graceful

### Arquivos modificados:

1. **`scripts/docker-entrypoint.sh`** (novo)
   - Script de inicialização robusto
   - Verifica porta antes de iniciar
   - Cleanup automático

2. **`Dockerfile`** (atualizado)
   - Usa novo entrypoint script
   - Garante permissões corretas

---

## 🚀 APLICAR A SOLUÇÃO:

### 1. Fazer commit e push:

```bash
git add Dockerfile scripts/docker-entrypoint.sh SOLUCAO-PORTA-EM-USO.md
git commit -m "fix: adicionar script de entrypoint para prevenir EADDRINUSE"
git push
```

### 2. No EasyPanel:

1. **Stop** o serviço atual
2. **Rebuild** (vai usar o novo Dockerfile)
3. **Start** o serviço

---

## 🔍 VERIFICAR SE FUNCIONOU:

### No terminal do container:

```bash
# Ver processos Node.js rodando
ps aux | grep node

# Deve aparecer APENAS 1 processo npm start
```

### Logs devem mostrar:

```
🚀 Iniciando Dashboard Inteli...
✅ Iniciando Next.js na porta 3000...
📡 Escutando em: 0.0.0.0:3000
✓ Ready in XXXms
```

---

## 🐛 SE O PROBLEMA PERSISTIR:

### Debug no terminal do container:

```bash
# 1. Ver o que está usando porta 3000
netstat -tulpn | grep 3000

# 2. Ver todos os processos
ps aux

# 3. Matar TUDO e reiniciar manualmente
pkill -9 node
npm start
```

### Verificar configuração do EasyPanel:

1. **Certifique-se** de que há apenas **1 réplica** do serviço
2. **Desabilite** auto-restart durante deploy
3. **Configure** estratégia de deploy: `recreate` (não `rolling`)

---

## ⚙️ CONFIGURAÇÃO RECOMENDADA NO EASYPANEL:

```yaml
Deploy Strategy: recreate  # NÃO usar rolling update
Replicas: 1                # Apenas 1 instância
Health Check:
  Path: /api/health
  Port: 3000
  Interval: 30s
  Timeout: 5s
  Retries: 3
  Start Period: 40s        # Dar tempo para iniciar
```

---

## 📊 ENTENDENDO O PROBLEMA:

### Antes (problemático):

```
[Deploy novo]
  → Container antigo ainda rodando na porta 3000
  → Container novo tenta usar porta 3000
  → ❌ EADDRINUSE
```

### Depois (corrigido):

```
[Deploy novo]
  → Entrypoint verifica porta 3000
  → Se ocupada, mata processo antigo
  → Aguarda 2 segundos
  → Inicia novo processo
  → ✅ Sucesso
```

---

## 🎯 CHECKLIST:

- [ ] Commit e push dos novos arquivos
- [ ] Stop do serviço no EasyPanel
- [ ] Rebuild completo (não apenas restart)
- [ ] Start do serviço
- [ ] Verificar logs: deve mostrar "🚀 Iniciando Dashboard Inteli..."
- [ ] Verificar logs: deve mostrar "✓ Ready in XXXms"
- [ ] Testar health check: `curl http://localhost:3000/api/health`
- [ ] Testar externamente: `http://seu-dominio.easypanel.host`

---

## 💡 DICA PRO:

Se o EasyPanel tiver opção de **Zero Downtime Deployment**, desabilite temporariamente. Com apenas 1 container, zero downtime pode causar conflitos de porta.

---

## 🆘 SOLUÇÃO EMERGENCIAL (ÚLTIMA OPÇÃO):

Se nada funcionar, use porta diferente temporariamente:

```bash
# No terminal do container
PORT=3001 npm start
```

E configure port mapping no EasyPanel: `3001:80`

---

**Última atualização:** 8 de dezembro de 2024

**Status:** ✅ Solução implementada - aguardando rebuild

