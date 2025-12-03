import { executeQuery } from '@/lib/database'

export interface EmpresaEmailConfig {
  nome: string
  logotipo: string
  corPrincipal: string
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
      logotipo: configMap['empresa_logotipo'] || '',
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

