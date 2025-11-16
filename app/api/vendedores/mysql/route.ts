import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface VendedorMySQL {
  id: number
  name: string
  lastName: string
  email: string
  cpf: string | null
  username: string
  birthDate: string
  telephone: string | null
  photo: string | null
  admin: number
  branch: string | null
  position_company: string | null
  skills: string | null
  state: string | null
  city: string | null
  whatsapp_automation: string | null
  ativo: boolean
  last_login: string | null
  last_action: string | null
  status: 'active' | 'inactive' | 'blocked'
  synced_at: string
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const unidade_id = searchParams.get('unidade_id') || ''
    
    const offset = (page - 1) * limit

    // Verificar se a tabela existe
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'vendedores'
    `) as any[]

    if (tableExists[0]?.count === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela de vendedores não existe. Execute a sincronização primeiro.',
        vendedores: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      }, { status: 404 })
    }

    // Construir query com filtros
    let whereClause = '1=1'
    const queryParams: any[] = []

    if (search) {
      whereClause += ` AND (
        name LIKE ? OR 
        lastName LIKE ? OR 
        email LIKE ? OR 
        username LIKE ? OR
        telephone LIKE ?
      )`
      const searchTerm = `%${search}%`
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }

    if (status && ['active', 'inactive', 'blocked'].includes(status)) {
      whereClause += ` AND status = ?`
      queryParams.push(status)
    }

    // Filtro por unidade - usando a tabela de relacionamento
    if (unidade_id) {
      whereClause += ` AND id IN (
        SELECT vendedor_id 
        FROM vendedores_unidades 
        WHERE unidade_id = ?
      )`
      queryParams.push(parseInt(unidade_id))
    }

    // Contar total de registros
    const countQuery = `SELECT COUNT(*) as total FROM vendedores WHERE ${whereClause}`
    const countResult = await executeQuery(countQuery, queryParams) as any[]
    const total = countResult[0]?.total || 0
    const pages = Math.ceil(total / limit)

    // Buscar vendedores com paginação - LIMIT/OFFSET safe to interpolate as validated integers
    const vendedoresQuery = `
      SELECT 
        id, name, lastName, email, cpf, username, birthDate, telephone,
        admin, last_login, last_action, status, synced_at, created_at, updated_at,
        COALESCE(ativo, TRUE) as ativo
      FROM vendedores 
      WHERE ${whereClause}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const vendedores = await executeQuery(vendedoresQuery, queryParams) as VendedorMySQL[]

    // Estatísticas - Uma única query agregada ao invés de 8 queries separadas
    const statsResult = await executeQuery(`
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
    `) as any[]

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
      pagination: {
        page,
        limit,
        total,
        pages,
        has_next: page < pages,
        has_prev: page > 1
      },
      stats: {
        total: Number(stats.total) || 0,
        active: Number(stats.active) || 0,
        inactive: Number(stats.inactive) || 0,
        blocked: Number(stats.blocked) || 0,
        com_telefone: Number(stats.com_telefone) || 0,
        com_cpf: Number(stats.com_cpf) || 0,
        admins: Number(stats.admins) || 0,
        ultima_sincronizacao: stats.ultima_sincronizacao
      },
      filters: {
        search,
        status,
        unidade_id,
        page,
        limit
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PATCH para alternar status ativo
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedorId = searchParams.get('id')
    const { ativo } = await request.json()

    if (!vendedorId) {
      return NextResponse.json(
        { success: false, message: 'ID do vendedor é obrigatório' },
        { status: 400 }
      )
    }

    if (typeof ativo !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Valor de ativo deve ser boolean' },
        { status: 400 }
      )
    }

    const result = await executeQuery(
      'UPDATE vendedores SET ativo = ?, updated_at = NOW() WHERE id = ?',
      [ativo, vendedorId]
    ) as any

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Vendedor ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      ativo
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao alterar status do vendedor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// DELETE para remover vendedor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedorId = searchParams.get('id')

    if (!vendedorId) {
      return NextResponse.json(
        { success: false, message: 'ID do vendedor é obrigatório' },
        { status: 400 }
      )
    }

    const result = await executeQuery(
      'DELETE FROM vendedores WHERE id = ?',
      [vendedorId]
    ) as any

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Vendedor removido com sucesso'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao remover vendedor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
