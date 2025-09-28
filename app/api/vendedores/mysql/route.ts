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
  unidade_id: number | null
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
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

    // Filtro por unidade (se a coluna existir)
    if (unidade_id) {
      // Verificar se a coluna unidade_id existe
      try {
        const columnCheck = await executeQuery(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE() 
          AND table_name = 'vendedores' 
          AND column_name = 'unidade_id'
        `) as any[]
        
        if (columnCheck[0]?.count > 0) {
          whereClause += ` AND unidade_id = ?`
          queryParams.push(parseInt(unidade_id))
        }
      } catch (error) {
        console.log('Coluna unidade_id não encontrada, ignorando filtro')
      }
    }

    // Contar total de registros
    const countQuery = `SELECT COUNT(*) as total FROM vendedores WHERE ${whereClause}`
    const countResult = await executeQuery(countQuery, queryParams) as any[]
    const total = countResult[0]?.total || 0
    const pages = Math.ceil(total / limit)

    // Buscar vendedores com paginação - query simplificada
    const vendedoresQuery = `
      SELECT 
        id, name, lastName, email, cpf, username, birthDate, telephone,
        admin, last_login, last_action, status, synced_at, created_at, updated_at,
        COALESCE(unidade_id, NULL) as unidade_id,
        COALESCE(ativo, TRUE) as ativo
      FROM vendedores 
      WHERE ${whereClause}
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const vendedores = await executeQuery(vendedoresQuery, queryParams) as VendedorMySQL[]

    // Estatísticas adicionais - consultas separadas para evitar problemas
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM vendedores') as any[]
    const activeResult = await executeQuery("SELECT COUNT(*) as active FROM vendedores WHERE status = 'active'") as any[]
    const inactiveResult = await executeQuery("SELECT COUNT(*) as inactive FROM vendedores WHERE status = 'inactive'") as any[]
    const blockedResult = await executeQuery("SELECT COUNT(*) as blocked FROM vendedores WHERE status = 'blocked'") as any[]
    const phoneResult = await executeQuery("SELECT COUNT(*) as com_telefone FROM vendedores WHERE telephone IS NOT NULL AND telephone != ''") as any[]
    const cpfResult = await executeQuery("SELECT COUNT(*) as com_cpf FROM vendedores WHERE cpf IS NOT NULL AND cpf != ''") as any[]
    const adminResult = await executeQuery("SELECT COUNT(*) as admins FROM vendedores WHERE admin = 1") as any[]
    const syncResult = await executeQuery("SELECT MAX(synced_at) as ultima_sincronizacao FROM vendedores") as any[]

    const stats = {
      total: totalResult[0]?.total || 0,
      active: activeResult[0]?.active || 0,
      inactive: inactiveResult[0]?.inactive || 0,
      blocked: blockedResult[0]?.blocked || 0,
      com_telefone: phoneResult[0]?.com_telefone || 0,
      com_cpf: cpfResult[0]?.com_cpf || 0,
      admins: adminResult[0]?.admins || 0,
      ultima_sincronizacao: syncResult[0]?.ultima_sincronizacao || null
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
        total: stats.total || 0,
        active: stats.active || 0,
        inactive: stats.inactive || 0,
        blocked: stats.blocked || 0,
        com_telefone: stats.com_telefone || 0,
        com_cpf: stats.com_cpf || 0,
        admins: stats.admins || 0,
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
