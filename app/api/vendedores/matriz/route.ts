import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))
    const unidadeId = searchParams.get('unidadeId')

    // Buscar vendedores
    let queryVendedores = `
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.email
      FROM vendedores v
      WHERE v.ativo = 1
      ORDER BY v.name, v.lastName
    `
    const paramsVendedores: any[] = []

    // Se filtrar por unidade, buscar apenas vendedores daquela unidade
    if (unidadeId) {
      const unidadeData = await executeQuery(`
        SELECT users FROM unidades WHERE id = ?
      `, [parseInt(unidadeId)]) as any[]

      if (unidadeData.length > 0 && unidadeData[0].users) {
        try {
          const parsed = typeof unidadeData[0].users === 'string' 
            ? JSON.parse(unidadeData[0].users) 
            : unidadeData[0].users
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            const userIds = parsed
              .map((u: any) => typeof u === 'object' ? u.id : u)
              .filter((id: any) => typeof id === 'number')
            
            if (userIds.length > 0) {
              const placeholders = userIds.map(() => '?').join(',')
              queryVendedores = `
                SELECT 
                  v.id,
                  v.name,
                  v.lastName,
                  v.email
                FROM vendedores v
                WHERE v.ativo = 1 AND v.id IN (${placeholders})
                ORDER BY v.name, v.lastName
              `
              paramsVendedores.push(...userIds)
            }
          }
        } catch (e) {
          // Silent fail - continue with all vendedores
        }
      }
    }

    const vendedores = await executeQuery(queryVendedores, paramsVendedores) as any[]

    if (vendedores.length === 0) {
      return NextResponse.json({
        success: true,
        mes,
        ano,
        vendedores: [],
        totais: {
          criadas: 0,
          ganhas: 0,
          perdidas: 0,
          abertas: 0,
          valor: 0,
          meta: 0
        }
      })
    }

    // Obter todos os IDs dos vendedores
    const vendedorIds = vendedores.map(v => v.id)
    const placeholders = vendedorIds.map(() => '?').join(',')

    // Buscar todas as oportunidades de uma vez com agregação por vendedor
    const [criadas, ganhas, perdidas, abertas] = await Promise.all([
      // Oportunidades criadas
      executeQuery(`
        SELECT 
          user,
          COUNT(*) as total
        FROM oportunidades
        WHERE user IN (${placeholders})
          AND MONTH(createDate) = ?
          AND YEAR(createDate) = ?
        GROUP BY user
      `, [...vendedorIds, mes, ano]) as Promise<any[]>,
      
      // Oportunidades ganhas
      executeQuery(`
        SELECT 
          user,
          COUNT(*) as total,
          COALESCE(SUM(value), 0) as valor
        FROM oportunidades
        WHERE user IN (${placeholders})
          AND status = 'gain'
          AND MONTH(gain_date) = ?
          AND YEAR(gain_date) = ?
        GROUP BY user
      `, [...vendedorIds, mes, ano]) as Promise<any[]>,
      
      // Oportunidades perdidas
      executeQuery(`
        SELECT 
          user,
          COUNT(*) as total
        FROM oportunidades
        WHERE user IN (${placeholders})
          AND status = 'lost'
          AND MONTH(lost_date) = ?
          AND YEAR(lost_date) = ?
        GROUP BY user
      `, [...vendedorIds, mes, ano]) as Promise<any[]>,
      
      // Oportunidades abertas (sem filtro de data)
      executeQuery(`
        SELECT 
          user,
          COUNT(*) as total
        FROM oportunidades
        WHERE user IN (${placeholders})
          AND status IN ('open', 'aberta', 'active')
        GROUP BY user
      `, vendedorIds) as Promise<any[]>
    ])

    // Criar mapas para acesso rápido
    const criadasMap = new Map(criadas.map(o => [o.user, Number(o.total)]))
    const ganhasMap = new Map(ganhas.map(o => [o.user, { total: Number(o.total), valor: Number(o.valor) }]))
    const perdidasMap = new Map(perdidas.map(o => [o.user, Number(o.total)]))
    const abertasMap = new Map(abertas.map(o => [o.user, Number(o.total)]))

    // Buscar metas de todos os vendedores de uma vez
    let metasQuery: string
    let metasParams: any[]

    if (unidadeId) {
      metasQuery = `
        SELECT 
          vendedor_id,
          COALESCE(meta_valor, 0) as meta
        FROM metas_mensais
        WHERE vendedor_id IN (${placeholders})
          AND unidade_id = ?
          AND mes = ?
          AND ano = ?
          AND status = 'ativa'
      `
      metasParams = [...vendedorIds, parseInt(unidadeId), mes, ano]
    } else {
      metasQuery = `
        SELECT 
          vendedor_id,
          COALESCE(SUM(meta_valor), 0) as meta
        FROM metas_mensais
        WHERE vendedor_id IN (${placeholders})
          AND mes = ?
          AND ano = ?
          AND status = 'ativa'
        GROUP BY vendedor_id
      `
      metasParams = [...vendedorIds, mes, ano]
    }

    const metasResult = await executeQuery(metasQuery, metasParams) as any[]
    const metasMap = new Map(metasResult.map(m => [m.vendedor_id, Number(m.meta)]))

    // Construir matriz de vendedores com os dados agregados
    const matrizVendedores = vendedores.map(vendedor => {
      const ganho = ganhasMap.get(vendedor.id)
      
      return {
        id: vendedor.id,
        nome: `${vendedor.name} ${vendedor.lastName}`,
        email: vendedor.email,
        criadas: criadasMap.get(vendedor.id) || 0,
        ganhas: ganho?.total || 0,
        perdidas: perdidasMap.get(vendedor.id) || 0,
        abertas: abertasMap.get(vendedor.id) || 0,
        valor: ganho?.valor || 0,
        meta: metasMap.get(vendedor.id) || 0
      }
    })

    // Calcular totais
    const totais = {
      criadas: matrizVendedores.reduce((sum, v) => sum + v.criadas, 0),
      ganhas: matrizVendedores.reduce((sum, v) => sum + v.ganhas, 0),
      perdidas: matrizVendedores.reduce((sum, v) => sum + v.perdidas, 0),
      abertas: matrizVendedores.reduce((sum, v) => sum + v.abertas, 0),
      valor: matrizVendedores.reduce((sum, v) => sum + v.valor, 0),
      meta: matrizVendedores.reduce((sum, v) => sum + v.meta, 0)
    }

    return NextResponse.json({
      success: true,
      mes,
      ano,
      vendedores: matrizVendedores,
      totais
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar matriz de vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
