import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// PUT - Atualizar sequência dos vendedores na unidade
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { unidade_id, vendedores_sequencia } = body

    if (!unidade_id || !vendedores_sequencia || !Array.isArray(vendedores_sequencia)) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade e lista de sequência são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a unidade existe
    const unidade = await executeQuery(
      'SELECT id FROM unidades WHERE id = ?',
      [unidade_id]
    ) as any[]

    if (unidade.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar sequência de cada vendedor
    for (let i = 0; i < vendedores_sequencia.length; i++) {
      const vendedor_id = vendedores_sequencia[i]
      const nova_sequencia = i + 1

      await executeQuery(
        'UPDATE vendedores_unidades SET sequencia = ? WHERE vendedor_id = ? AND unidade_id = ?',
        [nova_sequencia, vendedor_id, unidade_id]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sequência atualizada com sucesso!'
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar sequência:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao atualizar sequência',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
