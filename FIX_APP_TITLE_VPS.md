# 🔧 Fix: Título da Aplicação não aparece no VPS

## ✅ Problema Resolvido

O nome da aplicação "Grupo Inteli" (ou qualquer nome configurado) não estava aparecendo corretamente no VPS após o deploy.

## 🔍 Causa Raiz

Os componentes estavam acessando `process.env.NEXT_PUBLIC_APP_TITLE` diretamente ao invés de usar o módulo centralizado `lib/app-config.ts`. Isso causava inconsistências na leitura da variável de ambiente.

## ✅ Solução Implementada

### 1. **Padronização de Imports**

Todos os componentes agora importam `APP_TITLE` de `@/lib/app-config`:

```typescript
import { APP_TITLE } from '@/lib/app-config'

// Uso:
<span>{APP_TITLE || 'DASHBOARD SG'}</span>
```

**Componentes atualizados:**
- ✅ `components/header.tsx` (2 ocorrências)
- ✅ `components/sidebar.tsx` (2 ocorrências)
- ✅ `components/app-footer.tsx` (1 ocorrência)
- ✅ `components/login-form.tsx` (1 ocorrência)
- ✅ `app/sistema/login/page.tsx` (1 ocorrência)

### 2. **Módulo Centralizado**

O módulo `lib/app-config.ts` já estava configurado corretamente:

```typescript
export const APP_TITLE: string = 
  process.env.NEXT_PUBLIC_APP_TITLE || ''
```

---

## 🚀 Como Configurar no VPS (Easypanel/Docker)

### Passo 1: Configurar Variável de Ambiente

No **Easypanel** → Seu projeto → **Environment Variables**, adicione:

```
NEXT_PUBLIC_APP_TITLE=Grupo Inteli
```

ou o nome que você preferir:
- `GrupoInteli` (sem espaço)
- `Inteli Dashboard`
- `Dashboard SprintHub`
- etc.

### Passo 2: ⚠️ **IMPORTANTE - Fazer Redeploy**

**Variáveis `NEXT_PUBLIC_*` são compiladas no código durante o BUILD**, não em runtime!

1. No Easypanel, clique em **"Redeploy"** ou **"Rebuild"**
2. Aguarde o build completar (1-3 minutos)
3. A aplicação será reiniciada automaticamente

### Passo 3: Verificar

Após o redeploy:
1. Acesse a aplicação
2. Recarregue a página (Ctrl+F5)
3. O nome deve aparecer em:
   - ✅ Header principal
   - ✅ Sidebar
   - ✅ Footer
   - ✅ Páginas de login
   - ✅ Header do gestor

---

## 📋 Checklist de Verificação

- [ ] Variável `NEXT_PUBLIC_APP_TITLE` configurada no Easypanel
- [ ] Redeploy realizado (não apenas restart!)
- [ ] Build completado com sucesso
- [ ] Aplicação reiniciada
- [ ] Cache do navegador limpo (Ctrl+F5)
- [ ] Nome aparece no header
- [ ] Nome aparece na sidebar
- [ ] Nome aparece no footer

---

## 🐳 Se estiver usando Docker diretamente

### docker-compose.yml
```yaml
services:
  app:
    environment:
      - NEXT_PUBLIC_APP_TITLE=Grupo Inteli
```

### Build e Deploy
```bash
# Rebuild com a nova variável
docker-compose build --no-cache

# Restart dos containers
docker-compose up -d
```

---

## 📝 Arquivos de Exemplo

### `.env.local` (Desenvolvimento)
```bash
# Banco de dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dash_inteli
DB_USER=root
DB_PASSWORD=sua_senha

# Configuração da Aplicação
NEXT_PUBLIC_APP_TITLE=Grupo Inteli
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `.env.production` (Produção)
```bash
# Banco de dados
DB_HOST=seu_host_mysql
DB_PORT=3306
DB_NAME=dash_inteli
DB_USER=usuario_producao
DB_PASSWORD=senha_segura_producao

# Configuração da Aplicação
NEXT_PUBLIC_APP_TITLE=Grupo Inteli
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

---

## 🔍 Como Verificar se Está Correto

### 1. Durante o Build

Procure por esta linha nos logs do build:
```
env: {
  NEXT_PUBLIC_APP_TITLE: 'Grupo Inteli',
  ...
}
```

### 2. No Código Compilado

Após o build, o valor deve estar "baked in" no código JavaScript.

### 3. No Navegador

Inspecione o elemento do header/sidebar e veja se o texto aparece.

---

## ⚠️ Erros Comuns

### ❌ Problema: Nome não aparece após configurar

**Solução:** Você fez apenas **restart**. Precisa fazer **redeploy/rebuild**.

### ❌ Problema: Ainda aparece "DASHBOARD SG"

**Causas possíveis:**
1. Variável não configurada corretamente
2. Build não completou
3. Cache do navegador (pressione Ctrl+F5)
4. Usando build antigo

**Solução:**
```bash
# Limpar build
rm -rf .next

# Rebuild
npm run build

# Verificar variável
echo $NEXT_PUBLIC_APP_TITLE
```

### ❌ Problema: Funciona em dev mas não em produção

**Causa:** Variável definida apenas em `.env.local` (dev) mas não no servidor de produção.

**Solução:** Configurar a variável no Easypanel/Docker e fazer redeploy.

---

## 📚 Documentação de Referência

- **Módulo centralizado:** `lib/app-config.ts`
- **Next.js config:** `next.config.js` (linha 41)
- **Variáveis públicas:** Prefixo `NEXT_PUBLIC_*` necessário para client components
- **Build time vs Runtime:** [Next.js Docs - Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## ✅ Benefícios da Padronização

1. **Consistência:** Todos os componentes usam a mesma fonte
2. **Manutenibilidade:** Mudanças em um só lugar
3. **Debugging:** Mais fácil rastrear problemas
4. **Type Safety:** TypeScript valida o import
5. **Performance:** Sem re-leituras da variável

---

## 🎯 Resumo

**Antes:**
```typescript
// ❌ Acesso direto e inconsistente
{process.env.NEXT_PUBLIC_APP_TITLE || 'DASHBOARD SG'}
```

**Depois:**
```typescript
// ✅ Padronizado e centralizado
import { APP_TITLE } from '@/lib/app-config'
{APP_TITLE || 'DASHBOARD SG'}
```

---

## 🚀 Deploy Checklist Final

1. ✅ **Código atualizado** (commit `08bb318`)
2. ✅ **Push para repositório** (master)
3. ⏳ **Configurar variável no Easypanel**
4. ⏳ **Fazer Redeploy/Rebuild**
5. ⏳ **Aguardar build completar**
6. ⏳ **Verificar na aplicação**

---

**Status:** ✅ **IMPLEMENTADO**  
**Commit:** `08bb318`  
**Arquivos:** 5 modificados  
**Teste:** ⏳ Pendente configuração no VPS

