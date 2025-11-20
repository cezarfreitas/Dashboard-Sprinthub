# 🔧 FIX: Sincronização de Funis Não Funciona

## 🔴 Problema Identificado

A sincronização de funis está falhando porque **3 variáveis de ambiente obrigatórias não estão configuradas** no arquivo `.env`.

---

## ❌ Diagnóstico

### Variáveis Faltando

```bash
URLPATCH=    # ❌ NÃO CONFIGURADO - URL da API SprintHub
APITOKEN=    # ❌ NÃO CONFIGURADO - Token de autenticação
I=           # ❌ NÃO CONFIGURADO - ID do grupo SprintHub
```

### Como o Sync Funciona

O arquivo `lib/funis-sync.ts` faz uma requisição para a API do SprintHub para buscar os funis:

```typescript
const sprintHubUrl = `${urlPatch}/crm?apitoken=${apiToken}&i=${groupId}`
// Exemplo: https://api.sprinthub.app/crm?apitoken=abc123&i=456
```

**Sem estas variáveis:**
- ❌ Sync falha silenciosamente
- ❌ Tabela `funis` fica vazia/desatualizada
- ❌ Componentes não exibem funis corretamente
- ❌ Filtros na página Painel ficam vazios

---

## ✅ Solução Completa

### Passo 1: Adicionar Variáveis ao `.env`

Adicione estas linhas ao arquivo `.env` (raiz do projeto):

```bash
# Configurações da API SprintHub (OBRIGATÓRIO)
URLPATCH=https://api.sprinthub.app
APITOKEN=seu_token_aqui
I=seu_grupo_id_aqui
```

### Passo 2: Obter os Valores Corretos

**Onde encontrar:**

1. **URLPATCH**: 
   - URL base da API do SprintHub
   - Normalmente: `https://api.sprinthub.app`
   - Pode variar se houver instância customizada

2. **APITOKEN**: 
   - Acesse o painel do SprintHub
   - Vá em Configurações → Integrações → API
   - Copie o token de autenticação

3. **I** (ID do grupo):
   - Acesse o painel do SprintHub
   - Vá em Configurações → Empresa
   - Copie o ID do grupo/empresa
   - Ou consulte com o administrador do sistema

### Passo 3: Reiniciar Aplicação

Após configurar as variáveis:

```bash
# Reiniciar servidor de desenvolvimento
npm run dev

# Ou reiniciar produção
pm2 restart dash-inteli
```

### Passo 4: Testar Sincronização Manual

Execute a sincronização manualmente para verificar:

```bash
# Via API (navegador ou Postman)
POST http://localhost:3000/api/funis/sync

# Ou via painel administrativo
# Acesse /sistema → Sincronização → Funis → Sincronizar Agora
```

### Passo 5: Verificar Logs

Após executar, verifique os logs:

```bash
# Logs do servidor
tail -f logs/app.log

# Ou logs no terminal do Next.js
# Procure por mensagens como:
✅ X funis recebidos da API
✅ Sincronização de funis concluída
```

---

## 📊 Validação

### Como Confirmar que Está Funcionando

1. **Via API:**
   ```bash
   GET http://localhost:3000/api/funis
   ```
   Deve retornar lista de funis

2. **Via Banco de Dados:**
   ```sql
   SELECT id, funil_nome FROM funis;
   ```
   Deve ter registros

3. **Via Interface:**
   - Acesse `/painel`
   - Verifique se o dropdown "Funil" está populado
   - Deve mostrar: Funil 3, Funil 4, Funil 5, etc.

4. **Via Histórico de Sync:**
   ```sql
   SELECT * FROM cron_sync_history 
   WHERE job_name = 'funis-sync' 
   ORDER BY started_at DESC 
   LIMIT 5;
   ```
   Deve mostrar status='success' e records_updated > 0

---

## 🔍 Estrutura dos Dados

### Schema da Tabela `funis`

Conforme `banco.sql`:

```sql
CREATE TABLE funis (
  id int NOT NULL PRIMARY KEY,
  funil_nome varchar(255) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

### Exemplo de Dados

```json
[
  { "id": 3, "funil_nome": "Funil 3" },
  { "id": 4, "funil_nome": "Funil 4" },
  { "id": 5, "funil_nome": "Funil 5" },
  { "id": 6, "funil_nome": "Funil 6" },
  { "id": 7, "funil_nome": "Funil 7" }
]
```

---

## 🚨 Troubleshooting

### Problema: Sync Ainda Falhando

**1. Verificar se variáveis foram carregadas:**
```bash
node -e "require('dotenv').config(); console.log(process.env.URLPATCH, process.env.APITOKEN?.substring(0,10)+'...', process.env.I)"
```

**2. Verificar conexão com API:**
```bash
curl "https://api.sprinthub.app/crm?apitoken=SEU_TOKEN&i=SEU_ID"
```

**3. Verificar logs de erro:**
```sql
SELECT * FROM cron_sync_history 
WHERE job_name = 'funis-sync' AND status = 'error' 
ORDER BY started_at DESC;
```

### Problema: Token Inválido

Se receber erro 401/403:
- ✅ Verifique se o token está correto
- ✅ Verifique se o token não expirou
- ✅ Gere um novo token no painel SprintHub

### Problema: ID do Grupo Inválido

Se receber erro 404 ou dados vazios:
- ✅ Verifique se o ID do grupo está correto
- ✅ Confirme com o administrador do SprintHub

---

## 📝 Checklist de Configuração

- [ ] Variável `URLPATCH` configurada no `.env`
- [ ] Variável `APITOKEN` configurada no `.env`
- [ ] Variável `I` configurada no `.env`
- [ ] Valores corretos obtidos do painel SprintHub
- [ ] Aplicação reiniciada após configuração
- [ ] Sincronização manual testada com sucesso
- [ ] Funis aparecem na API `/api/funis`
- [ ] Funis aparecem no banco de dados
- [ ] Dropdown de funis populado no `/painel`
- [ ] Histórico de sync mostra sucesso

---

## 🎯 Resultado Esperado

Após configurar corretamente:

1. ✅ Sync executará automaticamente 3x ao dia (8h, 14h, 20h)
2. ✅ Tabela `funis` terá dados atualizados
3. ✅ API `/api/funis` retornará lista completa
4. ✅ Componente `PainelFiltersInline` exibirá funis no dropdown
5. ✅ Filtros funcionarão corretamente na página `/painel`
6. ✅ Histórico de sync mostrará status='success'

---

## 📚 Arquivos Relacionados

- `lib/funis-sync.ts` - Função de sincronização
- `app/api/funis/sync/route.ts` - Endpoint para sync manual
- `lib/cron-scheduler.ts` - Agendador de tarefas
- `env.example` - Template de variáveis de ambiente
- `banco.sql` - Schema da tabela funis

---

## ⚠️ Importante

**NUNCA commitar o arquivo `.env` com valores reais!**

- ✅ Use `.env.example` como template
- ✅ Adicione `.env` ao `.gitignore`
- ✅ Compartilhe variáveis via gerenciador de senhas
- ❌ Nunca exponha tokens em commits/logs públicos

---

**Data do Fix:** 20/11/2025  
**Arquivo:** FUNIS_SYNC_FIX.md

