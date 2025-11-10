import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// POST - Adicionar vendedor à fila de roleta
export async function POST(request: NextRequest) {
  // Funcionalidade desabilitada - tabela roletas foi removida
  return NextResponse.json(
    { success: false, message: 'Funcionalidade de fila de roleta foi desabilitada' },
    { status: 410 }
  )
  
  /*
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
    const unidades = await executeQuery(
      'SELECT id FROM unidades WHERE id = ?',
      [unidade_id]
    ) as any[]

    if (unidades.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o vendedor existe e está na unidade
    const vendedores = await executeQuery(`
      SELECT v.id, v.name, v.lastName, v.email
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      WHERE v.id = ? AND vu.unidade_id = ?
    `, [vendedor_id, unidade_id]) as any[]

    if (vendedores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado ou não está nesta unidade' },
        { status: 404 }
      )
    }

    // Buscar ou criar roleta da unidade
    let roletas = await executeQuery(
      'SELECT id FROM roletas WHERE unidade_id = ? AND ativo = TRUE',
      [unidade_id]
    ) as any[]

    let roleta_id: number

    if (roletas.length === 0) {
      // Criar roleta se não existir
      const result = await executeQuery(
        'INSERT INTO roletas (unidade_id, ativo) VALUES (?, TRUE)',
        [unidade_id]
      ) as any
      roleta_id = result.insertId
    } else {
      roleta_id = roletas[0].id
    }

    // Verificar se o vendedor já está na fila
    const vendedorNaFila = await executeQuery(
      'SELECT id FROM fila_roleta WHERE roleta_id = ? AND vendedor_id = ?',
      [roleta_id, vendedor_id]
    ) as any[]

    if (vendedorNaFila.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor já está na fila de oportunidades' },
        { status: 409 }
      )
    }

    // Buscar a próxima ordem na fila
    const ultimaOrdem = await executeQuery(
      'SELECT MAX(ordem) as max_ordem FROM fila_roleta WHERE roleta_id = ?',
      [roleta_id]
    ) as any[]

    const proximaOrdem = (ultimaOrdem[0]?.max_ordem || 0) + 1

    // Adicionar vendedor à fila
    await executeQuery(
      'INSERT INTO fila_roleta (roleta_id, vendedor_id, ordem) VALUES (?, ?, ?)',
      [roleta_id, vendedor_id, proximaOrdem]
    )

    return NextResponse.json({
      success: true,
      message: `${vendedores[0].name} ${vendedores[0].lastName} foi adicionado à fila de oportunidades`
    })

  } catch (error) {
    console.error('❌ Erro ao adicionar vendedor à fila:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao adicionar vendedor à fila',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
  */
}

// DELETE - Remover vendedor da fila de roleta
export async function DELETE(request: NextRequest) {
  // Funcionalidade desabilitada - tabela roletas foi removida
  return NextResponse.json(
    { success: false, message: 'Funcionalidade de fila de roleta foi desabilitada' },
    { status: 410 }
  )
  
  /*
  try {
    const body = await request.json()
    const { unidade_id, vendedor_id } = body

    if (!unidade_id || !vendedor_id) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade e ID do vendedor são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar roleta da unidade
    const roletas = await executeQuery(
      'SELECT id FROM roletas WHERE unidade_id = ? AND ativo = TRUE',
      [unidade_id]
    ) as any[]

    if (roletas.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Roleta não encontrada para esta unidade' },
        { status: 404 }
      )
    }

    const roleta_id = roletas[0].id

    // Verificar se o vendedor está na fila
    const vendedorNaFila = await executeQuery(
      'SELECT id FROM fila_roleta WHERE roleta_id = ? AND vendedor_id = ?',
      [roleta_id, vendedor_id]
    ) as any[]

    if (vendedorNaFila.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não está na fila de oportunidades' },
        { status: 404 }
      )
    }

    // Buscar informações do vendedor para a mensagem
    const vendedores = await executeQuery(
      'SELECT name, lastName FROM vendedores WHERE id = ?',
      [vendedor_id]
    ) as any[]

    // Remover vendedor da fila
    await executeQuery(
      'DELETE FROM fila_roleta WHERE roleta_id = ? AND vendedor_id = ?',
      [roleta_id, vendedor_id]
    )

    // Reordenar a fila para manter sequência
    const filaRestante = await executeQuery(
      'SELECT vendedor_id FROM fila_roleta WHERE roleta_id = ? ORDER BY ordem ASC',
      [roleta_id]
    ) as any[]

    // Atualizar ordens
    for (let i = 0; i < filaRestante.length; i++) {
      await executeQuery(
        'UPDATE fila_roleta SET ordem = ? WHERE roleta_id = ? AND vendedor_id = ?',
        [i + 1, roleta_id, filaRestante[i].vendedor_id]
      )
    }

    return NextResponse.json({
      success: true,
      message: `${vendedores[0].name} ${vendedores[0].lastName} foi removido da fila de oportunidades`
    })

  } catch (error) {
    console.error('❌ Erro ao remover vendedor da fila:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao remover vendedor da fila',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
  */
}
