import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeMutation } from '@/lib/database'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

// GET - Buscar configurações da empresa
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'seu-secret-super-secreto'
    )

    await jwtVerify(token, secret)

    const configuracoes = await executeQuery(
      `SELECT chave, valor FROM configuracoes 
       WHERE chave IN ('empresa_nome', 'empresa_email', 'empresa_descricao', 'empresa_logotipo', 'empresa_cor_principal')`
    ) as Array<{ chave: string; valor: string | null }>

    const configMap: Record<string, string> = {}
    configuracoes.forEach((config) => {
      configMap[config.chave] = config.valor || ''
    })

    return NextResponse.json({
      success: true,
      config: {
        nome: configMap['empresa_nome'] || '',
        email: configMap['empresa_email'] || '',
        descricao: configMap['empresa_descricao'] || '',
        logotipo: configMap['empresa_logotipo'] || '',
        corPrincipal: configMap['empresa_cor_principal'] || '#3b82f6'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar configurações',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configurações da empresa
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'seu-secret-super-secreto'
    )

    await jwtVerify(token, secret)

    const body = await request.json()
    const { nome, email, descricao, logotipo, corPrincipal } = body

    // Função auxiliar para salvar/atualizar configuração
    const saveConfig = async (chave: string, valor: string, descricao: string) => {
      const existing = await executeQuery(
        'SELECT id FROM configuracoes WHERE chave = ?',
        [chave]
      ) as Array<{ id: number }>

      if (existing.length > 0) {
        await executeMutation(
          'UPDATE configuracoes SET valor = ?, updated_at = NOW() WHERE chave = ?',
          [valor, chave]
        )
      } else {
        await executeMutation(
          'INSERT INTO configuracoes (chave, valor, descricao, tipo) VALUES (?, ?, ?, ?)',
          [chave, valor, descricao, 'string']
        )
      }
    }

    // Salvar cada configuração
    if (nome !== undefined) {
      await saveConfig('empresa_nome', nome, 'Nome da empresa')
    }
    if (email !== undefined) {
      await saveConfig('empresa_email', email, 'Email da empresa')
    }
    if (descricao !== undefined) {
      await saveConfig('empresa_descricao', descricao, 'Descrição da empresa')
    }
    if (logotipo !== undefined) {
      await saveConfig('empresa_logotipo', logotipo, 'URL do logotipo da empresa')
    }
    if (corPrincipal !== undefined) {
      await saveConfig('empresa_cor_principal', corPrincipal, 'Cor principal da empresa')
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao atualizar configurações',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

