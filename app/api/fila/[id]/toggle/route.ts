import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// PATCH - Alternar status ativo/inativo da fila de uma unidade
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unidadeId = parseInt(params.id)
    
    if (isNaN(unidadeId)) {
      return NextResponse.json(
        { success: false, message: 'ID de unidade inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { ativo } = body

    if (typeof ativo !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Valor de ativo inválido' },
        { status: 400 }
      )
    }

    // Atualizar status da unidade
    await executeQuery(
      `UPDATE unidades 
       SET ativo = ?, 
           updated_at = NOW() 
       WHERE id = ?`,
      [ativo ? 1 : 0, unidadeId]
    )

    return NextResponse.json({
      success: true,
      message: `Fila ${ativo ? 'ativada' : 'desativada'} com sucesso`
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao alternar status da fila',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}





