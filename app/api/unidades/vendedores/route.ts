import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// POST - Adicionar vendedor à unidade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { unidade_id, vendedor_id } = body

    if (!unidade_id || !vendedor_id) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade e ID do vendedor são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a unidade existe
    const unidade = await executeQuery(
      'SELECT id, nome FROM unidades WHERE id = ?',
      [unidade_id]
    ) as any[]

    if (unidade.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o vendedor existe
    const vendedor = await executeQuery(
      'SELECT id, name, lastName FROM vendedores WHERE id = ?',
      [vendedor_id]
    ) as any[]

    if (vendedor.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o vendedor já está em outra unidade
    const vendedorAtual = await executeQuery(
      'SELECT unidade_id FROM vendedores WHERE id = ?',
      [vendedor_id]
    ) as any[]

    if (vendedorAtual[0]?.unidade_id) {
      const unidadeAtual = await executeQuery(
        'SELECT nome FROM unidades WHERE id = ?',
        [vendedorAtual[0].unidade_id]
      ) as any[]

      return NextResponse.json(
        { 
          success: false, 
          message: `Vendedor já está vinculado à unidade "${unidadeAtual[0]?.nome}"` 
        },
        { status: 409 }
      )
    }

    // Adicionar vendedor à unidade
    await executeQuery(
      'UPDATE vendedores SET unidade_id = ? WHERE id = ?',
      [unidade_id, vendedor_id]
    )

    return NextResponse.json({
      success: true,
      message: `Vendedor ${vendedor[0].name} ${vendedor[0].lastName} adicionado à unidade ${unidade[0].nome}`
    })

  } catch (error) {
    console.error('❌ Erro ao adicionar vendedor à unidade:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao adicionar vendedor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// DELETE - Remover vendedor da unidade
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedor_id = searchParams.get('vendedor_id')

    if (!vendedor_id) {
      return NextResponse.json(
        { success: false, message: 'ID do vendedor é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o vendedor existe e está em uma unidade
    const vendedor = await executeQuery(`
      SELECT v.id, v.name, v.lastName, v.unidade_id, u.nome as unidade_nome
      FROM vendedores v
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE v.id = ?
    `, [vendedor_id]) as any[]

    if (vendedor.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    if (!vendedor[0].unidade_id) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não está vinculado a nenhuma unidade' },
        { status: 409 }
      )
    }

    const unidadeNome = vendedor[0].unidade_nome

    // Remover vendedor da unidade
    await executeQuery(
      'UPDATE vendedores SET unidade_id = NULL WHERE id = ?',
      [vendedor_id]
    )

    return NextResponse.json({
      success: true,
      message: `Vendedor ${vendedor[0].name} ${vendedor[0].lastName} removido da unidade ${unidadeNome}`
    })

  } catch (error) {
    console.error('❌ Erro ao remover vendedor da unidade:', error)
    
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

// GET - Listar vendedores disponíveis (sem unidade) para uma unidade específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidade_id = searchParams.get('unidade_id')

    if (!unidade_id) {
      // Retornar todos os vendedores sem unidade e ativos
      const vendedoresSemUnidade = await executeQuery(`
        SELECT id, name, lastName, email, username, telephone
        FROM vendedores 
        WHERE unidade_id IS NULL AND ativo = 1
        ORDER BY name, lastName
      `) as any[]

      return NextResponse.json({
        success: true,
        vendedores_disponiveis: vendedoresSemUnidade,
        total: vendedoresSemUnidade.length
      })
    }

    // Verificar se a unidade existe
    const unidade = await executeQuery(
      'SELECT id, nome FROM unidades WHERE id = ?',
      [unidade_id]
    ) as any[]

    if (unidade.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Buscar vendedores da unidade
    const vendedoresDaUnidade = await executeQuery(`
      SELECT id, name, lastName, email, username, telephone
      FROM vendedores 
      WHERE unidade_id = ?
      ORDER BY name, lastName
    `, [unidade_id]) as any[]

    // Buscar vendedores disponíveis (sem unidade)
    const vendedoresDisponiveis = await executeQuery(`
      SELECT id, name, lastName, email, username, telephone
      FROM vendedores 
      WHERE unidade_id IS NULL
      ORDER BY name, lastName
    `) as any[]

    return NextResponse.json({
      success: true,
      unidade: unidade[0],
      vendedores_da_unidade: vendedoresDaUnidade,
      vendedores_disponiveis: vendedoresDisponiveis,
      stats: {
        total_na_unidade: vendedoresDaUnidade.length,
        total_disponiveis: vendedoresDisponiveis.length
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar vendedores da unidade:', error)
    
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
