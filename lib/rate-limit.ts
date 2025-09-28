// Rate limiting para prevenir ataques de força bruta
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5, // Máximo 5 tentativas
  windowMs: 15 * 60 * 1000, // 15 minutos
  blockDurationMs: 30 * 60 * 1000 // Bloquear por 30 minutos após exceder limite
}

export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Se não há entrada, permitir
  if (!entry) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetTime: now + config.windowMs
    }
  }

  // Se o tempo de reset passou, resetar contador
  if (now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetTime: now + config.windowMs
    }
  }

  // Se excedeu o limite, bloquear
  if (entry.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }

  // Incrementar contador
  entry.count++
  rateLimitStore.set(identifier, entry)

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetTime: entry.resetTime
  }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

// Limpar entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now()
  const keysToDelete: string[] = []
  
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime + DEFAULT_CONFIG.blockDurationMs) {
      keysToDelete.push(key)
    }
  })
  
  keysToDelete.forEach(key => rateLimitStore.delete(key))
}, 5 * 60 * 1000) // Limpar a cada 5 minutos
