// Validações de segurança para entrada de dados

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Sanitizar string removendo caracteres perigosos
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remover caracteres HTML perigosos
    .replace(/[;()]/g, '') // Remover caracteres SQL perigosos
    .substring(0, 100) // Limitar tamanho
}

// Validar username
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = []

  if (!username || username.length === 0) {
    errors.push('Username é obrigatório')
  }

  if (username.length < 3) {
    errors.push('Username deve ter pelo menos 3 caracteres')
  }

  if (username.length > 50) {
    errors.push('Username deve ter no máximo 50 caracteres')
  }

  // Apenas letras, números e underscore
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username deve conter apenas letras, números e underscore')
  }

  // Não pode começar com número
  if (/^[0-9]/.test(username)) {
    errors.push('Username não pode começar com número')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validar senha
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = []

  if (!password || password.length === 0) {
    errors.push('Senha é obrigatória')
  }

  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres')
  }

  if (password.length > 128) {
    errors.push('Senha deve ter no máximo 128 caracteres')
  }

  // Verificar se não é uma senha comum
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ]

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Senha muito comum. Escolha uma senha mais segura')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validar dados de login
export function validateLoginData(username: string, password: string): ValidationResult {
  const usernameValidation = validateUsername(username)
  const passwordValidation = validatePassword(password)

  const allErrors = [
    ...usernameValidation.errors,
    ...passwordValidation.errors
  ]

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}

// Detectar tentativas suspeitas
export function detectSuspiciousActivity(username: string, password: string): string[] {
  const warnings: string[] = []

  // Muitos caracteres especiais
  const specialCharCount = (password.match(/[^a-zA-Z0-9]/g) || []).length
  if (specialCharCount > 10) {
    warnings.push('Senha com muitos caracteres especiais')
  }

  // Sequências numéricas
  if (/\d{4,}/.test(password)) {
    warnings.push('Senha contém sequência numérica longa')
  }

  // Palavras comuns
  const commonWords = ['admin', 'user', 'test', 'demo', 'guest']
  if (commonWords.some(word => username.toLowerCase().includes(word))) {
    warnings.push('Username contém palavra comum')
  }

  return warnings
}
