import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Lista grupos ativos e suas unidades vinculadas (ids)
    const grupos = await executeQuery(`
      SELECT g.id, g.nome, g.descricao, g.ativo, g.created_at, g.updated_at,
             COUNT(u.id) as total_unidades
      FROM unidade_grupos g
      LEFT JOIN unidades u ON u.grupo_id = g.id AND u.ativo = 1
      WHERE g.ativo = 1
      GROUP BY g.id, g.nome, g.descricao, g.ativo, g.created_at, g.updated_at
      ORDER BY g.nome
    `) as any[]

    const unidadesPorGrupo = await executeQuery(`
      SELECT id, grupo_id
      FROM unidades
      WHERE grupo_id IS NOT NULL AND ativo = 1
    `) as any[]

    const grupoIdToUnidades: Record<number, number[]> = {}
    for (const u of unidadesPorGrupo) {
      if (!grupoIdToUnidades[u.grupo_id]) grupoIdToUnidades[u.grupo_id] = []
      grupoIdToUnidades[u.grupo_id].push(u.id)
    }

    const result = grupos.map(g => ({
      ...g,
      unidadeIds: grupoIdToUnidades[g.id] || []
    }))

    return NextResponse.json({ success: true, grupos: result })
  } catch (error) {
    console.error('Erro ao listar grupos de unidades:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao listar grupos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = body?.id as number | undefined
    const nome = String(body?.nome || '').trim()
    const descricao = typeof body?.descricao === 'string' ? body.descricao : null
    const unidadeIds = Array.isArray(body?.unidadeIds) ? body.unidadeIds.filter((n: any) => Number.isInteger(n)) : []

    if (!nome) {
      return NextResponse.json({ success: false, message: 'Nome é obrigatório' }, { status: 400 })
    }

    let grupoId = id

    // Criar ou atualizar grupo
    if (!grupoId) {
      const insert = await executeQuery(
        'INSERT INTO unidade_grupos (nome, descricao, ativo) VALUES (?, ?, 1)',
        [nome, descricao]
      ) as any
      grupoId = insert.insertId
    } else {
      await executeQuery(
        'UPDATE unidade_grupos SET nome = ?, descricao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nome, descricao, grupoId]
      )
    }

    // Sincronizar unidades vinculadas
    // 1) Remover vínculo de unidades que estavam no grupo mas não estão mais na lista
    await executeQuery(
      `UPDATE unidades 
       SET grupo_id = NULL 
       WHERE grupo_id = ? 
         ${unidadeIds.length ? `AND id NOT IN (${unidadeIds.map(() => '?').join(',')})` : ''}`,
      unidadeIds.length ? [grupoId, ...unidadeIds] as any[] : [grupoId]
    )

    // 2) Atribuir vínculo do grupo às unidades informadas
    if (unidadeIds.length) {
      await executeQuery(
        `UPDATE unidades 
         SET grupo_id = ? 
         WHERE id IN (${unidadeIds.map(() => '?').join(',')})`,
        [grupoId, ...unidadeIds]
      )
    }

    return NextResponse.json({ success: true, id: grupoId })
  } catch (error) {
    console.error('Erro ao salvar grupo de unidades:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao salvar grupo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')
    let grupoId: number | null = idParam ? parseInt(idParam) : null
    if (!grupoId || Number.isNaN(grupoId)) {
      // tentar pelo corpo
      const body = await request.json().catch(() => null as any)
      if (body && Number.isInteger(body.id)) {
        grupoId = body.id
      }
    }
    if (!grupoId) {
      return NextResponse.json({ success: false, message: 'ID do grupo é obrigatório' }, { status: 400 })
    }

    // Desvincular unidades
    await executeQuery(
      'UPDATE unidades SET grupo_id = NULL WHERE grupo_id = ?',
      [grupoId]
    )

    // Remover grupo
    await executeQuery(
      'DELETE FROM unidade_grupos WHERE id = ?',
      [grupoId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir grupo de unidades:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao excluir grupo' },
      { status: 500 }
    )
  }
}


