# 🔧 Fix: Título "Grupo Inteli" não aparece no VPS

## 🔍 Problema

O nome da aplicação não está aparecendo no header/sidebar no servidor de produção (VPS).

## ✅ Solução

A variável `NEXT_PUBLIC_APP_TITLE` não está configurada ou precisa de um novo build.

### Passo a Passo (Easypanel)

1. **Acesse o Easypanel** → Seu projeto → **Environment Variables**

2. **Adicione ou verifique a variável:**
   ```
   NEXT_PUBLIC_APP_TITLE=GrupoInteli
   ```
   (ou o nome que você quiser: `Grupo Inteli`, `Inteli Dashboard`, etc.)

3. **⚠️ IMPORTANTE: Faça um Redeploy**
   - Variáveis `NEXT_PUBLIC_*` são incorporadas no código durante o BUILD
   - Não basta apenas reiniciar, precisa fazer um novo build
   - Clique em **"Redeploy"** ou **"Rebuild"** no Easypanel

4. **Aguarde o build completar**
   - O build irá incorporar a variável no código
   - Após o build, a aplicação será reiniciada automaticamente

5. **Verifique**
   - Recarregue a página
   - O nome deve aparecer no header/sidebar

---

## 🔍 Como Verificar se Está Configurado

No Easypanel, verifique se a variável existe em:
- **Environment Variables** → Procure por `NEXT_PUBLIC_APP_TITLE`

Se não existir, adicione e faça redeploy.

---

## 🐳 Se estiver usando Docker diretamente

1. **Adicione no docker-compose.yml ou .env:**
   ```yaml
   environment:
     - NEXT_PUBLIC_APP_TITLE=GrupoInteli
   ```

2. **Rebuild a imagem:**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

---

## 📝 Notas Técnicas

- Variáveis `NEXT_PUBLIC_*` são "baked in" no código JavaScript durante o build
- Elas são substituídas em tempo de build, não em runtime
- Por isso, sempre que alterar essas variáveis, é necessário fazer um novo build
- Variáveis normais (sem `NEXT_PUBLIC_`) funcionam em runtime e não precisam rebuild

---

## ✅ Após o Fix

O nome deve aparecer em:
- ✅ Header do gestor (`components/header_gestor.tsx`)
- ✅ Header principal (`components/header.tsx`)
- ✅ Sidebar (`components/sidebar.tsx`)
- ✅ Página de login
- ✅ Metadata do site (title da aba do navegador)

