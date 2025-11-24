import { NextRequest, NextResponse } from 'next/server'
import { executeMutation } from '@/lib/database'

export const dynamic = 'force-dynamic'

// DELETE - Remover ausência
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; ausenciaId: string } }
) {
  try {
    const unidadeId = parseInt(params.id)
    const ausenciaId = parseInt(params.ausenciaId)
    
    if (isNaN(unidadeId) || isNaN(ausenciaId)) {
      return NextResponse.json(
        { success: false, message: 'IDs inválidos' },
        { status: 400 }
      )
    }

    // Verificar se a ausência existe e pertence à unidade
    const ausencias = await executeQuery(
      `SELECT id FROM vendedores_ausencias 
       WHERE id = ? AND unidade_id = ?`,
      [ausenciaId, unidadeId]
    ) as any[]

    if (ausencias.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Ausência não encontrada' },
        { status: 404 }
      )
    }

    // Deletar ausência
    await executeQuery(
      `DELETE FROM vendedores_ausencias WHERE id = ?`,
      [ausenciaId]
    )

    return NextResponse.json({
      success: true,
      message: 'Ausência removida com sucesso'
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao remover ausência',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

