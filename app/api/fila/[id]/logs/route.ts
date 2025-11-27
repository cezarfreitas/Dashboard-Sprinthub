import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Listar logs de distribuição de uma unidade
export async function GET(
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))

    // Buscar logs da unidade com nomes dos vendedores
    const logs = await executeQuery(
      `SELECT 
        fll.id,
        fll.unidade_id,
        fll.vendedor_id,
        fll.lead_id,
        fll.posicao_fila,
        fll.total_fila,
        fll.owner_anterior,
        fll.distribuido_em,
        CONCAT(v.name, ' ', COALESCE(v.lastName, '')) as vendedor_nome
      FROM fila_leads_log fll
      LEFT JOIN vendedores v ON fll.vendedor_id = v.id
      WHERE fll.unidade_id = ?
      ORDER BY fll.distribuido_em DESC
      LIMIT ? OFFSET ?`,
      [unidadeId, limit, offset]
    ) as any[]

    // Contar total de logs
    const totalResult = await executeQuery(
      `SELECT COUNT(*) as total
       FROM fila_leads_log
       WHERE unidade_id = ?`,
      [unidadeId]
    ) as any[]

    const total = totalResult[0]?.total || 0

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        unidade_id: log.unidade_id,
        vendedor_id: log.vendedor_id,
        vendedor_nome: log.vendedor_nome?.trim() || null,
        lead_id: log.lead_id,
        posicao_fila: log.posicao_fila,
        total_fila: log.total_fila,
        owner_anterior: log.owner_anterior,
        distribuido_em: log.distribuido_em
      })),
      total,
      limit,
      offset
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar logs',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}





