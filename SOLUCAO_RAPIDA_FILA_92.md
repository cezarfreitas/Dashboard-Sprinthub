# 🚨 Solução Rápida: Unidade 92 Sem Vendedores Disponíveis

**Erro recebido:**
```json
{
  "sucesso": false,
  "erro": "Nenhum vendedor disponível na fila desta unidade"
}
```

---

## 🔍 PASSO 1: Diagnosticar o Problema

Execute este comando SQL para ver exatamente qual é o problema:

```bash
mysql -u root -p dash_inteli < scripts/debug-unidade-92-simples.sql
```

**OU** execute direto no MySQL:

```sql
-- Ver configuração da fila
SELECT 
  id, nome, ativo, fila_leads,
  CASE 
    WHEN fila_leads IS NULL THEN '❌ FILA NÃO CONFIGURADA'
    WHEN JSON_LENGTH(fila_leads) = 0 THEN '❌ FILA VAZIA'
    ELSE CONCAT('✅ ', JSON_LENGTH(fila_leads), ' vendedores na fila')
  END as status
FROM unidades WHERE id = 92;
```

---

## 🎯 CENÁRIO 1: Fila Não Configurada

**Sintoma:** `fila_leads` é `NULL` ou `[]`

### Solução: Configure a fila pela interface web

1. Acesse: **http://localhost:3000/unidades/fila**
2. Encontre a unidade 92
3. Clique em **"Gerenciar Fila"**
4. Adicione vendedores na ordem desejada
5. Salve

**OU via SQL:**
```sql
-- Listar vendedores ativos da unidade 92
SELECT id, name, lastName, ativo 
FROM vendedores 
WHERE unidade_id = 92 AND ativo = 1;

-- Configurar fila com vendedores (substitua IDs pelos vendedores reais)
UPDATE unidades 
SET fila_leads = '[
  {"vendedor_id": 123, "sequencia": 1},
  {"vendedor_id": 456, "sequencia": 2},
  {"vendedor_id": 789, "sequencia": 3}
]'
WHERE id = 92;
```

---

## 🎯 CENÁRIO 2: Todos Vendedores Inativos

**Sintoma:** Vendedores na fila existem, mas todos têm `ativo = 0`

### Solução A: Ativar vendedores

```sql
-- Ver vendedores inativos da fila
SELECT v.id, v.name, v.lastName, v.ativo 
FROM vendedores v
WHERE v.id IN (
  SELECT JSON_UNQUOTE(JSON_EXTRACT(fila_leads, CONCAT('$[', nums.idx, '].vendedor_id')))
  FROM unidades u
  CROSS JOIN (SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) nums
  WHERE u.id = 92 AND JSON_LENGTH(fila_leads) > nums.idx
)
AND v.ativo = 0;

-- Ativar vendedor específico
UPDATE vendedores SET ativo = 1 WHERE id = 123; -- substitua 123 pelo ID real
```

### Solução B: Adicionar vendedores ativos na fila

1. Acesse: **http://localhost:3000/unidades/fila**
2. Remova vendedores inativos
3. Adicione vendedores ativos
4. Salve

---

## 🎯 CENÁRIO 3: Todos Vendedores em Ausência

**Sintoma:** Vendedores ativos, mas todos têm ausência cadastrada

### Solução A: Ver ausências ativas

```sql
-- Listar ausências ativas da unidade 92
SELECT 
  va.id,
  va.vendedor_id,
  v.name as vendedor,
  va.data_inicio,
  va.data_fim,
  va.motivo,
  DATEDIFF(va.data_fim, NOW()) as dias_restantes
FROM vendedores_ausencias va
INNER JOIN vendedores v ON v.id = va.vendedor_id
WHERE va.unidade_id = 92
  AND NOW() BETWEEN va.data_inicio AND va.data_fim
ORDER BY va.data_fim;
```

### Solução B: Remover/Ajustar ausências

**Via Interface Web:**
1. Acesse: **http://localhost:3000/unidades/fila**
2. Clique em **"Gerenciar Ausências"** na unidade 92
3. Remova ou ajuste as datas das ausências
4. Salve

