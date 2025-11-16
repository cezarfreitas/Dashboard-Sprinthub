# 🔐 GUIA DE CONFIGURAÇÃO DE SEGURANÇA

## ⚡ Quick Start

### 1. Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
# JWT Secret (OBRIGATÓRIO - mínimo 32 caracteres)
JWT_SECRET=seu-secret-jwt-super-seguro-minimo-32-caracteres-aqui-abcdefg

# CSRF Secret (OBRIGATÓRIO - mínimo 32 caracteres)  
CSRF_SECRET=seu-secret-csrf-super-seguro-minimo-32-caracteres-aqui-xyz

# JWT Configuration
JWT_EXPIRES_IN=1h

# Node Environment
NODE_ENV=production
```

### 2. Instalar Dependência

Se ainda não tiver, instale o `validator`:

```bash
npm install validator
npm install --save-dev @types/validator
```

### 3. Reiniciar Aplicação

```bash
npm run build
npm start
```

---

## 📚 EXEMPLOS DE USO

### 1. Proteger API Route com CSRF

```typescript
// app/api/users/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyCSRF } from '@/lib/security/csrf'
import { getAPISecurityHeaders } from '@/lib/security/headers'

export async function POST(request: NextRequest) {
  // Verificar CSRF
  const isValidCSRF = await verifyCSRF(request)
  if (!isValidCSRF) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403, headers: getAPISecurityHeaders() }
    )
  }

  // Continuar com lógica...
  return NextResponse.json({ success: true })
}
```

### 2. Validar Input de Forma Segura

```typescript
import { analyzeInput, validateEmail, sanitizeString } from '@/lib/security/input-sanitization'

export async function POST(request: NextRequest) {
  const { email, name } = await request.json()

  // Análise completa de input
  const nameAnalysis = analyzeInput(name)
  if (!nameAnalysis.isSafe) {
    return NextResponse.json(
      { error: 'Input suspeito detectado', threats: nameAnalysis.threats },
      { status: 400 }
    )
  }

  // Validar email
  if (!validateEmail(email)) {
    return NextResponse.json(
      { error: 'Email inválido' },
      { status: 400 }
    )
  }

  const cleanName = sanitizeString(name)
  
  // Usar cleanName de forma segura...
}
```

### 3. Rate Limiting Customizado

```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/security/rate-limit-advanced'

export async function POST(request: NextRequest) {
  const userId = getUserIdFromToken(request)
  
  // Verificar rate limit
  const rateLimitResult = checkRateLimit(`custom:${userId}`, {
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 5 * 60 * 1000 // 5 minutos
  })

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
      { status: 429 }
    )
  }

  // Operação bem-sucedida? Resetar contador
  // resetRateLimit(`custom:${userId}`)
}
```

### 4. Logging de Eventos de Segurança

```typescript
import { logSecurityEvent, SecurityEventType, SecurityEventSeverity } from '@/lib/security/audit-log'
import { getClientIP } from '@/lib/security/rate-limit-advanced'

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  
  // Log de evento crítico
  logSecurityEvent({
    type: SecurityEventType.SECURITY_VIOLATION,
    severity: SecurityEventSeverity.CRITICAL,
    ip,
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    message: 'Tentativa de acesso não autorizado',
    details: { reason: 'Invalid token' }
  })
}
```

### 5. Validar Força de Senha

```typescript
import { validatePasswordStrength } from '@/lib/security/input-sanitization'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  const strength = validatePasswordStrength(password)
  
  if (!strength.isStrong) {
    return NextResponse.json({
      error: 'Senha fraca',
      score: strength.score,
      feedback: strength.feedback
    }, { status: 400 })
  }

  // Senha forte, continuar...
}
```

---

## 🔧 CONFIGURAÇÕES AVANÇADAS

### Custom Rate Limit Config

```typescript
// lib/security/rate-limit-advanced.ts

// Adicionar novo tipo de rate limiting
export const RATE_LIMIT_CONFIGS = {
  // ... configs existentes
  
  customOperation: {
    maxAttempts: 20,
    windowMs: 5 * 60 * 1000, // 5 minutos
    blockDurationMs: 15 * 60 * 1000, // 15 minutos
    skipSuccessfulRequests: true
  }
}
```

### Custom Security Headers

```typescript
// middleware.ts ou em route específica

import { getSecurityHeaders } from '@/lib/security/headers'

const headers = getSecurityHeaders()

// Adicionar header customizado
headers['X-Custom-Header'] = 'custom-value'

