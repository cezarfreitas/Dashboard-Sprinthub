/**
 * Configurações da Aplicação
 * 
 * Centraliza o acesso às variáveis de ambiente NEXT_PUBLIC_*
 * Garante acesso consistente em client e server components
 * 
 * IMPORTANTE: Variáveis NEXT_PUBLIC_* são substituídas em tempo de build pelo Next.js
 * REQUER: Variáveis de ambiente devem estar definidas no momento do build
 * Sem fallbacks - se a variável não estiver definida, retornará string vazia
 */

/**
 * Título da aplicação exibido no header, sidebar e páginas de login
 * 
 * REQUER: NEXT_PUBLIC_APP_TITLE definida nas variáveis de ambiente
 */
export const APP_TITLE: string = 
  process.env.NEXT_PUBLIC_APP_TITLE || ''

/**
 * URL pública da aplicação
 * 
 * REQUER: NEXT_PUBLIC_APP_URL ou NEXT_PUBLIC_BASE_URL definida nas variáveis de ambiente
 */
export const APP_URL: string = 
  process.env.NEXT_PUBLIC_APP_URL || 
  process.env.NEXT_PUBLIC_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')

/**
 * URL pública do SprintHub CRM
 * 
 * REQUER: NEXT_PUBLIC_URL_PUBLIC definida nas variáveis de ambiente
 */
export const CRM_PUBLIC_URL: string = 
  process.env.NEXT_PUBLIC_URL_PUBLIC || ''

