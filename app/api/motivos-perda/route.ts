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
      WHERE table_schema = DATABASE() AND table_name = 'motivos_de_perda'
    `) as any[]

    if (tableExists[0]?.count === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela de motivos de perda não existe. Execute a sincronização primeiro.',
        motivos: [],
        stats: {
          total: 0
        }
      }, { status: 404 })
    }

    // Construir query com filtros
    let whereClause = '1=1'
    const queryParams: any[] = []

    if (search) {
      whereClause += ` AND motivo LIKE ?`
      queryParams.push(`%${search}%`)
    }

    // Buscar motivos de perda
    const motivosQuery = `
      SELECT id, motivo, created_at, updated_at
      FROM motivos_de_perda 
      WHERE ${whereClause}
      ORDER BY motivo ASC
    `
    
    const motivos = await executeQuery(motivosQuery, queryParams)

    // Estatísticas
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM motivos_de_perda') as any[]
    
    const stats = {
      total: totalResult[0]?.total || 0
    }

    return NextResponse.json({
      success: true,
      motivos,
      stats
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar motivos de perda',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

