import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeMutation } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar contato específico por id_contato
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idContato = params.id

    if (!idContato) {
      return NextResponse.json(
        { success: false, message: 'id_contato é obrigatório' },
        { status: 400 }
      )
    }

    const contatos = await executeQuery(
      `SELECT 
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
      WHERE id_contato = ?`,
      [idContato]
    ) as any[]

    if (contatos.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    const contato = contatos[0]

    return NextResponse.json({
      success: true,
      contato: {
        id_contato: contato.id_contato,
        wpp_filial: contato.wpp_filial,
        wpp_contato: contato.wpp_contato,
        vendedor: contato.vendedor,
        vendedor_id: contato.vendedor_id,
        nome: contato.nome,
        ativo: Boolean(contato.ativo),
        observacoes: contato.observacoes || null,
        created_at: contato.created_at,
        updated_at: contato.updated_at
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar contato:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar contato',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar contato
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idContato = params.id
    const body = await request.json()

    if (!idContato) {
      return NextResponse.json(
        { success: false, message: 'id_contato é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se contato existe
    const contatoExiste = await executeQuery(
      'SELECT id_contato FROM contatos_whatsapp WHERE id_contato = ?',
      [idContato]
    ) as any[]

    if (contatoExiste.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    // Campos que podem ser atualizados
    const camposPermitidos = [
      'wpp_filial',
      'wpp_contato',
      'vendedor',
      'vendedor_id',
      'nome',
      'ativo',
      'observacoes'
    ]

    const updates: string[] = []
    const valores: any[] = []

    // Construir query dinâmica apenas com campos enviados
    for (const campo of camposPermitidos) {
      if (body[campo] !== undefined) {
        // Validações específicas
        if (campo === 'vendedor_id') {
          const vendedorId = parseInt(body[campo])
          if (isNaN(vendedorId)) {
            return NextResponse.json(
              { success: false, message: 'vendedor_id deve ser um número' },
              { status: 400 }
            )
          }

          // Verificar se vendedor existe
          const vendedorExiste = await executeQuery(
            'SELECT id FROM vendedores WHERE id = ? AND ativo = 1',
            [vendedorId]
          ) as any[]

          if (vendedorExiste.length === 0) {
            return NextResponse.json(
              { success: false, message: 'Vendedor não encontrado ou inativo' },
              { status: 404 }
            )
          }

          updates.push(`${campo} = ?`)
          valores.push(vendedorId)
        } else if (campo === 'ativo') {
          updates.push(`${campo} = ?`)
          valores.push(body[campo] ? 1 : 0)
        } else if (typeof body[campo] === 'string') {
          updates.push(`${campo} = ?`)
          valores.push(body[campo].trim())
        } else {
          updates.push(`${campo} = ?`)
          valores.push(body[campo])
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhum campo válido para atualizar' },
        { status: 400 }
      )
    }

    // Adicionar id_contato ao final dos valores
    valores.push(idContato)

    // Executar update
    const query = `UPDATE contatos_whatsapp SET ${updates.join(', ')} WHERE id_contato = ?`
    const result = await executeMutation(query, valores)

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhuma alteração realizada' },
        { status: 400 }
      )
    }

    // Buscar contato atualizado
    const contatoAtualizado = await executeQuery(
      'SELECT * FROM contatos_whatsapp WHERE id_contato = ?',
      [idContato]
    ) as any[]

    return NextResponse.json({
      success: true,
      message: 'Contato atualizado com sucesso',
      contato: contatoAtualizado[0]
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar contato:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao atualizar contato',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// DELETE - Desativar contato (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idContato = params.id
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (!idContato) {
      return NextResponse.json(
        { success: false, message: 'id_contato é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se contato existe
    const contatoExiste = await executeQuery(
      'SELECT id_contato FROM contatos_whatsapp WHERE id_contato = ?',
      [idContato]
    ) as any[]

    if (contatoExiste.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Contato não encontrado' },
        { status: 404 }
      )
    }

    if (hardDelete) {
      // Hard delete - remove do banco
      await executeMutation(
        'DELETE FROM contatos_whatsapp WHERE id_contato = ?',
        [idContato]
      )

      return NextResponse.json({
        success: true,
        message: 'Contato removido permanentemente'
      })
    } else {
      // Soft delete - apenas desativa
      await executeMutation(
        'UPDATE contatos_whatsapp SET ativo = 0 WHERE id_contato = ?',
        [idContato]
      )

      return NextResponse.json({
        success: true,
        message: 'Contato desativado com sucesso'
      })
    }

  } catch (error) {
    console.error('❌ Erro ao deletar contato:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao deletar contato',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

