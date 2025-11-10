import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id_funil = searchParams.get('id_funil')
    const search = searchParams.get('search') || ''
    
    // Verificar se a tabela existe
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'colunas_funil'
    `) as any[]

    if (tableExists[0]?.count === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela de colunas de funil não existe. Execute a sincronização primeiro.',
        colunas: [],
        stats: {
          total: 0
        }
      }, { status: 404 })
    }

    // Construir query com filtros
    let whereClause = '1=1'
    const queryParams: any[] = []

    if (id_funil) {
      whereClause += ` AND id_funil = ?`
      queryParams.push(parseInt(id_funil))
    }

    if (search) {
      whereClause += ` AND nome_coluna LIKE ?`
      queryParams.push(`%${search}%`)
    }

    // Buscar colunas de funil
    const colunasQuery = `
      SELECT id, nome_coluna, id_funil, total_oportunidades, valor_total, sequencia, created_at, updated_at
      FROM colunas_funil 
      WHERE ${whereClause}
      ORDER BY id_funil ASC, sequencia ASC
    `
    
    const colunas = await executeQuery(colunasQuery, queryParams)

    // Estatísticas
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM colunas_funil') as any[]
    const funisResult = await executeQuery('SELECT COUNT(DISTINCT id_funil) as total_funis FROM colunas_funil') as any[]
    
    const stats = {
      total: totalResult[0]?.total || 0,
      total_funis: funisResult[0]?.total_funis || 0
    }

    return NextResponse.json({
      success: true,
      colunas,
      stats
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar colunas de funil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

