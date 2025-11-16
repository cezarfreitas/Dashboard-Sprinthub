/**
 * Advanced Input Sanitization
 * Proteção contra XSS, SQL Injection e outros ataques de injeção
 */

import validator from 'validator'

/**
 * Padrões suspeitos para detectar ataques
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /(--|#|\/\*|\*\/|;)/g,
  /('|")\s*(OR|AND)\s*('|")\s*=/gi,
]

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+src[^>]*>/gi,
]

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.(\/|\\)/g,
  /%2e%2e/gi,
  /%252e%252e/gi,
]

/**
 * Sanitiza string removendo HTML perigoso
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return validator.escape(input)
}

/**
 * Sanitiza string removendo apenas caracteres perigosos
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limita tamanho
}

/**
 * Detecta tentativas de SQL Injection
 */
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
}

/**
 * Detecta tentativas de XSS
 */
export function detectXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  return XSS_PATTERNS.some(pattern => pattern.test(input))
}

/**
 * Detecta tentativas de Path Traversal
 */
export function detectPathTraversal(input: string): boolean {
  if (!input || typeof input !== 'string') return false
  
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input))
}

/**
 * Valida email de forma segura
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  
  return validator.isEmail(email, {
    allow_utf8_local_part: false,
    require_tld: true,
  })
}

/**
 * Valida URL de forma segura
 */
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
}

/**
 * Valida username (alfanumérico + underscore)
 */
export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false
  
  return /^[a-zA-Z0-9_]{3,30}$/.test(username)
}

/**
 * Valida se string contém apenas números
 */
export function validateNumeric(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  
  return validator.isNumeric(value)
}

/**
 * Valida formato de data
 */
export function validateDate(date: string): boolean {
  if (!date || typeof date !== 'string') return false
  
  return validator.isISO8601(date)
}

/**
 * Análise completa de input suspeito
 */
export interface InputAnalysis {
  isSafe: boolean
  threats: string[]
  sanitized: string
}

export function analyzeInput(input: string): InputAnalysis {
  const threats: string[] = []
  
  if (detectSQLInjection(input)) {
    threats.push('SQL Injection')
  }
  
  if (detectXSS(input)) {
    threats.push('XSS')
  }
  
  if (detectPathTraversal(input)) {
    threats.push('Path Traversal')
  }
  
  return {
    isSafe: threats.length === 0,
    threats,
    sanitized: sanitizeString(input),
  }
}

/**
 * Valida objeto completo recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as T
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T]
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value as Record<string, unknown>) as T[keyof T]
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      ) as T[keyof T]
    } else {
      sanitized[key as keyof T] = value as T[keyof T]
    }
  }
  
  return sanitized
}

/**
 * Valida força de senha
 */
export interface PasswordStrength {
  isStrong: boolean
  score: number // 0-4
  feedback: string[]
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0
  
  if (!password || password.length < 8) {
    feedback.push('Senha deve ter pelo menos 8 caracteres')
    return { isStrong: false, score: 0, feedback }
  }
  
  // Comprimento
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  
  // Complexidade
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  
  // Feedback
  if (!/[a-z]/.test(password)) feedback.push('Adicione letras minúsculas')
  if (!/[A-Z]/.test(password)) feedback.push('Adicione letras maiúsculas')
  if (!/[0-9]/.test(password)) feedback.push('Adicione números')
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Adicione caracteres especiais')
  
  // Padrões comuns fracos
  const weakPatterns = [
    /^123456/,
    /^password/i,
    /^qwerty/i,
    /^abc123/i,
  ]
  
  if (weakPatterns.some(pattern => pattern.test(password))) {
    feedback.push('Senha muito comum, escolha outra')
    score = Math.max(0, score - 2)
  }
  
  const isStrong = score >= 4 && feedback.length === 0
  
  return { isStrong, score: Math.min(4, score), feedback }
}

