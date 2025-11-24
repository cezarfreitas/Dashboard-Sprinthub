import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Listar todas as filas de leads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const gestorId = request.headers.get('x-gestor-id')

    // Query simplificada para buscar apenas unidades
    let query = `
      SELECT 
        u.id,
        u.id as unidade_id,
        COALESCE(u.nome, u.name) as unidade_nome,
        u.ativo,
        u.fila_leads,
        u.created_at,
        u.updated_at
      FROM unidades u
      WHERE 1=1
    `

    const params: any[] = []

    // Filtrar apenas unidades do gestor logado
    if (gestorId) {
      const gestorIdNum = parseInt(gestorId, 10)
      if (!isNaN(gestorIdNum)) {
        query += ` AND u.user_gestao = ?`
        params.push(gestorIdNum)
      }
    }

    if (search) {
      query += ` AND (u.nome LIKE ? OR u.name LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ` ORDER BY COALESCE(u.nome, u.name) ASC`

    const unidades = await executeQuery(query, params) as any[]

    // Buscar contagem de vendedores apenas para as unidades retornadas
    let vendedoresPorUnidade: any[] = []
    
    if (unidades.length > 0) {
      const unidadeIds = unidades.map(u => u.id)
      const vendedoresQuery = `
        SELECT 
          unidade_id,
          COUNT(*) as total
        FROM vendedores 
        WHERE ativo = 1 
          AND unidade_id IS NOT NULL
          AND unidade_id IN (${unidadeIds.map(() => '?').join(',')})
        GROUP BY unidade_id
      `
      vendedoresPorUnidade = await executeQuery(vendedoresQuery, unidadeIds) as any[]
    }
    
    // Criar mapa de vendedores por unidade (para contagem)
    const vendedoresCountMap = new Map<number, number>()
    vendedoresPorUnidade.forEach((v: any) => {
      vendedoresCountMap.set(v.unidade_id, Number(v.total || 0))
    })

    // Coletar todos os IDs de vendedores que estão nas filas
    const vendedorIdsSet = new Set<number>()
    unidades.forEach((unidade: any) => {
      if (unidade.fila_leads) {
        try {
          const filaData = typeof unidade.fila_leads === 'string' 
            ? JSON.parse(unidade.fila_leads)
            : unidade.fila_leads
          
          if (Array.isArray(filaData)) {
            filaData.forEach((item: any) => {
              const vendedorId = item.vendedor_id || item.id
              if (vendedorId && typeof vendedorId === 'number') {
                vendedorIdsSet.add(vendedorId)
              }
            })
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    })

    // Buscar nomes dos vendedores
    const vendedoresMap = new Map<number, { name: string; lastName: string }>()
    if (vendedorIdsSet.size > 0) {
      const vendedorIds = Array.from(vendedorIdsSet)
      const vendedoresQuery = `
        SELECT 
          id,
          name,
          lastName
        FROM vendedores 
        WHERE id IN (${vendedorIds.map(() => '?').join(',')})
          AND ativo = 1
      `
      const vendedores = await executeQuery(vendedoresQuery, vendedorIds) as Array<{
        id: number
        name: string
        lastName: string
      }>
      
      vendedores.forEach((v: any) => {
        vendedoresMap.set(Number(v.id), {
          name: v.name || '',
          lastName: v.lastName || ''
        })
      })
    }

    // Buscar contagem de distribuições por vendedor e unidade da tabela fila_leads_log
    const distribuicoesMap = new Map<string, number>() // key: "unidade_id-vendedor_id"
    const unidadeStatsMap = new Map<number, { total: number; ultima_distribuicao: string | null }>() // key: unidade_id
    const ausenciasMap = new Map<string, { data_fim: string }>() // key: "unidade_id-vendedor_id"
    
    if (unidades.length > 0) {
      const unidadeIds = unidades.map(u => u.id)
      
      // Buscar distribuições por vendedor
      const distribuicoesQuery = `
        SELECT 
          unidade_id,
          vendedor_id,
          COUNT(*) as total_distribuicoes
        FROM fila_leads_log
        WHERE unidade_id IN (${unidadeIds.map(() => '?').join(',')})
        GROUP BY unidade_id, vendedor_id
      `
      const distribuicoes = await executeQuery(distribuicoesQuery, unidadeIds) as Array<{
        unidade_id: number
        vendedor_id: number
        total_distribuicoes: number
      }>
      
      distribuicoes.forEach((d: any) => {
        const key = `${d.unidade_id}-${d.vendedor_id}`
        distribuicoesMap.set(key, Number(d.total_distribuicoes || 0))
      })

      // Buscar estatísticas por unidade (total e última distribuição)
      const statsQuery = `
        SELECT 
          unidade_id,
          COUNT(*) as total_distribuicoes,
          MAX(distribuido_em) as ultima_distribuicao
        FROM fila_leads_log
        WHERE unidade_id IN (${unidadeIds.map(() => '?').join(',')})
        GROUP BY unidade_id
      `
      const stats = await executeQuery(statsQuery, unidadeIds) as Array<{
        unidade_id: number
        total_distribuicoes: number
        ultima_distribuicao: string | null
      }>
      
      stats.forEach((s: any) => {
        unidadeStatsMap.set(s.unidade_id, {
          total: Number(s.total_distribuicoes || 0),
          ultima_distribuicao: s.ultima_distribuicao || null
        })
      })

      // Buscar ausências ativas (onde a data atual está entre data_inicio e data_fim)
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const ausenciasQuery = `
        SELECT 
          unidade_id,
          vendedor_id,
          data_fim
        FROM vendedores_ausencias
        WHERE unidade_id IN (${unidadeIds.map(() => '?').join(',')})
          AND data_inicio <= ?
          AND data_fim >= ?
        ORDER BY data_fim ASC
      `
      const ausencias = await executeQuery(ausenciasQuery, [...unidadeIds, now, now]) as Array<{
        unidade_id: number
        vendedor_id: number
        data_fim: string
      }>
      
      ausencias.forEach((a: any) => {
        const key = `${a.unidade_id}-${a.vendedor_id}`
        // Se já existe uma ausência, manter a que tem data_fim mais próxima (já ordenado ASC)
        if (!ausenciasMap.has(key)) {
          ausenciasMap.set(key, {
            data_fim: a.data_fim
          })
        }
      })
    }

    // Processar resultados
    const filas = unidades.map((unidade: any) => {
      let vendedoresFila: any[] = []
      
      // Parse fila_leads JSON e mapear nomes
      if (unidade.fila_leads) {
        try {
          const filaData = typeof unidade.fila_leads === 'string' 
            ? JSON.parse(unidade.fila_leads)
            : unidade.fila_leads
          
          if (Array.isArray(filaData)) {
            vendedoresFila = filaData.map((item: any, index: number) => {
              const vendedorId = item.vendedor_id || item.id
              const vendedor = vendedoresMap.get(vendedorId)
              
              // Buscar contagem de distribuições da tabela fila_leads_log
              const key = `${unidade.id}-${vendedorId}`
              const totalDistribuicoes = distribuicoesMap.get(key) || 0
              
              // Buscar ausência ativa
              const ausencia = ausenciasMap.get(key)
              
              return {
                id: vendedorId,
                nome: vendedor 
                  ? `${vendedor.name} ${vendedor.lastName || ''}`.trim()
                  : (item.nome || 'Sem nome'),
                sequencia: item.sequencia || item.ordem || (index + 1),
                total_distribuicoes: totalDistribuicoes,
                ausencia_retorno: ausencia?.data_fim || null
              }
            })
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Buscar estatísticas da unidade do log
      const stats = unidadeStatsMap.get(unidade.id) || { total: 0, ultima_distribuicao: null }

      return {
        id: unidade.id,
        unidade_id: unidade.unidade_id,
        unidade_nome: unidade.unidade_nome || 'Sem nome',
        total_vendedores: vendedoresCountMap.get(unidade.id) || 0,
        vendedores_fila: vendedoresFila,
        ultima_distribuicao: stats.ultima_distribuicao,
        total_leads_distribuidos: stats.total,
        ativo: Boolean(unidade.ativo),
        created_at: unidade.created_at,
        updated_at: unidade.updated_at
      }
    })

    // Calcular estatísticas
    const stats = {
      total_unidades: filas.length,
      unidades_com_fila: filas.filter(f => f.vendedores_fila.length > 0).length,
      total_vendedores: filas.reduce((sum, f) => sum + f.total_vendedores, 0),
      total_leads_distribuidos: 0,
      ultima_atualizacao: filas.length > 0 
        ? filas.reduce((latest, f) => {
            if (!latest) return f.updated_at
            return new Date(f.updated_at) > new Date(latest) ? f.updated_at : latest
          }, null as string | null)
        : null
    }

    return NextResponse.json({
      success: true,
      filas,
      stats
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar filas de leads',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
