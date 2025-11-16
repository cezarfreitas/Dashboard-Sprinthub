/**
 * CSRF Protection
 * Implementa proteção contra Cross-Site Request Forgery
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-min-32-chars-long!'
const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hora

interface CSRFToken {
  token: string
  timestamp: number
}

/**
 * Gera um token CSRF único
 */
export function generateCSRFToken(): string {
  const randomToken = randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const timestamp = Date.now()
  
  const payload = `${randomToken}:${timestamp}`
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex')
  
  return `${payload}:${signature}`
}

/**
 * Valida um token CSRF
 */
export function validateCSRFToken(token: string): boolean {
  try {
    if (!token || typeof token !== 'string') {
      return false
    }

    const parts = token.split(':')
    if (parts.length !== 3) {
      return false
    }

    const [randomToken, timestampStr, signature] = parts
    const timestamp = parseInt(timestampStr, 10)

    // Verificar se o timestamp é válido
    if (isNaN(timestamp)) {
      return false
    }

    // Verificar expiração
    const now = Date.now()
    if (now - timestamp > CSRF_TOKEN_EXPIRY) {
      return false
    }

    // Verificar assinatura
    const payload = `${randomToken}:${timestamp}`
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex')

    // Usar timing-safe comparison
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * Extrai token CSRF de headers ou body
 */
export function extractCSRFToken(request: Request): string | null {
  // Tentar pegar do header primeiro
  const headerToken = request.headers.get('x-csrf-token') || 
                      request.headers.get('X-CSRF-Token')
  
  if (headerToken) {
    return headerToken
  }

  return null
}

/**
 * Middleware para verificar CSRF em requests que modificam dados
 */
export async function verifyCSRF(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase()
  
  // CSRF apenas necessário para métodos que modificam dados
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true
  }

  const token = extractCSRFToken(request)
  
  if (!token) {
    return false
  }

  return validateCSRFToken(token)
}

