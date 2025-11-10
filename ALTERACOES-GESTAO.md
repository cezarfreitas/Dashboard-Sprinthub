# 📋 Alterações - Sistema de Gestão de Unidades

## 🎯 Objetivo
Substituir o campo `responsavel_unidade` editável pelo campo automático `user_gestao` extraído do sub-departamento de gestão da API SprintHub.

---

## ✅ Mudanças Implementadas

### 1. **Script SQL** - `scripts/add-gestao-columns.sql`
Adiciona as novas colunas e remove a antiga:

```sql
-- Adiciona
ALTER TABLE unidades ADD COLUMN dpto_gestao INT NULL;
ALTER TABLE unidades ADD COLUMN user_gestao INT NULL;

-- Remove
ALTER TABLE unidades DROP COLUMN responsavel_unidade;
```

**Execute este script antes de sincronizar!**

---

### 2. **Sincronização** - `lib/unidades-sync.ts`

#### Lógica Adicionada:
```typescript
// Identifica sub-departamento com "GESTÃO" no nome
const subGestao = unidade.subs.find(sub => 
  sub.name && sub.name.toUpperCase().includes('GESTÃO')
)

if (subGestao) {
  dptoGestao = subGestao.id           // ID do sub-departamento
  userGestao = subGestao.users[0]     // Primeiro usuário do sub
}
```

#### Exemplo de Log:
```
✓ Gestão encontrada: SC OUTDOOR GESTÃO (ID: 117, User: 218)
```

---

### 3. **API de Listagem** - `app/api/unidades/list/route.ts`

#### Alterações no SELECT:
```sql
-- Removido: u.responsavel_unidade
-- Adicionado: u.dpto_gestao, u.user_gestao
```

#### Alterações na Resposta JSON:
```json
{
  "responsavel": 218,              // user_gestao
  "responsavel_nome": "João Silva", // Nome completo do user_gestao
  "dpto_gestao": 117,
  "user_gestao": 218,
  "nome_user_gestao": "João Silva"
}
```

#### Removido do PATCH:
- ❌ Parâmetro `responsavel`
- ❌ Função de atualizar responsável manualmente

**Agora o responsável é definido automaticamente pela sincronização!**

---

## 📊 Estrutura de Dados

### Entrada (API SprintHub):
```json
{
  "id": 112,
  "name": "SC OUTDOOR",
  "department": 85,
  "subs": [
    {
      "id": 117,
      "name": "SC OUTDOOR GESTÃO",
      "department": 112,
      "users": [218]
    }
  ]
}
```

### Saída (Tabela unidades):
```
id: 112
name: SC OUTDOOR
department_id: 85
dpto_gestao: 117
user_gestao: 218
```

---

## 🔄 Fluxo de Sincronização

1. **API SprintHub** retorna departamento com subs
2. **Identificação**: Busca sub com "GESTÃO" no nome
3. **Extração**: Pega ID do sub e primeiro usuário
4. **Salvamento**: Grava `dpto_gestao` e `user_gestao`
5. **API de Listagem**: Retorna `user_gestao` como responsável

---

## 📝 Próximos Passos

### 1. Execute o Script SQL:
```bash
mysql -u seu_usuario -p dash_inteli < scripts/add-gestao-columns.sql
```

### 2. Execute a Sincronização:
```bash
POST http://localhost:3000/api/unidades/sync
```

### 3. Verifique os Dados:
```bash
GET http://localhost:3000/api/unidades/list
```

---

## ⚠️ Observações Importantes

- ✅ Campo `user_gestao` é **apenas leitura**
- ✅ Atualizado automaticamente na sincronização
- ✅ Identifica sub-departamento com "GESTÃO" (case-insensitive)
- ✅ Pega o **primeiro usuário** do array `users` do sub
- ⚠️ Se não houver sub de gestão, `user_gestao` fica NULL

---

## 🔍 Debugging

Para verificar se a gestão foi identificada corretamente:

```sql
-- Listar unidades com gestão
SELECT 
  id, 
  name, 
  dpto_gestao, 
  user_gestao 
FROM unidades 
WHERE user_gestao IS NOT NULL;

-- Verificar sub-departamentos
SELECT 
  id, 
  name, 
  JSON_EXTRACT(subs, '$[*].name') as subs_names 
FROM unidades 
WHERE subs IS NOT NULL;
```

---

## 🎯 Resultado Final

Antes da mudança:
- ❌ Campo editável `responsavel_unidade`
- ❌ Necessário atualizar manualmente via PATCH

Depois da mudança:
- ✅ Campo automático `user_gestao`
- ✅ Extraído do sub-departamento de gestão
- ✅ Atualizado automaticamente na sincronização
- ✅ Não pode ser editado manualmente (fonte única de verdade: SprintHub)







