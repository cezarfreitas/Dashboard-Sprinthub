import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar detalhes de uma unidade específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unidadeId = parseInt(params.id)

    if (isNaN(unidadeId)) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade inválido' },
        { status: 400 }
      )
    }

    const query = `
      SELECT 
        id,
        nome,
        name,
        responsavel,
        grupo_id,
        department_id,
        show_sac360,
        show_crm,
        users,
        ativo
      FROM unidades
      WHERE id = ? AND ativo = 1
    `

    const result = await executeQuery(query, [unidadeId]) as any[]

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    const unidade = result[0]

    // Parse do campo users (JSON)
    let users = []
    if (unidade.users) {
      try {
        users = typeof unidade.users === 'string' 
          ? JSON.parse(unidade.users) 
          : unidade.users
      } catch (e) {
        users = []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: unidade.id,
        nome: unidade.nome || unidade.name,
        responsavel: unidade.responsavel,
        grupo_id: unidade.grupo_id,
        department_id: unidade.department_id,
        show_sac360: Boolean(unidade.show_sac360),
        show_crm: Boolean(unidade.show_crm),
        users,
        ativo: Boolean(unidade.ativo)
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar unidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

