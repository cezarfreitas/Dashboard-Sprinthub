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

export async function GET() {
  try {
    // Buscar todas as unidades ativas
    const unidades = await executeQuery(`
      SELECT 
        id, 
        COALESCE(nome, name) as nome, 
        users
      FROM unidades 
      WHERE ativo = 1
        AND (nome IS NOT NULL OR name IS NOT NULL)
      ORDER BY COALESCE(nome, name)
    `) as any[]

    // Buscar todos os vendedores uma vez
    const todosVendedores = await executeQuery(`
      SELECT id FROM vendedores WHERE ativo = 1
    `) as any[]
    const vendedoresAtivosSet = new Set(todosVendedores.map(v => v.id))

    // Preparar mapa de IDs de vendedores por unidade
    const unidadeVendedoresMap = new Map<number, number[]>()
    
    unidades.forEach(unidade => {
      const parsedUsers = parseJSON(unidade.users)
      const userIds = parsedUsers
        .map((u: any) => typeof u === 'object' ? u.id : u)
        .filter((id: any) => typeof id === 'number' && vendedoresAtivosSet.has(id))
      
      if (userIds.length > 0) {
        unidadeVendedoresMap.set(unidade.id, userIds)
      }
    })

    // Coletar todos os vendedores únicos de todas as unidades
    const todosVendedoresIds = [...new Set(
      Array.from(unidadeVendedoresMap.values()).flat()
    )]

    if (todosVendedoresIds.length === 0) {
      // Sem vendedores, retornar unidades vazias
      return NextResponse.json({
        success: true,
        unidades: unidades.map(u => ({
          id: u.id,
          nome: u.nome,
          nome_exibicao: u.nome,
          oportunidades_abertas: 0,
          oportunidades_ganhas: 0,
          oportunidades_perdidas: 0,
          valor_ganho: 0
        }))
      })
    }

    // Buscar oportunidades de todos os vendedores de uma vez
    const placeholders = todosVendedoresIds.map(() => '?').join(',')
    
    const [abertas, ganhas, perdidas] = await Promise.all([
      // Oportunidades abertas
      executeQuery(`
        SELECT user, COUNT(*) as total
        FROM oportunidades
        WHERE user IN (${placeholders})
          AND status IN ('open', 'aberta', 'active')
        GROUP BY user
      `, todosVendedoresIds) as Promise<any[]>,
      
      // Oportunidades ganhas
      executeQuery(`
        SELECT 
          user,
          COUNT(*) as total,
          COALESCE(SUM(value), 0) as valor
        FROM oportunidades
        WHERE user IN (${placeholders})
          AND status = 'gain'
        GROUP BY user
      `, todosVendedoresIds) as Promise<any[]>,
      
      // Oportunidades perdidas
      executeQuery(`
        SELECT user, COUNT(*) as total
        FROM oportunidades
        WHERE user IN (${placeholders})
          AND status = 'lost'
        GROUP BY user
      `, todosVendedoresIds) as Promise<any[]>
    ])

    // Criar mapas para acesso rápido
    const abertasMap = new Map(abertas.map(o => [o.user, Number(o.total)]))
    const ganhasMap = new Map(ganhas.map(o => [o.user, { total: Number(o.total), valor: Number(o.valor) }]))
    const perdidasMap = new Map(perdidas.map(o => [o.user, Number(o.total)]))

    // Processar cada unidade
    const unidadesComOportunidades = unidades.map(unidade => {
      const vendedoresIds = unidadeVendedoresMap.get(unidade.id) || []
      
      if (vendedoresIds.length === 0) {
        return {
          id: unidade.id,
          nome: unidade.nome,
          nome_exibicao: unidade.nome,
          oportunidades_abertas: 0,
          oportunidades_ganhas: 0,
          oportunidades_perdidas: 0,
          valor_ganho: 0
        }
      }

      // Somar estatísticas dos vendedores da unidade
      let totalAbertas = 0
      let totalGanhas = 0
      let totalPerdidas = 0
      let totalValor = 0

      vendedoresIds.forEach(vendedorId => {
        totalAbertas += abertasMap.get(vendedorId) || 0
        
        const ganho = ganhasMap.get(vendedorId)
        if (ganho) {
          totalGanhas += ganho.total
          totalValor += ganho.valor
        }
        
        totalPerdidas += perdidasMap.get(vendedorId) || 0
      })

      return {
        id: unidade.id,
        nome: unidade.nome,
        nome_exibicao: unidade.nome,
        oportunidades_abertas: totalAbertas,
        oportunidades_ganhas: totalGanhas,
        oportunidades_perdidas: totalPerdidas,
        valor_ganho: totalValor
      }
    })

    return NextResponse.json({
      success: true,
      unidades: unidadesComOportunidades
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
