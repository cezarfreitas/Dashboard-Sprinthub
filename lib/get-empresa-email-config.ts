import { executeQuery } from '@/lib/database'

export interface EmpresaEmailConfig {
  nome: string
  logotipo: string
  corPrincipal: string
}

function normalizeLogoUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  // Se já é uma URL completa (http/https), retornar como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Se começa com /uploads/logos/, converter para /api/uploads/logos/
  if (url.startsWith('/uploads/logos/')) {
    return url.replace('/uploads/logos/', '/api/uploads/logos/')
  }
  
  // Se já começa com /api/uploads/logos/, retornar como está
  if (url.startsWith('/api/uploads/logos/')) {
    return url
  }
  
  // Para qualquer outro caminho relativo, retornar como está
  return url
}

export async function getEmpresaEmailConfig(): Promise<EmpresaEmailConfig> {
  try {
    const configuracoes = await executeQuery(
      `SELECT chave, valor FROM configuracoes 
       WHERE chave IN ('empresa_nome', 'empresa_logotipo', 'empresa_cor_principal')`
    ) as Array<{ chave: string; valor: string | null }>

    const configMap: Record<string, string> = {}
    configuracoes.forEach((config) => {
      configMap[config.chave] = config.valor || ''
    })

    return {
      nome: configMap['empresa_nome'] || process.env.NEXT_PUBLIC_APP_TITLE || 'Sistema',
      logotipo: normalizeLogoUrl(configMap['empresa_logotipo']),
      corPrincipal: configMap['empresa_cor_principal'] || '#000000'
    }
  } catch (error) {
    return {
      nome: process.env.NEXT_PUBLIC_APP_TITLE || 'Sistema',
      logotipo: '',
      corPrincipal: '#000000'
    }
  }
}

