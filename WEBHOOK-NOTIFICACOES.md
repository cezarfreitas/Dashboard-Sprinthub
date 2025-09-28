# Sistema de Notificações Globais via Webhook

## Visão Geral

O sistema implementa notificações globais que aparecem em qualquer tela quando uma venda é realizada. Utiliza **Server-Sent Events (SSE)** para comunicação em tempo real e **webhooks** para receber chamadas externas.

## Como Funciona

1. **Webhook recebe chamada** → `POST /api/chamada`
2. **Sistema processa dados** → Cria evento de nova venda
3. **Broadcasting SSE** → Envia para todas as conexões ativas
4. **Notificação global** → Dialog de celebração aparece em todas as telas

## Endpoints

### POST /api/chamada (Webhook)
Recebe chamadas externas de vendas realizadas.

**URL:** `http://localhost:3000/api/chamada`

**Método:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "vendedor": "João Silva",
  "valor": 25000,
  "cliente": "Empresa ABC",
  "produto": "Plano Premium"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Chamada recebida com sucesso",
  "event": {
    "type": "nova_venda",
    "timestamp": "2025-09-26T...",
    "data": {
      "vendedor": "João Silva",
      "valor": 25000,
      "cliente": "Empresa ABC",
      "produto": "Plano Premium",
      "id": "1727..."
    }
  }
}
```

### GET /api/sse
Endpoint de Server-Sent Events para receber notificações em tempo real.

**URL:** `http://localhost:3000/api/sse`

## Exemplos de Uso

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/chamada" -Method Post -ContentType "application/json" -Body '{"vendedor":"Maria Santos","valor":35000,"cliente":"Loja XYZ","produto":"Pacote Completo"}'
```

### cURL
```bash
curl -X POST http://localhost:3000/api/chamada \
  -H "Content-Type: application/json" \
  -d '{"vendedor":"Pedro Oliveira","valor":45000,"cliente":"Corporação 123","produto":"Serviço Especial"}'
```

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3000/api/chamada', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    vendedor: 'Ana Costa',
    valor: 55000,
    cliente: 'Negócios Plus',
    produto: 'Solução Avançada'
  })
})

const result = await response.json()
console.log(result)
```

## Componentes do Sistema

### 1. GlobalNotifications
- Componente global no layout
- Escuta eventos SSE
- Exibe dialog de celebração
- Indicador de conexão (apenas em desenvolvimento)

### 2. useGlobalNotifications Hook
- Hook para gerenciar conexão SSE
- Reconexão automática
- Estados de conexão e eventos

### 3. CelebrationDialog
- Dialog de celebração com confetti
- Som de notificação
- Auto-fechamento após 5 segundos
- Animações visuais

## Funcionamento em Qualquer Tela

O sistema funciona globalmente porque:

1. **`GlobalNotifications`** está no `layout.tsx`
2. **SSE** mantém conexão persistente
3. **Dialog** aparece sobre qualquer conteúdo
4. **Confetti** cobre toda a tela

## Campos Obrigatórios vs Opcionais

### Obrigatórios
- `vendedor`: Nome do vendedor
- `valor`: Valor da venda (número)

### Opcionais
- `cliente`: Nome do cliente (padrão: "Cliente não informado")
- `produto`: Nome do produto (padrão: "Produto não informado")

## Monitoramento

### Indicador de Conexão
Em modo de desenvolvimento, aparece um indicador no canto inferior direito:
- 🟢 Conectado: SSE funcionando
- 🔴 Desconectado: Problema de conexão

### Logs do Console
O sistema registra logs detalhados:
- Conexões SSE
- Eventos recebidos
- Erros de conexão
- Broadcasting de eventos

## Integração com Sistemas Externos

Para integrar com CRMs, ERPs ou outros sistemas:

1. Configure o webhook para chamar `POST /api/chamada`
2. Envie os dados no formato JSON especificado
3. O sistema automaticamente notificará todas as telas ativas

## Exemplo de Integração com Zapier

1. Crie um Zap que monitora vendas no seu CRM
2. Configure ação de Webhook
3. URL: `http://seu-dominio.com/api/chamada`
4. Método: POST
5. Mapeie os campos do CRM para o JSON

## Troubleshooting

### Notificação não aparece
- Verifique se o servidor está rodando
- Confirme se o POST retornou `success: true`
- Verifique logs do console para erros SSE

### Conexão SSE instável
- Verifique se há proxy/firewall bloqueando
- Confirme se o navegador suporta SSE
- Verifique logs do servidor

### Dialog não fecha automaticamente
- Verifique se há erros no console
- Confirme se o áudio está carregando corretamente
- Teste em navegador diferente
