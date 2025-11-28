/**
 * Sistema de Versionamento Automático
 * Atualizado automaticamente a cada build via Git SHA e timestamp
 */

export interface AppVersion {
  version: string        // Versão do package.json
  buildNumber: string    // SHA curto do Git commit
  buildDate: string      // Data/hora do build
  environment: string    // development | production
}

/**
 * Obtém informações de versão da aplicação
 * Usa variáveis de ambiente injetadas durante o build
 */
export function getAppVersion(): AppVersion {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'
  const buildNumber = process.env.NEXT_PUBLIC_BUILD_SHA || 'dev'
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString()
  const environment = process.env.NODE_ENV || 'development'

  return {
    version,
    buildNumber,
    buildDate,
    environment
  }
}

/**
 * Formata a versão para exibição
 * Exemplo: "v0.1.0 (abc123f) - 27/11/2024 19:45"
 */
export function formatVersion(appVersion: AppVersion): string {
  const date = new Date(appVersion.buildDate)
  const formattedDate = date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `v${appVersion.version} (${appVersion.buildNumber}) - ${formattedDate}`
}

/**
 * Versão curta para exibição compacta
 * Exemplo: "v0.1.0-abc123f"
 */
export function formatVersionShort(appVersion: AppVersion): string {
  return `v${appVersion.version}-${appVersion.buildNumber}`
}



