/**
 * Security Headers Configuration
 * Implementa headers de segurança HTTP seguindo OWASP guidelines
 */

export interface SecurityHeaders {
  'Content-Security-Policy': string
  'X-Frame-Options': string
  'X-Content-Type-Options': string
  'Referrer-Policy': string
  'Permissions-Policy': string
  'X-DNS-Prefetch-Control': string
  'Strict-Transport-Security': string
  'X-XSS-Protection': string
}

/**
 * Content Security Policy (CSP)
 * Previne XSS, clickjacking e outros ataques de injeção de código
 */
export function getCSP(nonce?: string): string {
  const policies = [
    // Default: apenas do mesmo domínio
    "default-src 'self'",
    
    // Scripts: permitir apenas do mesmo domínio + nonces inline + eval para Next.js
    nonce 
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    
    // Styles: permitir inline para styled-components/Tailwind
    "style-src 'self' 'unsafe-inline'",
    
    // Images: permitir do mesmo domínio, data URIs e blob
    "img-src 'self' data: blob: https:",
    
    // Fonts: permitir do mesmo domínio e data URIs
    "font-src 'self' data:",
    
    // Connect (API calls): permitir mesmo domínio
    "connect-src 'self'",
    
    // Media: permitir do mesmo domínio
    "media-src 'self'",
    
    // Objects: bloquear
    "object-src 'none'",
    
    // Base URI: restringir ao mesmo domínio
    "base-uri 'self'",
    
    // Form actions: restringir ao mesmo domínio
    "form-action 'self'",
    
    // Frame ancestors: prevenir clickjacking
    "frame-ancestors 'none'",
    
    // Upgrade insecure requests em produção
    process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests' : '',
  ].filter(Boolean)

  return policies.join('; ')
}

/**
 * Gera todos os security headers
 */
export function getSecurityHeaders(nonce?: string): SecurityHeaders {
  return {
    // Content Security Policy
    'Content-Security-Policy': getCSP(nonce),
    
    // Previne clickjacking
    'X-Frame-Options': 'DENY',
    
    // Previne MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Controla informações de referrer
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (antes Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()'
    ].join(', '),
    
    // Desabilita DNS prefetching para privacidade
    'X-DNS-Prefetch-Control': 'off',
    
    // HSTS: Force HTTPS por 2 anos (apenas em produção)
    'Strict-Transport-Security': process.env.NODE_ENV === 'production'
      ? 'max-age=63072000; includeSubDomains; preload'
      : 'max-age=0',
    
    // XSS Protection (legado mas ainda útil)
    'X-XSS-Protection': '1; mode=block',
  }
}

/**
 * Aplica headers de segurança em uma Response
 */
export function applySecurityHeaders(response: Response, nonce?: string): Response {
  const headers = getSecurityHeaders(nonce)
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * Headers específicos para APIs
 */
export function getAPISecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
}

