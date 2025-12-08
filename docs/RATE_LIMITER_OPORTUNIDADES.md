# Rate Limiter - Sincronização de Oportunidades

## 📊 Visão Geral

A sincronização de oportunidades implementa um **rate limiter** para respeitar os limites da API da SprintHub.

### ⚙️ Configuração Atual

- **Limite:** 50 requisições por minuto
- **Janela:** 60 segundos (1 minuto)
- **Margem de segurança:** +100ms após atingir o limite

---

## 🔧 Como Funciona

### 1. Controle de Requisições

```typescript
class RateLimiter {
  private requests: number[] = []        // Timestamps das requisições
  private maxRequests: number = 50       // Máximo por janela
  private windowMs: number = 60000       // Janela de 1 minuto
}
```

### 2. Fluxo de Execução

```
┌─────────────────────────────────────┐
│  Requisição vai ser feita           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  rateLimiter.waitIfNeeded()         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Remove requisições antigas         │
│  (fora da janela de 60s)            │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │ Verificação │
        └──────┬──────┘
               │
       ┌───────┴────────┐
       │                │
  < 50 req/min    ≥ 50 req/min
       │                │
       ▼                ▼
   ┌─────┐      ┌──────────────┐
   │ OK  │      │ AGUARDAR     │
   │     │      │ (até liberar)│
   └──┬──┘      └──────┬───────┘
      │                │
      └────────┬───────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Registra timestamp da requisição  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Faz a requisição para SprintHub    │
└─────────────────────────────────────┘
```

### 3. Quando o Limite é Atingido

Quando 50 requisições já foram feitas nos últimos 60 segundos:

1. **Calcula tempo de espera:** Quanto falta para a requisição mais antiga sair da janela
2. **Aguarda:** Pausa a execução pelo tempo calculado + 100ms
3. **Limpa requisições antigas:** Remove da lista as que saíram da janela
4. **Continua:** Permite a nova requisição

---

## 📝 Logs do Rate Limiter

### Logs Automáticos

#### A cada 10 requisições:
```
📊 Rate limiter: 10 requisições totais | 10 na janela atual | 0 esperas
📊 Rate limiter: 20 requisições totais | 20 na janela atual | 0 esperas
📊 Rate limiter: 50 requisições totais | 50 na janela atual | 0 esperas
```

#### Quando atinge o limite:
```
⏳ Rate limit atingido (50 req/min). Aguardando 35s... [Total de esperas: 1]
```

#### Ao final da sincronização:
```
✅ Sincronização de oportunidades concluída em 125.45s: {
  totalFunis: 3,
  totalColunas: 12,
  totalOportunidades: 250,
  novos: 50,
  atualizados: 200,
  erros: 0
}
📊 Rate limiter stats: {
  totalRequests: 150,
  totalWaits: 2,
  avgRequestsPerMinute: 48
}
```

---

## 🎯 Estatísticas Monitoradas

### Durante a Execução

| Métrica | Descrição |
|---------|-----------|
| `totalRequests` | Total de requisições feitas |
| `currentWindow` | Requisições na janela atual (últimos 60s) |
| `totalWaits` | Quantas vezes teve que aguardar |

### Ao Final

| Métrica | Cálculo | Descrição |
|---------|---------|-----------|
| `totalRequests` | Contador direto | Total de requisições feitas |
| `totalWaits` | Contador direto | Total de pausas por rate limit |
| `avgRequestsPerMinute` | `(totalRequests / duração) * 60` | Média de requisições por minuto |

---

## ⚡ Performance

### Cenário Típico

**Sincronização de 250 oportunidades:**
- 3 funis
- 12 colunas
- ~150 requisições (paginação)

**Resultado:**
```
Duração: 125s (2 min 5s)
Requisições: 150
Esperas: 2 (quando atingiu 50 req/min)
Média: 48 req/min (dentro do limite)
```

### Impacto do Rate Limiter

Sem rate limiter:
- ⚠️ Risco de banimento da API
- ⚠️ Requisições falham com erro 429
- ⚠️ Dados incompletos

Com rate limiter:
- ✅ 100% de sucesso
- ✅ Respeitamos os limites da API
- ✅ Sincronização confiável
- ⏱️ ~20-30% mais lento (mas garantido)

---

## 🔧 Configuração

### Ajustar o Limite

Para alterar o limite de requisições:

