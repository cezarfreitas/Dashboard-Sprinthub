/**
 * Security Module - Central Export
 * 
 * Exporta todas as funcionalidades de segurança do sistema
 */

// Headers
export {
  getSecurityHeaders,
  getCSP,
  applySecurityHeaders,
  getAPISecurityHeaders
} from './headers'

// CSRF Protection
export {
  generateCSRFToken,
  validateCSRFToken,
  extractCSRFToken,
  verifyCSRF
} from './csrf'

// Rate Limiting
export {
  checkRateLimit,
  checkMultipleRateLimits,
  resetRateLimit,
  getClientIP,
  createRateLimitKey,
  isBlacklisted,
  addToBlacklist,
  cleanupExpiredEntries,
  RATE_LIMIT_CONFIGS
} from './rate-limit-advanced'

// Audit Logging
export {
  logSecurityEvent,
  extractRequestContext,
  logLoginSuccess,
  logLoginFailure,
  logRateLimitExceeded,
  logCSRFViolation,
  logSuspiciousInput,
  logSQLInjectionAttempt,
  getSecurityEvents,
  getSecurityStats,
  SecurityEventType,
  SecurityEventSeverity
} from './audit-log'

// Input Sanitization
export {
  sanitizeHTML,
  sanitizeString,
  detectSQLInjection,
  detectXSS,
  detectPathTraversal,
  validateEmail,
  validateURL,
  validateUsername,
  validateNumeric,
  validateDate,
  analyzeInput,
  sanitizeObject,
  validatePasswordStrength
} from './input-sanitization'

// Types
export type { SecurityHeaders } from './headers'
export type { RateLimitResult, RateLimitConfig } from './rate-limit-advanced'
export type { SecurityEvent } from './audit-log'
export type { InputAnalysis, PasswordStrength } from './input-sanitization'

