import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Buscar configurações públicas da empresa (sem autenticação)
export async function GET(request: NextRequest) {
  try {
    const configuracoes = await executeQuery(
      `SELECT chave, valor FROM configuracoes 
       WHERE chave IN ('empresa_nome', 'empresa_logotipo', 'empresa_cor_principal')`
    ) as Array<{ chave: string; valor: string | null }>

    const configMap: Record<string, string> = {}
    configuracoes.forEach((config) => {
      configMap[config.chave] = config.valor || ''
    })

    const response = NextResponse.json({
      success: true,
      config: {
        nome: configMap['empresa_nome'] || 'Grupo Inteli',
        logotipo: configMap['empresa_logotipo'] || '',
        corPrincipal: configMap['empresa_cor_principal'] || '#3b82f6'
      }
    })

    // Headers para cache imediato no cliente
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    
    return response

  } catch (error) {
    console.error('[API] Erro ao buscar configurações da empresa:', error)
    
    // Retornar configuração padrão mesmo em caso de erro
    // Isso garante que o site funcione mesmo sem banco de dados
    return NextResponse.json(
      { 
        success: true,
        config: {
          nome: 'Grupo Inteli',
          logotipo: '',
          corPrincipal: '#3b82f6'
        },
        fallback: true
      },
      { status: 200 }
    )
  }
}

