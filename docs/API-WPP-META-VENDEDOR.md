# API WhatsApp - Meta do Vendedor

## 📋 Endpoint

```
GET /api/wpp/meta/[vendedor_id]
```

Retorna dados de meta do vendedor do mês atual, incluindo valor atingido, projeção e status.

---

## 🔑 Parâmetros

### Path Parameter: `vendedor_id`

Aceita **dois formatos**:

1. **ID numérico do vendedor**
   - Exemplo: `/api/wpp/meta/123`
   
2. **Email do vendedor**
   - Exemplo: `/api/wpp/meta/vendedor@empresa.com.br`

---

## ✅ Exemplos de Uso

### 1. Busca por ID

```bash
GET http://localhost:3000/api/wpp/meta/123
```

### 2. Busca por Email

```bash
GET http://localhost:3000/api/wpp/meta/vendas@esoutdoor.com.br
```

---

## 📤 Resposta de Sucesso

```json
{
  "success": true,
  "data": {
    "vendedor": {
      "id": 123,
      "nome": "João Silva",
      "username": "joao.silva",
      "email": "vendas@esoutdoor.com.br"
    },
    "periodo": {
      "mes": 12,
      "ano": 2025,
      "dia_atual": 11,
      "total_dias_mes": 31,
      "percentual_mes_decorrido": "35.5"
    },
    "meta": {
      "valor": 50000,
      "formatado": "R$ 50.000,00"
    },
    "atingido": {
      "valor": 18500,
      "formatado": "R$ 18.500,00",
      "total_oportunidades": 12,
      "percentual": "37.00"
    },
    "projecao": {
      "valor": 52136.36,
      "formatado": "R$ 52.136,36",
      "percentual": "104.27",
      "status": "no-caminho",
      "mensagem": "✅ No caminho para bater a meta"
    },
    "falta_atingir": {
      "valor": 31500,
      "formatado": "R$ 31.500,00",
      "percentual": "63.00"
    },
    "mensagem": "📊 *Desempenho do Mês* — *João Silva*\n\n🎯 *Meta:* R$ 50.000,00\n\n💰 *Atingido até hoje (11/31):* R$ 18.500,00 — *37.00%*\n\n📈 *Projeção atual:* R$ 52.136,36 — *104.27%*\n✅ *Status:* No Caminho\n\n📉 *Falta para a meta:* R$ 31.500,00 — *63.00%*\n📆 *Mês concluído:* 35.5%"
  }
}
```

---

## ❌ Respostas de Erro

### 1. Parâmetro Inválido (400)

```json
{
  "success": false,
  "message": "Parâmetro do vendedor inválido"
}
```

### 2. Email Não Encontrado (404)

```json
{
  "success": false,
  "message": "Vendedor não encontrado com o email fornecido",
  "email_buscado": "email@inexistente.com"
}
```

### 3. Erro Interno (500)

```json
{
  "success": false,
  "message": "Erro interno do servidor",
  "error": "Detalhes do erro"
}
```

---

## 📊 Status da Projeção

O campo `projecao.status` pode ter os seguintes valores:

| Status | Descrição | Mensagem |
|--------|-----------|----------|
| `meta-atingida` | Meta já foi atingida | 🎉 Meta atingida! Parabéns! |
| `no-caminho` | Projeção indica que atingirá a meta | ✅ No caminho para bater a meta |
| `atencao` | Projeção entre 80-100% da meta | ⚠️ Atenção: ritmo abaixo do esperado |
| `risco` | Projeção abaixo de 80% da meta | 🚨 Risco: ritmo muito abaixo da meta |
| `aguardando-vendas` | Ainda não houve vendas no mês | ℹ️ Aguardando primeiras vendas do mês |
| `sem-meta` | Não há meta cadastrada | ℹ️ Sem meta cadastrada para este mês |

---

## 🔍 Observações

1. **Busca por Email**:
   - O email é buscado na tabela `vendedores`
   - A busca é case-sensitive
   - Retorna 404 se o email não existir

2. **Cálculo da Meta**:
   - Considera apenas oportunidades com `status = 'gain'`
   - Usa a data de ganho (`gain_date`) e não a data de criação
   - Projeção é linear baseada nos dias decorridos do mês

3. **Performance**:
   - Busca por ID é mais rápida (query direta)
   - Busca por email faz query adicional para encontrar o ID

---

## 🧪 Testando

### cURL - Por ID
```bash
curl http://localhost:3000/api/wpp/meta/123
```

### cURL - Por Email
```bash
curl http://localhost:3000/api/wpp/meta/vendas@esoutdoor.com.br
```

### Postman
1. Método: `GET`
2. URL: `http://localhost:3000/api/wpp/meta/[vendedor_id_ou_email]`
3. Headers: (nenhum necessário)

---

## 📱 Campo `mensagem` - Formato WhatsApp

O campo `mensagem` retorna uma string formatada pronta para envio via WhatsApp com formatação de negrito (`*texto*`):

```
📊 *Desempenho do Mês* — *Gilmar ES OUTDOOR*

🎯 *Meta:* R$ 101.620,32

💰 *Atingido até hoje (11/12):* R$ 13.800,00 — *13,58%*

📈 *Projeção atual:* R$ 38.890,91 — *38,27%*
⚠️ *Status:* Risco (ritmo abaixo do necessário)

📉 *Falta para a meta:* R$ 87.820,32 — *86,42%*
📆 *Mês concluído:* 35,5%
```

**Nota:** O WhatsApp renderiza `*texto*` como **texto** em negrito automaticamente.

### Status possíveis na mensagem:

| Status API | Emoji | Texto na Mensagem |
|-----------|-------|-------------------|
| `meta-atingida` | 🎉 | Meta Atingida! |
| `no-caminho` | ✅ | No Caminho |
| `atencao` | ⚠️ | Atenção (ritmo abaixo do necessário) |
| `risco` | ⚠️ | Risco (ritmo abaixo do necessário) |
| `aguardando-vendas` | ℹ️ | Aguardando primeiras vendas |
| `sem-meta` | ℹ️ | Sem meta cadastrada |

---

## 📝 Changelog

### v2.1 - 2025-12-11
- ✅ Adicionado campo `mensagem` formatado para WhatsApp
- ✅ Mensagem inclui todos os dados com emojis e formatação
- ✅ Status dinâmico baseado na performance do vendedor

### v2.0 - 2025-12-11
- ✅ Adicionado suporte para busca por email
- ✅ Melhorada validação de parâmetros
- ✅ Mensagem de erro mais descritiva para email não encontrado

### v1.0 - Data anterior
- ✅ Versão inicial (busca apenas por ID)

