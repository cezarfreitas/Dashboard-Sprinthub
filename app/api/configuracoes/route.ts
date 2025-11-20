import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar configurações
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chave = searchParams.get('chave')

    if (chave) {
      // Buscar configuração específica
      const config = await executeQuery(
        'SELECT * FROM configuracoes WHERE chave = ?',
        [chave]
      ) as any[]

      if (config.length === 0) {
        // Retornar success: false mas com status 200 (não 404)
        // Isso evita erros no console quando a configuração não existe ainda
        return NextResponse.json({
          success: false,
          message: 'Configuração não encontrada',
          configuracao: null
        })
      }

      return NextResponse.json({
        success: true,
        configuracao: config[0]
      })
    } else {
      // Buscar todas as configurações
      const configs = await executeQuery(
        'SELECT * FROM configuracoes ORDER BY chave'
      ) as any[]

      return NextResponse.json({
        success: true,
        configuracoes: configs
      })
    }

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar configurações',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configuração
export async function PUT(request: NextRequest) {
  try {
    const { chave, valor } = await request.json()

    if (!chave || valor === undefined) {
      return NextResponse.json(
        { success: false, message: 'Chave e valor são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a configuração existe
    const existingConfig = await executeQuery(
      'SELECT id FROM configuracoes WHERE chave = ?',
      [chave]
    ) as any[]

    if (existingConfig.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar configuração
    await executeQuery(
      'UPDATE configuracoes SET valor = ?, updated_at = NOW() WHERE chave = ?',
      [valor, chave]
    )

    // Buscar configuração atualizada
    const updatedConfig = await executeQuery(
      'SELECT * FROM configuracoes WHERE chave = ?',
      [chave]
    ) as any[]

    return NextResponse.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      configuracao: updatedConfig[0]
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao atualizar configuração',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// POST - Criar nova configuração
export async function POST(request: NextRequest) {
  try {
    const { chave, valor, descricao, tipo = 'string' } = await request.json()

    if (!chave || valor === undefined) {
      return NextResponse.json(
        { success: false, message: 'Chave e valor são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a configuração já existe
    const existingConfig = await executeQuery(
      'SELECT id FROM configuracoes WHERE chave = ?',
      [chave]
    ) as any[]

    if (existingConfig.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Configuração já existe' },
        { status: 409 }
      )
    }

    // Criar nova configuração
    const result = await executeQuery(
      'INSERT INTO configuracoes (chave, valor, descricao, tipo) VALUES (?, ?, ?, ?)',
      [chave, valor, descricao, tipo]
    ) as any

    // Buscar configuração criada
    const newConfig = await executeQuery(
      'SELECT * FROM configuracoes WHERE id = ?',
      [result.insertId]
    ) as any[]

    return NextResponse.json({
      success: true,
      message: 'Configuração criada com sucesso',
      configuracao: newConfig[0]
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao criar configuração',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