**Via SQL (remover ausência específica):**
```sql
-- Remover ausência por ID
DELETE FROM vendedores_ausencias WHERE id = 123; -- substitua pelo ID da ausência

-- OU ajustar data de fim para agora (finalizar ausência)
UPDATE vendedores_ausencias 
SET data_fim = NOW() 
WHERE id = 123; -- substitua pelo ID
```

---

## 🎯 CENÁRIO 4: Fila Configurada, Mas Vendedores Não Existem

**Sintoma:** IDs na fila não correspondem a vendedores reais no banco

### Solução: Limpar fila e reconfigurar

```sql
-- Ver vendedores que NÃO existem mais
SELECT 
  JSON_UNQUOTE(JSON_EXTRACT(fila_leads, CONCAT('$[', nums.idx, '].vendedor_id'))) as vendedor_id,
  'NÃO EXISTE' as status
FROM unidades u
CROSS JOIN (SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) nums
WHERE u.id = 92 
  AND JSON_LENGTH(fila_leads) > nums.idx
  AND NOT EXISTS (
    SELECT 1 FROM vendedores v 
    WHERE v.id = JSON_UNQUOTE(JSON_EXTRACT(fila_leads, CONCAT('$[', nums.idx, '].vendedor_id')))
  );

-- Limpar fila e reconfigurar via interface web
UPDATE unidades SET fila_leads = NULL WHERE id = 92;
-- Depois acesse /unidades/fila para reconfigurar
```

---

## ⚡ Solução Rápida (Emergência)

Se você precisa de uma solução IMEDIATA:

### 1. Verificar se há vendedores ativos na unidade:
```sql
SELECT id, name, lastName, email, ativo 
FROM vendedores 
WHERE unidade_id = 92 
  AND ativo = 1
LIMIT 5;
```

### 2. Configurar fila com os vendedores encontrados:
```sql
-- Exemplo: substituir IDs pelos retornados acima
UPDATE unidades 
SET fila_leads = '[
  {"vendedor_id": 123, "sequencia": 1},
  {"vendedor_id": 456, "sequencia": 2}
]'
WHERE id = 92;
```

### 3. Testar novamente:
```bash
curl -X POST 'http://localhost:3000/api/filav2' \
-H 'Content-Type: application/json' \
-d '{"unidade": "92", "idlead": "65204"}'
```

---

## 📋 Checklist de Verificação

Execute cada item e marque quando estiver OK:

- [ ] **Fila configurada?** → `fila_leads` não é NULL nem vazio
- [ ] **Vendedores existem?** → IDs na fila existem na tabela `vendedores`
- [ ] **Vendedores ativos?** → Pelo menos 1 vendedor com `ativo = 1`
- [ ] **Sem ausências?** → Nenhum vendedor com ausência ativa
- [ ] **Unidade ativa?** → Unidade 92 tem `ativo = 1`

---

## 🆘 Ainda não funcionou?

Execute o diagnóstico completo:

```bash
mysql -u root -p dash_inteli < scripts/diagnostico-fila-unidade-92.sql
```

E me envie a saída completa. O script mostrará **exatamente** onde está o problema.

---

## 💡 Dica de Prevenção

Para evitar este problema no futuro:

1. **Sempre tenha pelo menos 2-3 vendedores ativos** por unidade
2. **Configure ausências com antecedência** (não deixe vendedores sumirem sem aviso)
3. **Monitore o painel** em `/unidades/fila` regularmente
4. **Considere alertas automáticos** quando uma fila ficar sem vendedores

---

## 🔗 Links Úteis

- **Gerenciar Filas:** http://localhost:3000/unidades/fila
- **Gerenciar Vendedores:** http://localhost:3000/vendedores
- **Gerenciar Unidades:** http://localhost:3000/unidades

---

**Status esperado após correção:**
```json
{
  "sucesso": true,
  "vendedor_atribuido": {
    "vendedor_id": 123,
    "nome": "João Silva"
  },
  "lead_id": 65204,
  "lead_atualizado": true
}
```



