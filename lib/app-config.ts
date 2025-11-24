/**
 * Configurações da Aplicação
 * 
 * Centraliza o acesso às variáveis de ambiente NEXT_PUBLIC_*
 * Garante fallbacks apropriados e acesso consistente em client e server components
 * 
 * IMPORTANTE: Variáveis NEXT_PUBLIC_* são substituídas em tempo de build pelo Next.js
 * Se não estiverem definidas no momento do build, usarão o fallback abaixo
 */

/**
 * Título da aplicação exibido no header, sidebar e páginas de login
 * 
 * Fallback em ordem de prioridade:
 * 1. NEXT_PUBLIC_APP_TITLE (variável de ambiente - substituída no build)
 * 2. 'GrupoInteli' (valor padrão da aplicação)
 */
export const APP_TITLE: string = 
  process.env.NEXT_PUBLIC_APP_TITLE || 
  'GrupoInteli'

/**
 * URL pública da aplicação
 */
export const APP_URL: string = 
  process.env.NEXT_PUBLIC_APP_URL || 
  process.env.NEXT_PUBLIC_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

/**
 * URL pública do SprintHub CRM
 */
export const CRM_PUBLIC_URL: string = 
  process.env.NEXT_PUBLIC_URL_PUBLIC || 
  'https://grupointeli.sprinthub.app'

