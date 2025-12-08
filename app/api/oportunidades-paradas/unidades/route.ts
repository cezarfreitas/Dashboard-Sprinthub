import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface Oportunidade {
  id: number
  title: string
  value: number
  crm_column: string | null
  lead_id: number | null
  sequence: number | null
  status: string
  user: string
  vendedor_id: number
  vendedor_nome: string
  unidade_id: number | null
  unidade_nome: string
  last_column_change: string | null
  createDate: string
  updateDate: string
  coluna_funil_id: number | null
  funil_nome: string | null
  dias_sem_atualizacao: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadesParam = searchParams.get('unidades')
    
    if (!unidadesParam) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Parâmetro "unidades" é obrigatório. Ex: ?unidades=14,45' 
        },
        { status: 400 }
      )
    }

    // Parsear IDs das unidades
    const unidadesIds: number[] = []
    unidadesParam.split(',').forEach(id => {
      const numId = parseInt(id.trim())
      if (!isNaN(numId) && !unidadesIds.includes(numId)) {
        unidadesIds.push(numId)
      }
    })

    if (unidadesIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Nenhum ID de unidade válido fornecido' 
        },
        { status: 400 }
      )
    }

    // 1. Buscar unidades da tabela unidades
    const placeholdersUnidades = unidadesIds.map(() => '?').join(',')
    const unidades = await executeQuery(`
      SELECT 
        u.id,
        COALESCE(u.nome, u.name) as nome,
        u.department_id,
        u.users,
        u.grupo_id
      FROM unidades u
      WHERE u.id IN (${placeholdersUnidades})
        AND u.ativo = 1
      ORDER BY COALESCE(NULLIF(u.nome, ''), u.name)
    `, unidadesIds) as any[]

    if (unidades.length === 0) {
      return NextResponse.json({
        success: true,
        filtros: { unidades_ids: unidadesIds },
        resumo: {
          total_unidades: 0,
          total_vendedores: 0,
          total_oportunidades: 0,
          valor_total: 0
        },
        unidades: [],
        oportunidades: [],
        vendedores: []
      })
    }

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

    // 2. Extrair todos os IDs de vendedores do campo users das unidades
    const todosUsersIds = new Set<number>()
    const unidadesComUsers = new Map<number, number[]>() // unidade_id -> array de user_ids
    
    unidades.forEach(u => {
      const users = parseJsonField(u.users)
      const userIds: number[] = []
      
      if (Array.isArray(users)) {
        users.forEach((userId: any) => {
          const id = typeof userId === 'number' ? userId : parseInt(userId)
          if (!isNaN(id)) {
            todosUsersIds.add(id)
            userIds.push(id)
          }
        })
      }
      
      unidadesComUsers.set(u.id, userIds)
    })

    if (todosUsersIds.size === 0) {
      return NextResponse.json({
        success: true,
        filtros: { unidades_ids: unidadesIds },
        resumo: {
          total_unidades: unidades.length,
          total_vendedores: 0,
          total_oportunidades: 0,
          valor_total: 0
        },
        unidades: unidades.map(u => ({
          id: u.id,
          nome: u.nome,
          department_id: u.department_id,
          vendedores: []
        })),
        oportunidades: [],
        vendedores: []
      })
    }

    // 3. Buscar dados dos vendedores (todos de uma vez)
    const vendedoresIds = Array.from(todosUsersIds)
    const placeholdersVendedores = vendedoresIds.map(() => '?').join(',')
    
    const vendedores = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        CONCAT(v.name, ' ', v.lastName) as nome_completo
      FROM vendedores v
      WHERE v.id IN (${placeholdersVendedores})
        AND v.ativo = 1
    `, vendedoresIds) as Array<{
      id: number
      name: string
      lastName: string
      nome_completo: string
    }>

    // 4. Criar mapa de vendedores
    const vendedoresMap = new Map<number, any>()
    vendedores.forEach(v => {
      vendedoresMap.set(v.id, {
        id: v.id,
        nome: v.nome_completo
      })
    })

    // 5. Buscar oportunidades abertas dos vendedores
    const oportunidades = await executeQuery(`
      SELECT 
        o.id,
        o.title,
        o.value,
        o.crm_column,
        o.lead_id,
        o.sequence,
        o.status,
        o.user,
        o.last_column_change,
        o.createDate,
        o.updateDate,
        o.coluna_funil_id,
        DATEDIFF(NOW(), o.updateDate) as dias_sem_atualizacao,
        cf.nome_coluna as coluna_nome,
        f.name as funil_nome
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      LEFT JOIN funis f ON cf.id_funil = f.id
      WHERE CAST(o.user AS UNSIGNED) IN (${placeholdersVendedores})
        AND o.status IN ('open', 'aberta', 'active')
        AND o.gain_date IS NULL
        AND o.lost_date IS NULL
        AND o.archived = 0
      ORDER BY o.updateDate ASC, o.value DESC
    `, vendedoresIds) as any[]

    // 6. Enriquecer oportunidades com dados dos vendedores e unidades
    const oportunidadesEnriquecidas: Oportunidade[] = oportunidades.map(op => {
      const vendedorId = parseInt(op.user)
      const vendedor = vendedoresMap.get(vendedorId)
      
      // Encontrar a unidade do vendedor
      let unidadeId: number | null = null
      let unidadeNome: string = 'Sem unidade'
      
      for (const [uId, userIds] of Array.from(unidadesComUsers.entries())) {
        if (userIds.includes(vendedorId)) {
          unidadeId = uId
          const unidade = unidades.find(u => u.id === uId)
          if (unidade) {
            unidadeNome = unidade.nome
          }
          break
        }
      }
      
      return {
        id: op.id,
        title: op.title,
        value: parseFloat(op.value) || 0,
        crm_column: op.crm_column,
        lead_id: op.lead_id,
        sequence: op.sequence,
        status: op.status,
        user: op.user,
        vendedor_id: vendedorId,
        vendedor_nome: vendedor?.nome || 'Desconhecido',
        unidade_id: unidadeId,
        unidade_nome: unidadeNome,
        last_column_change: op.last_column_change,
        createDate: op.createDate,
        updateDate: op.updateDate,
        coluna_funil_id: op.coluna_funil_id,
        funil_nome: op.funil_nome,
        dias_sem_atualizacao: op.dias_sem_atualizacao || 0
      }
    })

    // 7. Calcular resumo
    const valorTotal = oportunidadesEnriquecidas.reduce((sum, op) => sum + op.value, 0)

    // 8. Agrupar por unidade
    const oportunidadesPorUnidade = new Map<number, Oportunidade[]>()
    oportunidadesEnriquecidas.forEach(op => {
      if (op.unidade_id !== null) {
        if (!oportunidadesPorUnidade.has(op.unidade_id)) {
          oportunidadesPorUnidade.set(op.unidade_id, [])
        }
        oportunidadesPorUnidade.get(op.unidade_id)!.push(op)
      }
    })

    const resumoPorUnidade = unidades.map(unidade => {
      const userIdsDaUnidade = unidadesComUsers.get(unidade.id) || []
      const opsDaUnidade = oportunidadesEnriquecidas.filter(op => op.unidade_id === unidade.id)
      const vendedoresIdsComOportunidades = new Set(opsDaUnidade.map(op => op.vendedor_id))
      
      return {
        unidade_id: unidade.id,
        unidade_nome: unidade.nome,
        total_vendedores_unidade: userIdsDaUnidade.length,
        total_vendedores_com_oportunidades: vendedoresIdsComOportunidades.size,
        total_oportunidades: opsDaUnidade.length,
        valor_total: opsDaUnidade.reduce((sum, op) => sum + op.value, 0),
        vendedores: userIdsDaUnidade.map(userId => {
          const vendedor = vendedoresMap.get(userId)
          const opsDoVendedor = opsDaUnidade.filter(op => op.vendedor_id === userId)
          
          return {
            id: userId,
            nome: vendedor?.nome || 'Desconhecido',
            tem_oportunidades: opsDoVendedor.length > 0,
            total_oportunidades: opsDoVendedor.length,
            valor_total: opsDoVendedor.reduce((sum, op) => sum + op.value, 0)
          }
        })
      }
    }).sort((a, b) => b.total_oportunidades - a.total_oportunidades)

    // 9. Agrupar por vendedor
    const oportunidadesPorVendedor = new Map<number, Oportunidade[]>()
    oportunidadesEnriquecidas.forEach(op => {
      if (!oportunidadesPorVendedor.has(op.vendedor_id)) {
        oportunidadesPorVendedor.set(op.vendedor_id, [])
      }
      oportunidadesPorVendedor.get(op.vendedor_id)!.push(op)
    })

    const resumoPorVendedor = Array.from(oportunidadesPorVendedor.entries()).map(([vendedorId, ops]) => {
      return {
        vendedor_id: vendedorId,
        vendedor_nome: ops[0]?.vendedor_nome || 'Desconhecido',
        unidade_id: ops[0]?.unidade_id,
        unidade_nome: ops[0]?.unidade_nome,
        total_oportunidades: ops.length,
        valor_total: ops.reduce((sum, op) => sum + op.value, 0),
        oportunidade_mais_antiga_dias: Math.max(...ops.map(op => op.dias_sem_atualizacao))
      }
    })

    return NextResponse.json({
      success: true,
      filtros: {
        unidades_ids: unidadesIds
      },
      resumo: {
        total_unidades: unidadesIds.length,
        total_vendedores: vendedoresIds.length,
        total_oportunidades: oportunidadesEnriquecidas.length,
        valor_total: valorTotal,
        valor_medio: oportunidadesEnriquecidas.length > 0 
          ? valorTotal / oportunidadesEnriquecidas.length 
          : 0
      },
      resumo_por_unidade: resumoPorUnidade.sort((a, b) => b.total_oportunidades - a.total_oportunidades),
      resumo_por_vendedor: resumoPorVendedor.sort((a, b) => b.total_oportunidades - a.total_oportunidades),
      oportunidades: oportunidadesEnriquecidas,
      vendedores: vendedores.map(v => {
        // Encontrar unidade do vendedor através das oportunidades
        const oportunidadeDoVendedor = oportunidadesEnriquecidas.find(op => op.vendedor_id === v.id)
        return {
          id: v.id,
          nome: v.nome_completo,
          unidade_id: oportunidadeDoVendedor?.unidade_id || null,
          unidade_nome: oportunidadeDoVendedor?.unidade_nome || 'Sem unidade'
        }
      })
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

