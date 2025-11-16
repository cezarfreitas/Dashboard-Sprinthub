# 🔐 REFERÊNCIA RÁPIDA DE SEGURANÇA

## 📦 Instalação Rápida

```bash
# 1. Instalar dependência
npm install validator
npm install --save-dev @types/validator

# 2. Configurar .env
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
echo "CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env

# 3. Reiniciar
npm run build && npm start
```

---

## 🎯 USO RÁPIDO

### Import Único

```typescript
import {
  // Headers
  applySecurityHeaders,
  getAPISecurityHeaders,
  
  // CSRF
  generateCSRFToken,
  verifyCSRF,
  
  // Rate Limiting
  checkMultipleRateLimits,
  resetRateLimit,
  
  // Input Validation
  analyzeInput,
  validateEmail,
  sanitizeString,
  
  // Audit Logging
  logLoginSuccess,
  logLoginFailure,
  logSuspiciousInput,
  
  // Types
  SecurityEventType,
  SecurityEventSeverity
} from '@/lib/security'
```

---

## 📋 SNIPPETS COMUNS

### API Route Completa (POST)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyCSRF, analyzeInput, getAPISecurityHeaders } from '@/lib/security'

export async function POST(request: NextRequest) {
  // CSRF
  if (!await verifyCSRF(request)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403, headers: getAPISecurityHeaders() }
    )
  }

  // Input
  const { name } = await request.json()
  const analysis = analyzeInput(name)
  if (!analysis.isSafe) {
    return NextResponse.json(
      { error: 'Invalid input', threats: analysis.threats },
      { status: 400, headers: getAPISecurityHeaders() }
    )
  }

  // Lógica...
  return NextResponse.json(
    { success: true },
    { headers: getAPISecurityHeaders() }
  )
}
```

### Login Seguro

```typescript
import { logLoginSuccess, logLoginFailure, resetRateLimit } from '@/lib/security'

const result = await login(credentials)

if (result.success) {
  logLoginSuccess(request, result.user!.id, result.user!.username)
  resetRateLimit(`login:user:${result.user!.id}`)
} else {
  logLoginFailure(request, credentials.username, result.message || 'Failed')
}
```

### Validação de Form

```typescript
import { validateEmail, validatePasswordStrength, sanitizeString } from '@/lib/security'

const email = sanitizeString(formData.email)
const password = formData.password

// Validar
if (!validateEmail(email)) {
  return { error: 'Email inválido' }
}

const strength = validatePasswordStrength(password)
if (!strength.isStrong) {
  return { error: 'Senha fraca', feedback: strength.feedback }
}
```

---

## 🚦 RATE LIMIT TYPES

| Type | Max | Window | Block |
|------|-----|--------|-------|
| `login` | 5 | 15 min | 30 min |
| `api` | 100 | 1 min | 5 min |
| `mutation` | 30 | 1 min | 10 min |
| `sensitive` | 3 | 1 hora | 24 horas |

---

## 🎫 CSRF Frontend

```typescript
// 1. Criar endpoint para token
// app/api/csrf-token/route.ts
import { NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/security'

export async function GET() {
  const token = generateCSRFToken()
  return NextResponse.json({ token })
}

// 2. Frontend - usar token
const { token } = await fetch('/api/csrf-token').then(r => r.json())

await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify(data)
})
```

---

## 📊 MONITORING

```typescript
import { getSecurityStats, getSecurityEvents } from '@/lib/security'

// Stats gerais
const stats = getSecurityStats()
console.log(stats)
// {
//   total: 1234,
//   last24h: 56,
//   byType: [...],
//   topIPs: [...]
// }

// Eventos críticos
const criticalEvents = getSecurityEvents(50, SecurityEventSeverity.CRITICAL)
```

---

## 🔑 SECURITY HEADERS

Aplicados automaticamente pelo middleware em:
- ✅ Todas as páginas
- ✅ Todas as APIs (adicionar manualmente com `getAPISecurityHeaders()`)

Headers incluídos:
```
Content-Security-Policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security (produção)
X-XSS-Protection: 1; mode=block
Permissions-Policy
X-DNS-Prefetch-Control: off
```

---

## 🧹 INPUT VALIDATION

```typescript
import { 
  detectSQLInjection,
  detectXSS,
  detectPathTraversal,
  analyzeInput 
} from '@/lib/security'

// Detecção específica
if (detectSQLInjection(input)) { /* block */ }
if (detectXSS(input)) { /* block */ }
if (detectPathTraversal(input)) { /* block */ }

// Análise completa
const analysis = analyzeInput(input)
// {
//   isSafe: boolean,
//   threats: string[],
//   sanitized: string
// }
```

---

## ⚡ CHECKLIST RÁPIDO

```bash
# Antes de ir para produção
✅ JWT_SECRET definido (32+ chars)
✅ CSRF_SECRET definido (32+ chars)
✅ NODE_ENV=production
✅ HTTPS habilitado
✅ npm install validator
✅ Testar rate limiting
✅ Testar CSRF
✅ Revisar logs
```

---

## 🐛 TROUBLESHOOTING

### "JWT_SECRET deve ser definido"
```bash
# Gerar novo secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Adicionar ao .env
```

### "Too many requests"
```typescript
// Resetar rate limit manualmente
import { resetRateLimit } from '@/lib/security'
resetRateLimit('login:ip:192.168.1.100')
```

### "Invalid CSRF token"
```typescript
// Verificar se token está sendo enviado
console.log(request.headers.get('x-csrf-token'))

// Gerar novo token
const token = generateCSRFToken()
```

### Blacklist IP acidental
```typescript
// Remover da blacklist (requer restart)
// Ou esperar expiração automática (24h)
```

---

## 📞 COMANDOS ÚTEIS

```bash
# Ver logs de segurança
npm run dev | grep SECURITY

# Testar rate limiting
for i in {1..10}; do curl http://localhost:3000/api/auth/login -X POST -d '{}'; done

# Verificar headers
curl -I http://localhost:3000

# Gerar secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Audit de dependências
npm audit
npm audit fix
```

---

## 🔗 LINKS ÚTEIS

- [SECURITY_REPORT.md](./SECURITY_REPORT.md) - Relatório completo
- [SECURITY_SETUP_GUIDE.md](./SECURITY_SETUP_GUIDE.md) - Guia detalhado
- [SECURITY_CHANGELOG.md](./SECURITY_CHANGELOG.md) - Histórico de mudanças

---

**Copie e cole os snippets acima!** 🚀

