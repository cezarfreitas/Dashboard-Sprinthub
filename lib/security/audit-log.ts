/**
 * Security Audit Logging
 * Sistema de logging de eventos de segurança
 */

import { NextRequest } from 'next/server'
import { getClientIP } from './rate-limit-advanced'

export enum SecurityEventType {
  // Autenticação
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  
  // Autorização
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_RESOURCE = 'FORBIDDEN_RESOURCE',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  IP_BLACKLISTED = 'IP_BLACKLISTED',
  
  // CSRF
  CSRF_TOKEN_MISSING = 'CSRF_TOKEN_MISSING',
  CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID',
  
  // Input Validation
  SUSPICIOUS_INPUT = 'SUSPICIOUS_INPUT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  
  // Session
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
  
  // Geral
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

export enum SecurityEventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface SecurityEvent {
  timestamp: Date
  type: SecurityEventType
  severity: SecurityEventSeverity
  ip: string
  userAgent: string
  userId?: string | number
  username?: string
  path: string
  method: string
  details?: Record<string, unknown>
  message: string
}

// Store em memória (use banco de dados em produção)
const auditLog: SecurityEvent[] = []
const MAX_LOG_SIZE = 10000

/**
 * Registra evento de segurança
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  }
  
  // Adicionar ao log
  auditLog.push(fullEvent)
  
  // Limitar tamanho do log
  if (auditLog.length > MAX_LOG_SIZE) {
    auditLog.shift()
  }
  
  // Log estruturado no console
  const logMethod = getSeverityLogMethod(event.severity)
  logMethod(`[SECURITY:${event.type}]`, {
    timestamp: fullEvent.timestamp.toISOString(),
    severity: event.severity,
    ip: event.ip,
    user: event.userId || event.username || 'anonymous',
    path: event.path,
    method: event.method,
    message: event.message,
    ...(event.details || {})
  })
  
  // Em produção, enviar para sistema de logging centralizado
  if (process.env.NODE_ENV === 'production') {
    // sendToLogService(fullEvent)
  }
}

/**
 * Helper para obter método de log baseado na severidade
 */
function getSeverityLogMethod(severity: SecurityEventSeverity): typeof console.log {
  switch (severity) {
    case SecurityEventSeverity.CRITICAL:
    case SecurityEventSeverity.ERROR:
      return console.error
    case SecurityEventSeverity.WARNING:
      return console.warn
    default:
      return console.info
  }
}

/**
 * Extrai informações de contexto do request
 */
export function extractRequestContext(request: NextRequest) {
  return {
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
  }
}

/**
 * Log de tentativa de login bem-sucedida
 */
export function logLoginSuccess(request: NextRequest, userId: number, username: string): void {
  const context = extractRequestContext(request)
  logSecurityEvent({
    type: SecurityEventType.LOGIN_SUCCESS,
    severity: SecurityEventSeverity.INFO,
    ...context,
    userId,
    username,
    message: `Login bem-sucedido para usuário ${username}`,
  })
}

/**
 * Log de tentativa de login falhada
 */
export function logLoginFailure(request: NextRequest, username: string, reason: string): void {
  const context = extractRequestContext(request)
  logSecurityEvent({
    type: SecurityEventType.LOGIN_FAILURE,
    severity: SecurityEventSeverity.WARNING,
    ...context,
    username,
    message: `Falha no login para usuário ${username}: ${reason}`,
    details: { reason },
  })
}

/**
 * Log de rate limit excedido
 */
export function logRateLimitExceeded(
  request: NextRequest,
  identifier: string,
  attempts: number
): void {
  const context = extractRequestContext(request)
  logSecurityEvent({
    type: SecurityEventType.RATE_LIMIT_EXCEEDED,
    severity: SecurityEventSeverity.WARNING,
    ...context,
    message: `Rate limit excedido para ${identifier}`,
    details: { identifier, attempts },
  })
}

/**
 * Log de tentativa de CSRF
 */
export function logCSRFViolation(request: NextRequest, reason: string): void {
  const context = extractRequestContext(request)
  logSecurityEvent({
    type: SecurityEventType.CSRF_TOKEN_INVALID,
    severity: SecurityEventSeverity.ERROR,
    ...context,
    message: `Violação de CSRF: ${reason}`,
    details: { reason },
  })
}

/**
 * Log de input suspeito
 */
export function logSuspiciousInput(
  request: NextRequest,
  inputType: string,
  pattern: string
): void {
  const context = extractRequestContext(request)
  logSecurityEvent({
    type: SecurityEventType.SUSPICIOUS_INPUT,
    severity: SecurityEventSeverity.WARNING,
    ...context,
    message: `Input suspeito detectado: ${inputType}`,
    details: { inputType, pattern },
  })
}

/**
 * Log de tentativa de SQL injection
 */
export function logSQLInjectionAttempt(
  request: NextRequest,
  input: string
): void {
  const context = extractRequestContext(request)
  logSecurityEvent({
    type: SecurityEventType.SQL_INJECTION_ATTEMPT,
    severity: SecurityEventSeverity.CRITICAL,
    ...context,
    message: 'Tentativa de SQL Injection detectada',
    details: { input: input.substring(0, 100) }, // Limitar tamanho
  })
}

/**
 * Obtém eventos de segurança (para dashboard de admin)
 */
export function getSecurityEvents(
  limit: number = 100,
  severity?: SecurityEventSeverity
): SecurityEvent[] {
  let events = [...auditLog]
  
  if (severity) {
    events = events.filter(e => e.severity === severity)
  }
  
  return events
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit)
}

/**
 * Obtém estatísticas de segurança
 */
export function getSecurityStats() {
  const now = Date.now()
  const last24h = now - 24 * 60 * 60 * 1000
  const last1h = now - 60 * 60 * 1000
  
  const recentEvents = auditLog.filter(e => e.timestamp.getTime() > last24h)
  const veryRecentEvents = auditLog.filter(e => e.timestamp.getTime() > last1h)
  
  return {
    total: auditLog.length,
    last24h: recentEvents.length,
    last1h: veryRecentEvents.length,
    byType: Object.values(SecurityEventType).map(type => ({
      type,
      count: recentEvents.filter(e => e.type === type).length
    })).filter(s => s.count > 0),
    bySeverity: Object.values(SecurityEventSeverity).map(severity => ({
      severity,
      count: recentEvents.filter(e => e.severity === severity).length
    })),
    topIPs: getTopIPs(recentEvents, 10),
  }
}

/**
 * Helper para obter IPs com mais eventos
 */
function getTopIPs(events: SecurityEvent[], limit: number) {
  const ipCounts = new Map<string, number>()
  
  events.forEach(event => {
    ipCounts.set(event.ip, (ipCounts.get(event.ip) || 0) + 1)
  })
  
  return Array.from(ipCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ip, count]) => ({ ip, count }))
}

