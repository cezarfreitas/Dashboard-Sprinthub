import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidades de um vendedor
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedor_id = searchParams.get('vendedor_id')
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')

    if (!vendedor_id) {
      return NextResponse.json(
        { success: false, message: 'vendedor_id é obrigatório' },
        { status: 400 }
      )
    }

    let query = `
      SELECT 
        o.id,
        o.titulo,
        o.valor,
        o.ganho,
        o.perda,
        o.created_date,
        o.motivo_perda,
        c.nome_coluna as coluna_nome
      FROM oportunidades o
      LEFT JOIN colunas c ON o.coluna_id = c.id
      WHERE o.vendedor_id = ?
    `
    const params: any[] = [parseInt(vendedor_id)]

    if (data_inicio) {
      query += ` AND DATE(o.created_date) >= DATE(?)`
      params.push(data_inicio)
    }

    if (data_fim) {
      query += ` AND DATE(o.created_date) <= DATE(?)`
      params.push(data_fim)
    }
    
    console.log('=== API oportunidades/vendedor ===')
    console.log('Vendedor ID:', vendedor_id)
    console.log('Data Início:', data_inicio)
    console.log('Data Fim:', data_fim)

    query += ` ORDER BY o.created_date DESC`

    const oportunidades = await executeQuery(query, params) as any[]

    return NextResponse.json({
      success: true,
      oportunidades: oportunidades
    })

  } catch (error) {
    console.error('Erro ao buscar oportunidades do vendedor:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