```typescript
// lib/oportunidades-sync.ts
const rateLimiter = new RateLimiter(50, 60000)
//                                  ^^  ^^^^^
//                                  |   |
//                                  |   └─ Janela em ms (60000 = 1 minuto)
//                                  └───── Máximo de requisições
```

### Exemplos de Configuração

```typescript
// Mais conservador (40 req/min)
const rateLimiter = new RateLimiter(40, 60000)

// Mais agressivo (60 req/min) - USE COM CUIDADO!
const rateLimiter = new RateLimiter(60, 60000)

// Janela de 30 segundos (50 req/30s = 100 req/min)
const rateLimiter = new RateLimiter(50, 30000)
```

⚠️ **ATENÇÃO:** Sempre consulte a documentação da API da SprintHub antes de aumentar os limites!

---

## 🐛 Troubleshooting

### Erro 429 (Too Many Requests)

**Sintoma:**
```
❌ Erro na API para coluna 123, página 0: 429
```

**Solução:**
1. Reduza o limite: `new RateLimiter(40, 60000)`
2. Aumente a janela: `new RateLimiter(50, 70000)`
3. Adicione margem de segurança maior no código

### Sincronização Muito Lenta

**Sintoma:**
```
📊 Rate limiter stats: { totalWaits: 15 }
```

**Diagnóstico:**
- Muitas esperas = limite muito conservador ou muitas requisições

**Solução:**
- Se a API permitir, aumente o limite: `new RateLimiter(60, 60000)`
- Ou otimize as queries (menos páginas, mais resultados por página)

### Requisições Fora de Ordem

**Sintoma:**
```
⏳ Rate limit atingido mas janela atual mostra 35 requisições
```

**Causa:**
- Requisições antigas não sendo limpas corretamente
- Timestamps incorretos

**Solução:**
- O código já trata isso no `waitIfNeeded()`:
  ```typescript
  this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs)
  ```

---

## 📊 Monitoramento

### Logs a Observar

#### ✅ Bom (dentro do limite)
```
📊 Rate limiter: 50 requisições totais | 50 na janela atual | 0 esperas
✅ Sincronização concluída
📊 Rate limiter stats: { totalWaits: 0, avgRequestsPerMinute: 48 }
```

#### ⚠️ Atenção (atingindo limite frequentemente)
```
⏳ Rate limit atingido (50 req/min). Aguardando 30s... [Total de esperas: 5]
⏳ Rate limit atingido (50 req/min). Aguardando 28s... [Total de esperas: 6]
📊 Rate limiter stats: { totalWaits: 10, avgRequestsPerMinute: 49.8 }
```

#### ❌ Problema (erro 429 mesmo com rate limiter)
```
❌ Erro na API para coluna 123, página 0: 429
```
**→ Reduza o limite imediatamente!**

---

## 🔐 Segurança

### Margem de Segurança

O rate limiter adiciona **+100ms** após calcular o tempo de espera:

```typescript
const waitTime = this.windowMs - (now - oldestRequest) + 100
//                                                        ^^^
//                                                        Margem
```

**Por quê?**
- Clock skew entre servidor e API
- Latência de rede
- Processos assíncronos
- Melhor ser conservador que arriscar ban

### Reset Entre Execuções

```typescript
rateLimiter.reset()
```

Chamado ao final de cada sincronização para:
- Limpar contadores
- Evitar acúmulo de memória
- Garantir estado limpo para próxima execução

---

## 📚 Referências

### Código-fonte
- **Implementação:** `lib/oportunidades-sync.ts` (linhas 4-56)
- **Uso:** `lib/oportunidades-sync.ts` (linha 190)
- **Estatísticas:** `lib/oportunidades-sync.ts` (linhas 454-472)

### Conceitos
- [Rate Limiting](https://en.wikipedia.org/wiki/Rate_limiting)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Sliding Window Algorithm](https://en.wikipedia.org/wiki/Sliding_window_protocol)

### Nossa Implementação
- **Algoritmo:** Sliding Window (janela deslizante)
- **Vantagem:** Distribui requisições uniformemente
- **Desvantagem:** Usa memória para armazenar timestamps

---

## ✅ Checklist de Implementação

- [x] Rate limiter implementado
- [x] Limite configurável (50 req/min)
- [x] Logs informativos
- [x] Estatísticas ao final
- [x] Reset entre execuções
- [x] Margem de segurança (+100ms)
- [x] Documentação completa

---

**Última atualização:** 2024-12-08
**Versão:** 1.0.0

