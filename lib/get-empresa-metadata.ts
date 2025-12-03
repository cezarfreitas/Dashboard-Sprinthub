import { executeQuery } from '@/lib/database'

export interface EmpresaMetadata {
  title: string
  description: string
}

export async function getEmpresaMetadata(): Promise<EmpresaMetadata> {
  try {
    const configuracoes = await executeQuery(
      `SELECT chave, valor FROM configuracoes 
       WHERE chave IN ('empresa_nome', 'empresa_descricao')`
    ) as Array<{ chave: string; valor: string | null }>

    const configMap: Record<string, string> = {}
    configuracoes.forEach((config) => {
      configMap[config.chave] = config.valor || ''
    })

    return {
      title: configMap['empresa_nome'] || '',
      description: configMap['empresa_descricao'] || ''
    }
  } catch (error) {
    return {
      title: '',
      description: ''
    }
  }
}

