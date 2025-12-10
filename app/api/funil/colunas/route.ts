import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar colunas de um funil específico
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const funilId = searchParams.get('funil_id')

    if (!funilId) {
      return NextResponse.json(
        { success: false, message: 'funil_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar colunas do funil ordenadas por sequência
    const colunas = await executeQuery(`
      SELECT 
        id,
        nome_coluna,
        id_funil,
        sequencia,
        total_oportunidades,
        valor_total
      FROM colunas_funil
      WHERE id_funil = ?
      ORDER BY sequencia ASC
    `, [funilId]) as Array<{
      id: number
      nome_coluna: string
      id_funil: number
      sequencia: number
      total_oportunidades: number
      valor_total: number
    }>

    return NextResponse.json({
      success: true,
      colunas
    })

  } catch (error) {
    console.error('❌ Erro ao buscar colunas do funil:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar colunas do funil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

