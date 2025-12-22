import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * GET - Buscar vendedores diretamente da tabela vendedores
 * Query params:
 *   - ids: IDs dos vendedores separados por vírgula (ex: ids=256,255,253) - OPCIONAL
 *   - page: Número da página (padrão: 1)
 *   - limit: Limite de resultados por página (padrão: 50)
 *   - search: Termo de busca (nome, username, telefone)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const search = searchParams.get('search') || ''

    // Modo 1: Buscar por IDs específicos
    if (idsParam) {
      const ids = idsParam
        .split(',')
        .map((id: string) => parseInt(id.trim()))
        .filter((id: number) => !isNaN(id))

      if (ids.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Nenhum ID válido fornecido'
        }, { status: 400 })
      }

      const placeholders = ids.map(() => '?').join(',')
      const query = `
        SELECT 
          id, name, lastName, email, username, telephone, ativo,
          cpf, birthDate, photo, admin, branch, position_company,
          status, last_login, synced_at, created_at, updated_at
        FROM vendedores
        WHERE id IN (${placeholders})
        ORDER BY name, lastName
      `

      const vendedores = await executeQuery(query, ids)

      return NextResponse.json({
        success: true,
        vendedores,
        total: (vendedores as any[]).length
      })
    }

    // Modo 2: Listagem com paginação e busca
    const offset = (page - 1) * limit
    let whereClause = ''
    const params: any[] = []

    if (search) {
      whereClause = `
        WHERE (
          name LIKE ? OR 
          lastName LIKE ? OR 
          username LIKE ? OR 
          telephone LIKE ? OR
          email LIKE ?
        )
      `
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }

    // Buscar vendedores com paginação
    const vendedoresQuery = `
      SELECT 
        id, name, lastName, email, cpf, username, birthDate,
        telephone, photo, admin, branch, position_company,
        skills, state, city, whatsapp_automation, ativo,
        last_login, last_action, status, synced_at, created_at, updated_at
      FROM vendedores
      ${whereClause}
      ORDER BY name, lastName
      LIMIT ${limit} OFFSET ${offset}
    `

    const vendedores = await executeQuery(vendedoresQuery, params)

    // Buscar total de vendedores (para paginação)
    const countQuery = `SELECT COUNT(*) as total FROM vendedores ${whereClause}`
    const countResult = await executeQuery(countQuery, params) as any[]
    const totalVendedores = countResult[0]?.total || 0

    // Buscar estatísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN telephone IS NOT NULL AND telephone != '' THEN 1 ELSE 0 END) as com_telefone,
        SUM(CASE WHEN cpf IS NOT NULL AND cpf != '' THEN 1 ELSE 0 END) as com_cpf,
        SUM(CASE WHEN admin = 1 THEN 1 ELSE 0 END) as admins,
        MAX(synced_at) as ultima_sincronizacao
      FROM vendedores
    `

    const statsResult = await executeQuery(statsQuery) as any[]
    const stats = statsResult[0] || {
      total: 0,
      active: 0,
      inactive: 0,
      blocked: 0,
      com_telefone: 0,
      com_cpf: 0,
      admins: 0,
      ultima_sincronizacao: null
    }

    return NextResponse.json({
      success: true,
      vendedores,
      stats,
      pagination: {
        page,
        limit,
        total: totalVendedores,
        totalPages: Math.ceil(totalVendedores / limit)
      }
    })

  } catch (error) {
    console.error('[API] Erro ao buscar vendedores:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
