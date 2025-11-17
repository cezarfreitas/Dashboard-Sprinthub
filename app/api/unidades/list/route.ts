import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para parsear JSON com segurança
function parseJSON(value: any, unidadeId: number, fieldName: string): any[] {
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
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // Buscar unidades com todos os campos necessários
    let query = `
      SELECT 
        u.id, 
        u.name, 
        u.nome,
        u.grupo_id,
        g.nome as grupo_nome,
        u.department_id, 
        u.show_sac360, 
        u.show_crm,
        u.create_date, 
        u.update_date,
        u.users,
        u.subs,
        u.accs,
        u.branches,
        u.fila_leads,
        u.dpto_gestao,
        u.user_gestao,
        u.ativo, 
        u.synced_at, 
        u.created_at, 
        u.updated_at
      FROM unidades u
      LEFT JOIN unidade_grupos g ON g.id = u.grupo_id
      WHERE (u.name IS NOT NULL OR u.nome IS NOT NULL)
    `
    const params: any[] = []

    if (search) {
      query += ' AND (u.name LIKE ? OR u.nome LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    // LIMIT/OFFSET safe to interpolate as they're validated integers
    query += ` ORDER BY COALESCE(u.nome, u.name) ASC LIMIT ${limit} OFFSET ${offset}`

    const unidades = await executeQuery(query, params) as any[]
    
    // Buscar TODOS os vendedores uma única vez
    const todosVendedores = await executeQuery(`
      SELECT id, name, lastName FROM vendedores ORDER BY name, lastName
    `) as any[]
    const vendedoresMap = new Map(todosVendedores.map(v => [v.id, v]))
    
    // Buscar distribuições de todas as unidades de uma vez para evitar N+1
    const unidadeIds = unidades.map(u => u.id)
    let distribuicoesMap = new Map<number, Map<number, number>>()
    
    if (unidadeIds.length > 0) {
      const placeholders = unidadeIds.map(() => '?').join(',')
      const distribuicoesResult = await executeQuery(`
        SELECT unidade_id, vendedor_id, COUNT(*) as total_distribuicoes
        FROM fila_leads_log
        WHERE unidade_id IN (${placeholders})
        GROUP BY unidade_id, vendedor_id
      `, unidadeIds) as any[]
      
      distribuicoesResult.forEach((d: any) => {
        if (!distribuicoesMap.has(d.unidade_id)) {
          distribuicoesMap.set(d.unidade_id, new Map())
        }
        distribuicoesMap.get(d.unidade_id)!.set(d.vendedor_id, d.total_distribuicoes)
      })
    }
    
    // Buscar nomes de gestores de uma vez
    const gestorIds = unidades
      .map(u => u.user_gestao)
      .filter((id): id is number => typeof id === 'number')
    
    let gestoresMap = new Map<number, string>()
    if (gestorIds.length > 0) {
      const uniqueGestorIds = Array.from(new Set(gestorIds))
      const placeholders = uniqueGestorIds.map(() => '?').join(',')
      const gestoresResult = await executeQuery(`
        SELECT id, name, lastName 
        FROM vendedores 
        WHERE id IN (${placeholders})
      `, uniqueGestorIds) as any[]
      
      gestoresResult.forEach((g: any) => {
        gestoresMap.set(g.id, `${g.name} ${g.lastName}`)
      })
    }
    
    // Para cada unidade, extrair vendedores do campo JSON users
    const unidadesComVendedores = unidades.map((unidade) => {
      let vendedores: any[] = []
      let userIds: number[] = []

      // Extrair IDs do campo JSON users
      const parsedUsers = parseJSON(unidade.users, unidade.id, 'users')
      userIds = parsedUsers
        .map((u: any) => typeof u === 'object' ? u.id : u)
        .filter((id: any) => typeof id === 'number')

      // Buscar vendedores do Map ao invés de fazer query
      vendedores = userIds
        .map(id => vendedoresMap.get(id))
        .filter(v => v !== undefined) as any[]

      // Processar campos JSON
      const accsArray = parseJSON(unidade.accs, unidade.id, 'accs')
      const branchesArray = parseJSON(unidade.branches, unidade.id, 'branches')
      const subsArray = parseJSON(unidade.subs, unidade.id, 'subs')

      // Processar campo fila_leads com contagem de distribuições
      const parsedFilaLeads = parseJSON(unidade.fila_leads, unidade.id, 'fila_leads')
      let filaLeadsArray: any[] = []
      
      if (parsedFilaLeads.length > 0) {
        const unidadeDistribuicoes = distribuicoesMap.get(unidade.id) || new Map()
        
        filaLeadsArray = parsedFilaLeads
          .map((item: any) => {
            const vendedorId = item.vendedor_id || item.id
            const vendedor = vendedores.find(v => v.id === vendedorId)
            
            return {
              id: vendedorId,
              sequencia: item.sequencia || item.ordem,
              nome: vendedor ? `${vendedor.name} ${vendedor.lastName}` : '',
              total_distribuicoes: unidadeDistribuicoes.get(vendedorId) || 0
            }
          })
          .sort((a, b) => a.sequencia - b.sequencia)
      }

      // Remover o campo users da resposta (não precisa enviar JSON grande)
      const { users, ...unidadeSemUsers } = unidade

      // Extrair ID do subs (primeiro elemento se for array)
      let subsId = null
      if (subsArray && subsArray.length > 0) {
        const primeiroSub = subsArray[0]
        subsId = typeof primeiroSub === 'object' ? primeiroSub.id : primeiroSub
      }

      // Buscar nome do usuário de gestão do Map
      const nomeUserGestao = unidade.user_gestao ? gestoresMap.get(unidade.user_gestao) || null : null

      // Preparar listas distintas: detalhes completos e equipe (sem gestor)
      const vendedoresDetalhes = vendedores.map(v => ({ ...v }))
      let equipeVendedores = vendedores
      if (unidade.user_gestao) {
        // Marcar o gestor nos detalhes
        const gestorIdx = vendedoresDetalhes.findIndex(v => v.id === unidade.user_gestao)
        if (gestorIdx !== -1) {
          (vendedoresDetalhes[gestorIdx] as any).isGestor = true
        }
        // Remover gestor somente da lista exibida como "Equipe"
        equipeVendedores = vendedores.filter(v => v.id !== unidade.user_gestao)
      }

      return {
        ...unidadeSemUsers,
        total_vendedores: equipeVendedores.length,
        vendedores: equipeVendedores.map(v => `${v.name} ${v.lastName}`),
        vendedores_detalhes: vendedoresDetalhes,
        accs: accsArray,
        branches: branchesArray,
        subs: subsArray,
        subs_id: subsId,
        fila_leads: filaLeadsArray,
        dpto_gestao: unidade.dpto_gestao,
        user_gestao: unidade.user_gestao,
        nome_user_gestao: nomeUserGestao
      }
    })

    // Contar total
    let countQuery = 'SELECT COUNT(*) as total FROM unidades WHERE (name IS NOT NULL OR nome IS NOT NULL)'
    const countParams: any[] = []
    
    if (search) {
      countQuery += ' AND (name LIKE ? OR nome LIKE ?)'
      countParams.push(`%${search}%`, `%${search}%`)
    }
    
    const totalResult = await executeQuery(countQuery, countParams) as any[]
    const total = totalResult[0]?.total || 0

    // Estatísticas
    const statsResult = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) as ativas,
        SUM(CASE WHEN ativo = 0 THEN 1 ELSE 0 END) as inativas,
        MAX(synced_at) as ultima_sincronizacao
      FROM unidades
    `) as any[]
    
    const stats = statsResult[0] || {
      total: 0,
      ativas: 0,
      inativas: 0,
      ultima_sincronizacao: null
    }

    return NextResponse.json({
      success: true,
      unidades: unidadesComVendedores,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao listar unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PATCH para ativar/desativar unidade ou atualizar fila_leads
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { ativo, fila_leads } = body

    // Atualizar status ativo
    if (typeof ativo === 'boolean') {
      await executeQuery(
        'UPDATE unidades SET ativo = ? WHERE id = ?',
        [ativo ? 1 : 0, id]
      )
    }

    // Atualizar fila de leads
    if (fila_leads !== undefined && Array.isArray(fila_leads)) {
      const filaLeadsJson = JSON.stringify(fila_leads.map((item: any) => ({
        vendedor_id: item.id,
        sequencia: item.sequencia
      })))
      await executeQuery(
        'UPDATE unidades SET fila_leads = ? WHERE id = ?',
        [filaLeadsJson, id]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Unidade atualizada com sucesso'
    })

  } catch (error) {
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