response.headers.set('X-Custom-Header', 'custom-value')
```

---

## 🎯 CHECKLIST DE SEGURANÇA

### Obrigatório ✅

- [ ] JWT_SECRET definido no `.env` (32+ caracteres)
- [ ] CSRF_SECRET definido no `.env` (32+ caracteres)
- [ ] HTTPS habilitado em produção
- [ ] NODE_ENV=production em produção
- [ ] Dependência `validator` instalada
- [ ] Middleware aplicado (já configurado)

### Recomendado ⚠️

- [ ] Revisar logs de segurança diariamente
- [ ] Configurar alertas para eventos CRITICAL
- [ ] Implementar backup dos audit logs
- [ ] Testar rate limiting com carga real
- [ ] Ajustar limites conforme necessário

### Opcional 💡

- [ ] Migrar rate limiting para Redis
- [ ] Integrar com Sentry/Datadog
- [ ] Implementar MFA
- [ ] Adicionar WAF (Cloudflare, AWS WAF)
- [ ] Penetration testing profissional

---

## 🧪 TESTANDO A SEGURANÇA

### 1. Testar Rate Limiting

```bash
# Fazer múltiplas requisições rápidas
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done

# Deve retornar 429 após limite excedido
```

### 2. Testar Security Headers

```bash
curl -I http://localhost:3000

# Deve incluir headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
# etc
```

### 3. Testar Input Validation

```bash
# Tentar SQL Injection
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin OR 1=1--","password":"test"}'

# Deve retornar erro de input inválido
```

### 4. Verificar Audit Logs

Após fazer login, verificar console:

```
[SECURITY:LOGIN_SUCCESS] {
  timestamp: "2024-11-16T10:30:00.000Z",
  severity: "INFO",
  ip: "127.0.0.1",
  ...
}
```

---

## 📊 MONITORAMENTO

### API de Estatísticas (a implementar)

```typescript
// app/api/admin/security/stats/route.ts
import { getSecurityStats } from '@/lib/security/audit-log'

export async function GET(request: NextRequest) {
  // Verificar se é admin
  const stats = getSecurityStats()
  return NextResponse.json(stats)
}
```

### Resposta Esperada:

```json
{
  "total": 1234,
  "last24h": 56,
  "last1h": 12,
  "byType": [
    { "type": "LOGIN_FAILURE", "count": 23 },
    { "type": "RATE_LIMIT_EXCEEDED", "count": 15 }
  ],
  "topIPs": [
    { "ip": "192.168.1.100", "count": 45 }
  ]
}
```

---

## 🚨 TRATAMENTO DE INCIDENTES

### Procedimento em caso de ataque:

1. **Identificar** - Revisar audit logs
2. **Blacklist IP** - Se necessário
3. **Ajustar Rate Limits** - Tornar mais restritivo
4. **Notificar Time** - Comunicar incidente
5. **Post-Mortem** - Analisar e melhorar

### Blacklist Manual de IP:

```typescript
import { addToBlacklist } from '@/lib/security/rate-limit-advanced'

// Bloquear IP por 24 horas
addToBlacklist('192.168.1.100', 24 * 60 * 60 * 1000)
```

---

## 📱 INTEGRAÇÃO COM FRONTEND

### Enviar CSRF Token:

```typescript
// Frontend - obter token
const response = await fetch('/api/csrf-token')
const { token } = await response.json()

// Enviar em requests
await fetch('/api/users/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify(data)
})
```

### Tratar Rate Limiting:

```typescript
const response = await fetch('/api/endpoint')

if (response.status === 429) {
  const data = await response.json()
  const retryAfter = data.retryAfter || 60
  
  // Mostrar mensagem ao usuário
  alert(`Muitas tentativas. Aguarde ${retryAfter} segundos.`)
}
```

---

## ⚙️ CONFIGURAÇÃO DE PRODUÇÃO

### Next.js Config:

```javascript
// next.config.js
module.exports = {
  // Headers já são aplicados pelo middleware
  // Mas pode adicionar headers extras aqui se necessário
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      }
    ]
  }
}
```

### Nginx (se aplicável):

```nginx
# Limitar tamanho de request body
client_max_body_size 10M;

# Timeout configurations
client_body_timeout 12;
client_header_timeout 12;
send_timeout 10;

# Buffer overflow protection
client_body_buffer_size 1K;
client_header_buffer_size 1k;
large_client_header_buffers 2 1k;
```

---

## 🔑 ROTAÇÃO DE SECRETS

### Procedimento:

1. Gerar novos secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Atualizar `.env` com novos valores

3. Reiniciar aplicação de forma coordenada

4. Invalidar tokens antigos (se necessário)

---

## 📞 SUPORTE

Para questões de segurança, contate a equipe de DevOps/Security.

**NÃO** exponha detalhes de vulnerabilidades em canais públicos.

---

**Sistema protegido com segurança enterprise-grade!** 🛡️

