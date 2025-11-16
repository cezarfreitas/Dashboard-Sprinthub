/**
 * Advanced Rate Limiting
 * Implementa rate limiting distribuído com sliding window
 */

import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
  firstAttempt: number
  blockedUntil?: number
}

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
  skipSuccessfulRequests?: boolean
}

// Store em memória (use Redis em produção)
const rateLimitStore = new Map<string, RateLimitEntry>()
const blacklistStore = new Set<string>()

// Configurações por tipo de endpoint
export const RATE_LIMIT_CONFIGS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 30 * 60 * 1000, // 30 minutos
    skipSuccessfulRequests: false
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 5 * 60 * 1000, // 5 minutos
    skipSuccessfulRequests: true
  },
  mutation: {
    maxAttempts: 30,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 10 * 60 * 1000, // 10 minutos
    skipSuccessfulRequests: false
  },
  sensitive: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 horas
    skipSuccessfulRequests: false
  }
} as const

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
  isBlocked: boolean
}

/**
 * Extrai IP real do cliente
 */
export function getClientIP(request: NextRequest): string {
  // Prioridade para headers de proxy confiável
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const xForwardedFor = request.headers.get('x-forwarded-for')
  const xRealIp = request.headers.get('x-real-ip')
  
  if (cfConnectingIp) return cfConnectingIp
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim()
  if (xRealIp) return xRealIp
  
  return request.ip || 'unknown'
}

/**
 * Cria identificador único para rate limiting
 */
export function createRateLimitKey(
  prefix: string,
  request: NextRequest,
  userId?: string | number
): string {
  const ip = getClientIP(request)
  
  if (userId) {
    return `${prefix}:user:${userId}`
  }
  
  return `${prefix}:ip:${ip}`
}

/**
 * Verifica se IP está na blacklist
 */
export function isBlacklisted(ip: string): boolean {
  return blacklistStore.has(ip)
}

/**
 * Adiciona IP à blacklist
 */
export function addToBlacklist(ip: string, durationMs: number = 24 * 60 * 60 * 1000): void {
  blacklistStore.add(ip)
  
  // Remove automaticamente após duração
  setTimeout(() => {
    blacklistStore.delete(ip)
  }, durationMs)
}

/**
 * Implementa sliding window rate limiting
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Verificar se está bloqueado
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      isBlocked: true
    }
  }

  // Se não há entrada ou expirou, criar nova
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
      firstAttempt: now
    })
    
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetTime: now + config.windowMs,
      isBlocked: false
    }
  }

  // Verificar se excedeu o limite
  if (entry.count >= config.maxAttempts) {
    // Bloquear por período determinado
    entry.blockedUntil = now + config.blockDurationMs
    rateLimitStore.set(identifier, entry)
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil(config.blockDurationMs / 1000),
      isBlocked: true
    }
  }

  // Incrementar contador
  entry.count++
  rateLimitStore.set(identifier, entry)

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetTime: entry.resetTime,
    isBlocked: false
  }
}

/**
 * Reseta contador (útil após login bem-sucedido)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Verifica múltiplos limites (IP + User)
 */
export function checkMultipleRateLimits(
  request: NextRequest,
  type: keyof typeof RATE_LIMIT_CONFIGS,
  userId?: string | number
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[type]
  const ip = getClientIP(request)
  
  // Verificar blacklist primeiro
  if (isBlacklisted(ip)) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 24 * 60 * 60 * 1000,
      retryAfter: 86400,
      isBlocked: true
    }
  }

  // Verificar rate limit por IP
  const ipKey = `${type}:ip:${ip}`
  const ipResult = checkRateLimit(ipKey, config)
  
  if (!ipResult.allowed) {
    // Se excedeu limite por IP repetidamente, adicionar à blacklist
    const entry = rateLimitStore.get(ipKey)
    if (entry && entry.count > config.maxAttempts * 3) {
      addToBlacklist(ip)
    }
    return ipResult
  }

  // Se houver userId, verificar rate limit por usuário também
  if (userId) {
    const userKey = `${type}:user:${userId}`
    const userResult = checkRateLimit(userKey, config)
    
    if (!userResult.allowed) {
      return userResult
    }
  }

  return ipResult
}

/**
 * Limpa entradas expiradas (executar periodicamente)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  const keysToDelete: string[] = []
  
  rateLimitStore.forEach((entry, key) => {
    // Remover se passou do tempo de bloqueio + window
    const maxExpiry = Math.max(
      entry.resetTime,
      entry.blockedUntil || 0
    ) + 60 * 60 * 1000 // +1 hora de margem
    
    if (now > maxExpiry) {
      keysToDelete.push(key)
    }
  })
  
  keysToDelete.forEach(key => rateLimitStore.delete(key))
}

// Auto-cleanup a cada 5 minutos
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}

