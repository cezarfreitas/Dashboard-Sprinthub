# 🚀 Quick Start - Postman Collection Gestor

Guia rápido para começar a usar a collection de APIs do Gestor.

## ⚡ Setup em 3 Passos

### 1️⃣ Importar Collection e Environment

1. Abra o **Postman**
2. Clique em **Import**
3. Arraste os arquivos:
   - `Gestor-API-Collection.json`
   - `Gestor-Environment.json`

### 2️⃣ Selecionar Environment

1. No canto superior direito, clique no dropdown de environments
2. Selecione **"Gestor - Local Development"**
3. Clique no ícone de olho (👁️) para ver as variáveis

### 3️⃣ Fazer Login

1. Na collection, vá em **Autenticação → Login Gestor**
2. Edite o body com seu email:
   ```json
   {
     "email": "seu-email@exemplo.com"
   }
   ```
3. Clique em **Send**
4. Copie o `id` do gestor da resposta
5. Atualize a variável `gestor_id` no environment

**Pronto! 🎉** Agora você pode testar todos os outros endpoints.

---

## 🎯 Testes Rápidos

### Teste 1: Ver Estatísticas
```
📊 Estatísticas → Obter Estatísticas da Unidade
```
Retorna todas as métricas da unidade do gestor.

### Teste 2: Ver Filas
```
🔄 Fila de Leads → Listar Filas
```
Lista todas as filas de leads das suas unidades.

### Teste 3: Ver Logs
```
📝 Logs de Distribuição → Obter Logs de Distribuição
```
Mostra histórico de distribuição de leads.

---

## 🔧 Configurar Variáveis

### Via Interface do Postman

1. Clique no ícone de olho (👁️) no canto superior direito
2. Clique em **Edit** ao lado de "Gestor - Local Development"
3. Configure os valores:

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `gestor_id` | `254` | ID do gestor logado |
| `unidade_id` | `92` | ID da unidade a consultar |
| `gestor_email` | `gestor@email.com` | Email para login |
| `ausencia_id` | `1` | ID da ausência (para delete) |

---

## 📋 Fluxo Completo de Uso

### Cenário: Gerenciar Fila de Leads

```
1. Login
   POST /api/auth/gestor
   → Obter gestor_id e unidade_id

2. Ver Filas Atuais
   GET /api/fila
   Header: x-gestor-id: {{gestor_id}}
   → Ver ordem atual dos vendedores

3. Atualizar Ordem da Fila
   PUT /api/fila/{{unidade_id}}
   Body: { "vendedores": [...] }
   → Reorganizar vendedores

4. Registrar Ausência
   POST /api/fila/{{unidade_id}}/ausencias
   Body: { vendedor_id, data_inicio, data_fim, motivo }
   → Vendedor sai da fila temporariamente

5. Ver Logs de Distribuição
   GET /api/fila/{{unidade_id}}/logs
   → Verificar histórico de distribuição
```

---

## 🎨 Dicas Pro

### 1. Usar Pre-request Scripts
Configure scripts para atualizar variáveis automaticamente:

```javascript
// Salvar gestor_id após login
pm.test("Save gestor_id", function() {
    var jsonData = pm.response.json();
    pm.environment.set("gestor_id", jsonData.gestor.id);
    pm.environment.set("unidade_id", jsonData.gestor.unidade_principal.id);
});
```

### 2. Criar Tests Automáticos
Adicione validações nas respostas:

```javascript
pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});
```

### 3. Usar Variáveis Dinâmicas
Para testes automatizados:

```javascript
// Gerar data atual automaticamente
pm.environment.set("hoje", new Date().toISOString().split('T')[0]);

// Usar na URL
/api/gestor/stats?dataInicio={{hoje}}&dataFim={{hoje}}
```

---

## 📊 Exemplos de Respostas

### Login Bem-sucedido
```json
{
  "success": true,
  "gestor": {
    "id": 254,
    "name": "João",
    "unidades": [
      { "id": 92, "nome": "Unidade A" }
    ]
  }
}
```

### Estatísticas da Unidade
```json
{
  "success": true,
  "stats": {
    "total_vendedores": 5,
    "oportunidades_ganhas": 45,
    "valor_ganho": 125000.00,
    "vendedores": [...]
  }
}
```

### Lista de Filas
```json
{
  "success": true,
  "filas": [
    {
      "unidade_nome": "Unidade A",
      "vendedores_fila": [
        { "nome": "Maria Santos", "sequencia": 1 }
      ]
    }
  ]
}
```

---

## ❌ Erros Comuns

### Erro 401: "Email não encontrado"
**Solução:** Verifique se o email está correto no body da requisição de login.

### Erro 403: "Você não é gestor desta unidade"
**Solução:** Atualize `gestor_id` e `unidade_id` com valores corretos obtidos do login.

### Filas vazias
**Solução:** Adicione o header `x-gestor-id` na requisição GET /api/fila.

### Erro 400: Validação
**Solução:** Verifique se todos os campos obrigatórios estão presentes no body.

---

## 🔗 Links Úteis

- **Interface Web:** http://localhost:3000/gestor
- **Fila de Leads:** http://localhost:3000/gestor/fila
- **Documentação Completa:** `README.md`
- **Schema do Banco:** `../banco.sql`

---

## 💡 Suporte

Se encontrar problemas:
1. Verifique se o servidor está rodando: `http://localhost:3000`
2. Confira as variáveis do environment
3. Veja os logs do servidor no terminal
4. Consulte o `README.md` para documentação detalhada

---

**Happy Testing! 🚀**

