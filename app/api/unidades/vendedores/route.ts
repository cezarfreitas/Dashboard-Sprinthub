import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { sincronizarRoletaUnidade } from '@/lib/roleta-sync'

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

    // Verificar se o vendedor já está nesta unidade
    const relacionamentoExistente = await executeQuery(
      'SELECT id FROM vendedores_unidades WHERE vendedor_id = ? AND unidade_id = ?',
      [vendedor_id, unidade_id]
    ) as any[]

    if (relacionamentoExistente.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Vendedor já está vinculado à unidade "${unidade[0]?.nome || 'esta unidade'}"` 
        },
        { status: 409 }
      )
    }

    // Buscar próxima sequência disponível
    const maxSequencia = await executeQuery(
      'SELECT COALESCE(MAX(sequencia), 0) as max_seq FROM vendedores_unidades WHERE unidade_id = ?',
      [unidade_id]
    ) as any[]

    const proximaSequencia = maxSequencia[0].max_seq + 1

    // Adicionar vendedor à unidade com sequência
    await executeQuery(
      'INSERT INTO vendedores_unidades (vendedor_id, unidade_id, sequencia) VALUES (?, ?, ?)',
      [vendedor_id, unidade_id, proximaSequencia]
    )

    // Sincronizar roleta da unidade
    await sincronizarRoletaUnidade(parseInt(unidade_id))

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
    const unidade_id = searchParams.get('unidade_id')

    if (!vendedor_id || !unidade_id) {
      return NextResponse.json(
        { success: false, message: 'ID do vendedor e ID da unidade são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o relacionamento existe
    const relacionamento = await executeQuery(`
      SELECT v.id, v.name, v.lastName, u.nome as unidade_nome
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      JOIN unidades u ON vu.unidade_id = u.id
      WHERE v.id = ? AND u.id = ?
    `, [vendedor_id, unidade_id]) as any[]

    if (relacionamento.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não está vinculado a esta unidade' },
        { status: 404 }
      )
    }

    const unidadeNome = relacionamento[0].unidade_nome

    // Remover vendedor da unidade específica
    await executeQuery(
      'DELETE FROM vendedores_unidades WHERE vendedor_id = ? AND unidade_id = ?',
      [vendedor_id, unidade_id]
    )

    // Sincronizar roleta da unidade
    await sincronizarRoletaUnidade(parseInt(unidade_id))

    return NextResponse.json({
      success: true,
      message: `Vendedor ${relacionamento[0].name} ${relacionamento[0].lastName} removido da unidade ${unidadeNome}`
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
        SELECT v.id, v.name, v.lastName, v.email, v.username, v.telephone
        FROM vendedores v
        LEFT JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
        WHERE vu.vendedor_id IS NULL AND v.ativo = 1
        ORDER BY v.name, v.lastName
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
      SELECT v.id, v.name, v.lastName, v.email, v.username, v.telephone
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      WHERE vu.unidade_id = ?
      ORDER BY v.name, v.lastName
    `, [unidade_id]) as any[]

    // Buscar vendedores disponíveis (não estão nesta unidade específica)
    const vendedoresDisponiveis = await executeQuery(`
      SELECT v.id, v.name, v.lastName, v.email, v.username, v.telephone
      FROM vendedores v
      WHERE v.ativo = 1 
      AND v.id NOT IN (
        SELECT vu.vendedor_id 
        FROM vendedores_unidades vu 
        WHERE vu.unidade_id = ?
      )
      ORDER BY v.name, v.lastName
    `, [unidade_id]) as any[]

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
