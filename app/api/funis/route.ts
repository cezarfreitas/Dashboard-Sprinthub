import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    
    // Verificar se a tabela existe
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'funis'
    `) as any[]

    if (tableExists[0]?.count === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela de funis não existe. Execute a sincronização primeiro.',
        funis: [],
        stats: {
          total: 0
        }
      }, { status: 404 })
    }

    // Construir query com filtros
    let whereClause = '1=1'
    const queryParams: any[] = []

    if (search) {
      whereClause += ` AND funil_nome LIKE ?`
      queryParams.push(`%${search}%`)
    }

    // Buscar funis
    const funisQuery = `
      SELECT id, funil_nome, created_at, updated_at
      FROM funis 
      WHERE ${whereClause}
      ORDER BY funil_nome ASC
    `
    
    const funis = await executeQuery(funisQuery, queryParams)

    // Estatísticas
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM funis') as any[]
    
    const stats = {
      total: totalResult[0]?.total || 0
    }

    return NextResponse.json({
      success: true,
      funis,
      stats
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar funis',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

