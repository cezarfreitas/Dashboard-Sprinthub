import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para parsear JSON com segurança
function parseJSON(value: any): any[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // Buscar todas as unidades ativas
    let queryUnidades = `
      SELECT 
        u.*,
        COALESCE(u.nome, u.name) as nome_exibicao
      FROM unidades u
      WHERE u.ativo = 1
        AND (u.nome IS NOT NULL OR u.name IS NOT NULL)
    `
    const paramsUnidades: any[] = []

    // Filtro de busca
    if (search) {
      queryUnidades += ' AND (COALESCE(u.nome, u.name) LIKE ? OR u.id = ?)'
      paramsUnidades.push(`%${search}%`, isNaN(Number(search)) ? -1 : Number(search))
    }

    queryUnidades += ' ORDER BY COALESCE(u.nome, u.name) LIMIT ? OFFSET ?'
    paramsUnidades.push(limit, offset)

    const unidades = await executeQuery(queryUnidades, paramsUnidades) as any[]

    // Buscar todos os vendedores uma vez
    const todosVendedores = await executeQuery(`
      SELECT id, name, lastName FROM vendedores WHERE ativo = 1
    `) as any[]
    const vendedoresMap = new Map(todosVendedores.map(v => [v.id, v]))

    // Processar cada unidade
    const unidadesCompletas = unidades.map((unidade) => {
      // Extrair vendedores da unidade
      const parsedUsers = parseJSON(unidade.users)
      const userIds = parsedUsers
        .map((u: any) => typeof u === 'object' ? u.id : u)
        .filter((id: any) => typeof id === 'number')

      const vendedoresUnidade = userIds
        .map((id: number) => {
          const vendedor = vendedoresMap.get(id)
          if (!vendedor) return null
          return {
            id: vendedor.id,
            name: vendedor.name,
            lastName: vendedor.lastName || '',
            sequencia: 0,
            isGestor: unidade.user_gestao === vendedor.id
          }
        })
        .filter(v => v !== null)

      // Parsear fila de leads
      const parsedFilaLeads = parseJSON(unidade.fila_leads)
      const filaLeads = parsedFilaLeads.map((item: any) => ({
        id: item.vendedor_id || item.id,
        nome: vendedoresMap.get(item.vendedor_id || item.id) 
          ? `${vendedoresMap.get(item.vendedor_id || item.id)!.name} ${vendedoresMap.get(item.vendedor_id || item.id)!.lastName || ''}`.trim()
          : 'Sem nome',
        sequencia: item.sequencia || item.ordem || 0
      }))

      return {
        id: unidade.id,
        name: unidade.name || unidade.nome || '',
        nome: unidade.nome_exibicao || unidade.nome || unidade.name || '',
        grupo_id: unidade.grupo_id || null,
        grupo_nome: null, // Será preenchido se necessário
        department_id: unidade.department_id || null,
        show_sac360: unidade.show_sac360 || 0,
        show_crm: unidade.show_crm || 0,
        create_date: unidade.create_date || unidade.created_at || null,
        update_date: unidade.update_date || unidade.updated_at || null,
        total_vendedores: vendedoresUnidade.length,
        vendedores: userIds.map(String),
        vendedores_detalhes: vendedoresUnidade,
        user_gestao: unidade.user_gestao || null,
        nome_user_gestao: unidade.user_gestao 
          ? (vendedoresMap.get(unidade.user_gestao) 
              ? `${vendedoresMap.get(unidade.user_gestao)!.name} ${vendedoresMap.get(unidade.user_gestao)!.lastName || ''}`.trim()
              : null)
          : null,
        dpto_gestao: unidade.dpto_gestao || null,
        accs: parseJSON(unidade.accs),
        branches: parseJSON(unidade.branches),
        subs: parseJSON(unidade.subs),
        subs_id: unidade.subs_id || null,
        fila_leads: filaLeads,
        ativo: Boolean(unidade.ativo),
        synced_at: unidade.synced_at || unidade.updated_at || null,
        created_at: unidade.created_at || unidade.create_date || null,
        updated_at: unidade.updated_at || unidade.update_date || null
      }
    })

    // Buscar estatísticas
    const statsResult = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) as ativas,
        SUM(CASE WHEN ativo = 0 THEN 1 ELSE 0 END) as inativas,
        MAX(synced_at) as ultima_sincronizacao
      FROM unidades
      WHERE (nome IS NOT NULL OR name IS NOT NULL)
    `) as any[]

    const stats = statsResult[0] || {
      total: 0,
      ativas: 0,
      inativas: 0,
      ultima_sincronizacao: null
    }

    return NextResponse.json({
      success: true,
      unidades: unidadesCompletas,
      stats: {
        total: Number(stats.total) || 0,
        ativas: Number(stats.ativas) || 0,
        inativas: Number(stats.inativas) || 0,
        ultima_sincronizacao: stats.ultima_sincronizacao || null
      },
      pagination: {
        page,
        limit,
        total: Number(stats.total) || 0
      }
    })
  } catch (error) {
    console.error('❌ Erro ao buscar lista de unidades:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar lista de unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar unidade (status ou fila)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade é obrigatório' },
        { status: 400 }
      )
    }

    const unidadeId = parseInt(id)
    if (isNaN(unidadeId)) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade inválido' },
        { status: 400 }
      )
    }

    // Verificar se a unidade existe
    const unidadeExiste = await executeQuery(
      'SELECT id FROM unidades WHERE id = ?',
      [unidadeId]
    ) as any[]

    if (unidadeExiste.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar status (ativo)
    if (body.ativo !== undefined) {
      await executeQuery(
        'UPDATE unidades SET ativo = ? WHERE id = ?',
        [body.ativo ? 1 : 0, unidadeId]
      )
    }

    // Atualizar fila de leads
    if (body.fila_leads !== undefined) {
      const filaJson = JSON.stringify(body.fila_leads)
      await executeQuery(
        'UPDATE unidades SET fila_leads = ? WHERE id = ?',
        [filaJson, unidadeId]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Unidade atualizada com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar unidade:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao atualizar unidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
