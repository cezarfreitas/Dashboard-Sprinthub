import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// PUT - Toggle status ativo do vendedor na unidade
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendedor_id, unidade_id } = body

    if (!vendedor_id || !unidade_id) {
      return NextResponse.json(
        { success: false, message: 'ID do vendedor e ID da unidade são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o relacionamento existe
    const relacionamento = await executeQuery(
      'SELECT ativo FROM vendedores_unidades WHERE vendedor_id = ? AND unidade_id = ?',
      [vendedor_id, unidade_id]
    ) as any[]

    if (relacionamento.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado nesta unidade' },
        { status: 404 }
      )
    }

    // Toggle do status ativo
    const novoStatus = !relacionamento[0].ativo

    if (!novoStatus) {
      // Se está desativando, mover para o final da sequência
      const maxSequencia = await executeQuery(
        'SELECT COALESCE(MAX(sequencia), 0) as max_seq FROM vendedores_unidades WHERE unidade_id = ?',
        [unidade_id]
      ) as any[]

      const novaSequencia = maxSequencia[0].max_seq + 1

      await executeQuery(
        'UPDATE vendedores_unidades SET ativo = ?, sequencia = ? WHERE vendedor_id = ? AND unidade_id = ?',
        [novoStatus, novaSequencia, vendedor_id, unidade_id]
      )

      // Reordenar vendedores ativos restantes (compactar sequências)
      await executeQuery(`
        UPDATE vendedores_unidades vu1
        SET sequencia = (
          SELECT COUNT(*) + 1
          FROM vendedores_unidades vu2
          WHERE vu2.unidade_id = vu1.unidade_id
            AND vu2.ativo = 1
            AND vu2.sequencia < vu1.sequencia
        )
        WHERE vu1.unidade_id = ? AND vu1.ativo = 1
      `, [unidade_id])

    } else {
      // Se está ativando, apenas atualizar o status
      await executeQuery(
        'UPDATE vendedores_unidades SET ativo = ? WHERE vendedor_id = ? AND unidade_id = ?',
        [novoStatus, vendedor_id, unidade_id]
      )
    }

    return NextResponse.json({
      success: true,
      message: novoStatus ? 'Vendedor ativado na fila' : 'Vendedor desativado da fila',
      ativo: novoStatus
    })

  } catch (error) {
    console.error('❌ Erro ao toggle status do vendedor:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao alterar status do vendedor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
