import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeMutation } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Listar contatos com filtros opcionais
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const vendedorId = searchParams.get('vendedor_id')
    const wppFilial = searchParams.get('wpp_filial')
    const wppContato = searchParams.get('wpp_contato')
    const nome = searchParams.get('nome')
    const ativo = searchParams.get('ativo')
    
    // Parâmetros de paginação
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    // Construir query dinâmica
    let query = `
      SELECT 
        id_contato,
        wpp_filial,
        wpp_contato,
        vendedor,
        vendedor_id,
        nome,
        ativo,
        observacoes,
        created_at,
        updated_at
      FROM contatos_whatsapp
      WHERE 1=1
    `
    const params: any[] = []

    // Aplicar filtros
    if (vendedorId) {
      query += ' AND vendedor_id = ?'
      params.push(parseInt(vendedorId))
    }

    if (wppFilial) {
      query += ' AND wpp_filial = ?'
      params.push(wppFilial)
    }

    if (wppContato) {
      query += ' AND wpp_contato = ?'
      params.push(wppContato)
    }

    if (nome) {
      query += ' AND nome LIKE ?'
      params.push(`%${nome}%`)
    }

    if (ativo !== null && ativo !== undefined) {
      query += ' AND ativo = ?'
      params.push(ativo === 'true' || ativo === '1' ? 1 : 0)
    }

    // Ordenação e paginação
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    // Executar query
    const contatos = await executeQuery(query, params) as any[]

    // Contar total para paginação
    let countQuery = 'SELECT COUNT(*) as total FROM contatos_whatsapp WHERE 1=1'
    const countParams: any[] = []
    let paramIndex = 0

    if (vendedorId) {
      countQuery += ' AND vendedor_id = ?'
      countParams.push(parseInt(vendedorId))
    }
    if (wppFilial) {
      countQuery += ' AND wpp_filial = ?'
      countParams.push(wppFilial)
    }
    if (wppContato) {
      countQuery += ' AND wpp_contato = ?'
      countParams.push(wppContato)
    }
    if (nome) {
      countQuery += ' AND nome LIKE ?'
      countParams.push(`%${nome}%`)
    }
    if (ativo !== null && ativo !== undefined) {
      countQuery += ' AND ativo = ?'
      countParams.push(ativo === 'true' || ativo === '1' ? 1 : 0)
    }

    const countResult = await executeQuery(countQuery, countParams) as any[]
    const total = countResult[0]?.total || 0

    return NextResponse.json({
      success: true,
      contatos: contatos.map(c => ({
        id_contato: c.id_contato,
        wpp_filial: c.wpp_filial,
        wpp_contato: c.wpp_contato,
        vendedor: c.vendedor,
        vendedor_id: c.vendedor_id,
        nome: c.nome,
        ativo: Boolean(c.ativo),
        observacoes: c.observacoes || null,
        created_at: c.created_at,
        updated_at: c.updated_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar contatos:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar contatos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// POST - Criar novo contato
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_contato, wpp_filial, wpp_contato, vendedor, vendedor_id, nome, observacoes } = body

    // Validações obrigatórias
    if (!id_contato || !wpp_filial || !wpp_contato || !vendedor || !vendedor_id || !nome) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campos obrigatórios: id_contato, wpp_filial, wpp_contato, vendedor, vendedor_id, nome'
        },
        { status: 400 }
      )
    }

    // Validar formato dos telefones (opcional)
    const phoneRegex = /^\d{10,15}$/
    if (!phoneRegex.test(wpp_filial.replace(/\D/g, ''))) {
      return NextResponse.json(
        { success: false, message: 'Formato inválido para wpp_filial' },
        { status: 400 }
      )
    }
    if (!phoneRegex.test(wpp_contato.replace(/\D/g, ''))) {
      return NextResponse.json(
        { success: false, message: 'Formato inválido para wpp_contato' },
        { status: 400 }
      )
    }

    // Validar se vendedor existe
    const vendedorExiste = await executeQuery(
      'SELECT id FROM vendedores WHERE id = ? AND ativo = 1',
      [vendedor_id]
    ) as any[]

    if (vendedorExiste.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Verificar se id_contato já existe
    const contatoExiste = await executeQuery(
      'SELECT id_contato FROM contatos_whatsapp WHERE id_contato = ?',
      [id_contato]
    ) as any[]

    if (contatoExiste.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Contato com este id_contato já existe' },
        { status: 409 }
      )
    }

    // Inserir contato
    const result = await executeMutation(
      `INSERT INTO contatos_whatsapp 
       (id_contato, wpp_filial, wpp_contato, vendedor, vendedor_id, nome, observacoes, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id_contato.trim(),
        wpp_filial.trim(),
        wpp_contato.trim(),
        vendedor.trim(),
        parseInt(vendedor_id),
        nome.trim(),
        observacoes?.trim() || null
      ]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Erro ao inserir contato' },
        { status: 500 }
      )
    }

    // Buscar contato inserido
    const contatoInserido = await executeQuery(
      'SELECT * FROM contatos_whatsapp WHERE id_contato = ?',
      [id_contato]
    ) as any[]

    return NextResponse.json(
      {
        success: true,
        message: 'Contato criado com sucesso',
        contato: contatoInserido[0]
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('❌ Erro ao criar contato:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao criar contato',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

