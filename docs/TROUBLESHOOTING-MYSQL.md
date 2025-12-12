# Troubleshooting - Problemas de Conexão MySQL

## ✅ Diagnóstico Completo

### 1. Testar Conexão MySQL

```bash
node scripts/test-mysql-connection.js
```

**Resultado esperado:**
```
✅ Conexão estabelecida com sucesso!
✅ Total de oportunidades: XXXX
✅ Total de vendedores: XXX
✅ Total de colunas_funil: XX
🎉 Todos os testes passaram!
```

### 2. Testar APIs do Sistema

```bash
node scripts/test-api-health.js
```

**Resultado esperado:**
```
✅ Passou: 6
❌ Falhou: 0
🎉 Todas as APIs estão funcionando!
```

---

## ❌ Problema: "Erro ao buscar dados das etapas do funil"

### Diagnóstico

Este erro aparece no componente `ConsultorFunilEtapas` e pode ter várias causas:

#### ✅ MySQL está funcionando?
```bash
node scripts/test-mysql-connection.js
```

#### ✅ APIs estão respondendo?
```bash
node scripts/test-api-health.js
```

#### ✅ Servidor Next.js está rodando?
```bash
npm run dev
```

### Causas Comuns

#### 1. Cache do Navegador
**Solução:**
- Pressione `Ctrl + Shift + R` (ou `Cmd + Shift + R` no Mac)
- Ou abra DevTools (F12) → Network → marque "Disable cache"
- Ou use modo anônimo/privado

#### 2. Usuário não autenticado
**Verificar:**
- Abra Console do navegador (F12)
- Veja se há erros de autenticação
- Verifique se `vendedorId` está definido

**Como verificar `vendedorId`:**
```javascript
// No console do navegador
localStorage.getItem('auth_token')
// Deve retornar um token
```

#### 3. API retornando erro
**Verificar no Console do Navegador:**
1. Abra DevTools (F12)
2. Vá na aba **Console**
3. Vá na aba **Network**
4. Recarregue a página
5. Procure por requisições em vermelho (erro)
6. Clique na requisição e veja a resposta

**APIs que devem funcionar:**
- `GET /api/funil/colunas?funil_id=4` → 200 OK
- `GET /api/consultor/oportunidades-por-coluna?vendedor_id=X&funil_id=4` → 200 OK

#### 4. CORS ou problema de rede
**Verificar:**
- Abra Network (F12 → Network)
- Veja se requisições estão sendo canceladas
- Veja se há erro de CORS

#### 5. Timeout ou lentidão
**Sintomas:**
- Página demora muito para carregar
- Requisições aparecem como "pending"

**Solução:**
- Verificar carga do servidor MySQL
- Verificar se há queries lentas
- Aumentar timeout nas APIs

---

## 🔍 Debug Avançado

### Verificar Logs do Servidor

No terminal onde está rodando `npm run dev`, procure por:

```
❌ Erro ao buscar colunas do funil:
❌ Erro ao buscar oportunidades por coluna:
```

### Verificar Logs do Browser

No Console do navegador (F12), procure por:

```
Erro detalhado ao buscar etapas do funil:
```

### Testar API Manualmente

```bash
# Testar API de colunas
curl http://localhost:3000/api/funil/colunas?funil_id=4

# Testar API de oportunidades por coluna (substitua VENDEDOR_ID)
curl "http://localhost:3000/api/consultor/oportunidades-por-coluna?vendedor_id=123&funil_id=4"
```

---

## 🛠️ Soluções Rápidas

### Reiniciar Servidor
```bash
# Parar servidor (Ctrl + C)
# Iniciar novamente
npm run dev
```

### Limpar Cache do Next.js
```bash
rm -rf .next
npm run dev
```

### Recarregar Banco
```bash
# Se o problema for no banco
node scripts/test-mysql-connection.js
```

### Limpar Cache do Navegador
```
Chrome/Edge: Ctrl + Shift + Del
Firefox: Ctrl + Shift + Del
Safari: Cmd + Option + E
```

---

## 📊 Status Atual do Sistema

### ✅ Confirmado Funcionando

- [x] Conexão MySQL: **OK**
- [x] Pool de conexões: **OK** 
- [x] API `/api/health`: **200 OK**
- [x] API `/api/status`: **200 OK**
- [x] API `/api/vendedores`: **200 OK**
- [x] API `/api/unidades`: **200 OK**
- [x] API `/api/funil/colunas`: **200 OK**
- [x] API `/api/oportunidades/stats`: **200 OK**

### 📈 Estatísticas

- Total de oportunidades: **12,953**
- Total de vendedores: **106**
- Total de colunas_funil: **37**
- Uptime do servidor: **OK**
- Memória: **94% de uso** (⚠️ Alto, mas aceitável)

---

## 💡 Dicas de Prevenção

### 1. Monitorar Memória
```bash
# Verificar uso de memória
node -e "console.log(process.memoryUsage())"
```

### 2. Monitorar Conexões MySQL
```bash
# No MySQL
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_connected';
```

### 3. Habilitar Logs Detalhados
No arquivo `.env.local`:
```
NODE_ENV=development
DEBUG=true
```

### 4. Usar Health Check
```bash
# Periodicamente verificar
curl http://localhost:3000/api/health
```

---

## 🆘 Ainda com Problema?

Se após todas as verificações o erro persistir:

1. **Copie o erro completo do Console do navegador** (F12 → Console)
2. **Copie o erro do terminal do servidor** (onde roda `npm run dev`)
3. **Tire screenshot da aba Network** mostrando as requisições falhando
4. **Informe qual página/rota está dando erro**

Com essas informações podemos diagnosticar o problema específico.

