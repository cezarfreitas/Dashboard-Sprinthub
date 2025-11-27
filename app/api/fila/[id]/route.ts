import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// PUT - Atualizar fila de vendedores de uma unidade
export async function PUT(
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
    const { vendedores } = body

    if (!Array.isArray(vendedores)) {
      return NextResponse.json(
        { success: false, message: 'Lista de vendedores inválida' },
        { status: 400 }
      )
    }

    // Validar estrutura dos vendedores
    const vendedoresValidos = vendedores.every(v => 
      typeof v.id === 'number' &&
      typeof v.nome === 'string' &&
      typeof v.sequencia === 'number'
    )

    if (!vendedoresValidos) {
      return NextResponse.json(
        { success: false, message: 'Estrutura de vendedores inválida' },
        { status: 400 }
      )
    }

    // Atualizar fila_leads na unidade
    await executeQuery(
      `UPDATE unidades 
       SET fila_leads = ?, 
           updated_at = NOW() 
       WHERE id = ?`,
      [JSON.stringify(vendedores), unidadeId]
    )

    return NextResponse.json({
      success: true,
      message: 'Fila de vendedores atualizada com sucesso'
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao atualizar fila de vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}





