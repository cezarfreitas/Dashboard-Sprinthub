import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadesParam = searchParams.get('unidades')
    const todasUnidadesParams = searchParams.getAll('unidades')
    const unidadeId = searchParams.get('unidade_id')
    const ativo = searchParams.get('ativo')

    // BUSCAR UNIDADES (seguindo schema do banco.sql)
    let queryUnidades = `
      SELECT 
        u.id,
        u.nome,
        u.name,
        u.grupo_id,
        u.department_id,
        u.users,
        u.dpto_gestao,
        u.user_gestao,
        u.ativo
      FROM unidades u
      WHERE 1=1
    `

    const params: any[] = []

    // Filtrar por múltiplas unidades se fornecido
    // Suporta: unidades=90,91 ou unidades=90&unidades=91
    const unidadesIds: number[] = []
    
    if (todasUnidadesParams.length > 0) {
      // Múltiplos parâmetros: unidades=90&unidades=91
      todasUnidadesParams.forEach(param => {
        param.split(',').forEach(id => {
          const numId = parseInt(id.trim())
          if (!isNaN(numId) && !unidadesIds.includes(numId)) {
            unidadesIds.push(numId)
          }
        })
      })
    } else if (unidadesParam) {
      // Um parâmetro com separadores: unidades=90,91 ou unidades=90&91
      unidadesParam.split(/[&,]/).forEach(id => {
        const numId = parseInt(id.trim())
        if (!isNaN(numId) && !unidadesIds.includes(numId)) {
          unidadesIds.push(numId)
        }
      })
    }
    
    if (unidadesIds.length > 0) {
      const placeholders = unidadesIds.map(() => '?').join(',')
      queryUnidades += ` AND u.id IN (${placeholders})`
      params.push(...unidadesIds)
    } else if (unidadeId && !isNaN(parseInt(unidadeId))) {
      // Filtrar por unidade específica se fornecido (compatibilidade com parâmetro antigo)
      queryUnidades += ' AND u.id = ?'
      params.push(parseInt(unidadeId))
    }

    // Filtrar por ativo se fornecido
    if (ativo !== null && ativo !== undefined) {
      queryUnidades += ' AND u.ativo = ?'
      params.push(ativo === 'true' || ativo === '1' ? 1 : 0)
    } else {
      // Por padrão, mostrar apenas unidades ativas
      queryUnidades += ' AND u.ativo = 1'
    }

    queryUnidades += ` ORDER BY COALESCE(NULLIF(u.nome, ''), u.name)`

    const unidades = await executeQuery(queryUnidades, params) as any[]

    // Função auxiliar para parsear campos JSON
    const parseJsonField = (value: any): any => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      return value
    }

    // Extrair todos os IDs de vendedores do campo users e user_gestao
    const todosUsersIds = new Set<number>()
    unidades.forEach(u => {
      const users = parseJsonField(u.users)
      if (Array.isArray(users)) {
        users.forEach((userId: any) => {
          const id = typeof userId === 'number' ? userId : parseInt(userId)
          if (!isNaN(id)) {
            todosUsersIds.add(id)
          }
        })
      }
      
      const userGestao = parseJsonField(u.user_gestao)
      if (Array.isArray(userGestao)) {
        userGestao.forEach((userId: any) => {
          const id = typeof userId === 'number' ? userId : parseInt(userId)
          if (!isNaN(id)) {
            todosUsersIds.add(id)
          }
        })
      }
    })

    // Buscar vendedores e gestores relacionados (todos de uma vez)
    let vendedoresMap = new Map<number, any>()
    if (todosUsersIds.size > 0) {
      const vendedoresIds = Array.from(todosUsersIds)
      const placeholders = vendedoresIds.map(() => '?').join(',')
      const queryVendedores = `
        SELECT 
          v.id,
          v.name,
          v.lastName,
          CONCAT(v.name, ' ', v.lastName) as nome_completo
        FROM vendedores v
        WHERE v.id IN (${placeholders})
        AND v.ativo = 1
      `
      
      const vendedores = await executeQuery(queryVendedores, vendedoresIds) as any[]
      vendedores.forEach(v => {
        vendedoresMap.set(v.id, {
          id: v.id,
          nome: v.nome_completo
        })
      })
    }

    // Extrair todos os grupo_ids únicos
    const todosGrupoIds = new Set<number>()
    unidades.forEach(u => {
      if (u.grupo_id && !isNaN(parseInt(u.grupo_id))) {
        todosGrupoIds.add(parseInt(u.grupo_id))
      }
    })

    // Buscar grupos relacionados
    let gruposMap = new Map<number, any>()
    if (todosGrupoIds.size > 0) {
      const grupoIds = Array.from(todosGrupoIds)
      const placeholders = grupoIds.map(() => '?').join(',')
      const queryGrupos = `
        SELECT 
          g.id,
          g.nome
        FROM unidade_grupos g
        WHERE g.id IN (${placeholders})
        AND g.ativo = 1
      `
      
      const grupos = await executeQuery(queryGrupos, grupoIds) as any[]
      grupos.forEach(g => {
        gruposMap.set(g.id, {
          id: g.id,
          nome: g.nome
        })
      })
    }

    // Formatar unidades para retorno com vendedores e gestores
    const unidadesFormatadas = unidades.map(u => {
      const users = parseJsonField(u.users)
      const userGestao = parseJsonField(u.user_gestao)
      
      // Buscar vendedores relacionados ao campo users
      const vendedores: any[] = []
      if (Array.isArray(users)) {
        users.forEach((userId: any) => {
          const id = typeof userId === 'number' ? userId : parseInt(userId)
          const vendedor = vendedoresMap.get(id)
          if (vendedor) {
            vendedores.push(vendedor)
          }
        })
      }

      // Buscar gestores relacionados ao campo user_gestao
      const gestores: any[] = []
      if (Array.isArray(userGestao)) {
        userGestao.forEach((userId: any) => {
          const id = typeof userId === 'number' ? userId : parseInt(userId)
          const gestor = vendedoresMap.get(id)
          if (gestor) {
            gestores.push(gestor)
          }
        })
      }

      // Buscar grupo relacionado
      const grupo = u.grupo_id ? gruposMap.get(u.grupo_id) || null : null

      return {
        id: u.id,
        nome: u.nome || u.name || null,
        grupo: grupo,
        department_id: u.department_id || null,
        vendedores: vendedores,
        gestores: gestores
      }
    })

    return NextResponse.json({
      success: true,
      unidades: unidadesFormatadas,
      total: unidadesFormatadas.length,
      message: `${unidadesFormatadas.length} unidades encontradas`
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

