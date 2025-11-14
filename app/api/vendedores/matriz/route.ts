import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = parseInt(searchParams.get('mes') || new Date().getMonth() + 1 as any)
    const ano = parseInt(searchParams.get('ano') || new Date().getFullYear() as any)
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
          console.warn('Erro ao parsear users:', e)
        }
      }
    }

    const vendedores = await executeQuery(queryVendedores, paramsVendedores) as any[]

    // Buscar estatísticas para cada vendedor
    const matrizVendedores = await Promise.all(vendedores.map(async (vendedor) => {
      // Oportunidades criadas
      const criadas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades
        WHERE user = ?
          AND MONTH(createDate) = ?
          AND YEAR(createDate) = ?
      `, [vendedor.id, mes, ano]) as any[]

      // Oportunidades ganhas
      const ganhas = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(value), 0) as valor
        FROM oportunidades
        WHERE user = ?
          AND status = 'gain'
          AND MONTH(gain_date) = ?
          AND YEAR(gain_date) = ?
      `, [vendedor.id, mes, ano]) as any[]

      // Oportunidades perdidas
      const perdidas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades
        WHERE user = ?
          AND status = 'lost'
          AND MONTH(lost_date) = ?
          AND YEAR(lost_date) = ?
      `, [vendedor.id, mes, ano]) as any[]

      // Oportunidades abertas (sem filtro de data)
      const abertas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades
        WHERE user = ?
          AND status IN ('open', 'aberta', 'active')
      `, [vendedor.id]) as any[]

      // Meta do vendedor
      let meta = 0
      if (unidadeId) {
        const metaResult = await executeQuery(`
          SELECT COALESCE(meta_valor, 0) as meta
          FROM metas_mensais
          WHERE vendedor_id = ?
            AND unidade_id = ?
            AND mes = ?
            AND ano = ?
            AND status = 'ativa'
        `, [vendedor.id, parseInt(unidadeId), mes, ano]) as any[]
        
        meta = metaResult[0]?.meta || 0
      } else {
        // Se não filtrou por unidade, somar metas de todas as unidades
        const metaResult = await executeQuery(`
          SELECT COALESCE(SUM(meta_valor), 0) as meta
          FROM metas_mensais
          WHERE vendedor_id = ?
            AND mes = ?
            AND ano = ?
            AND status = 'ativa'
        `, [vendedor.id, mes, ano]) as any[]
        
        meta = metaResult[0]?.meta || 0
      }

      return {
        id: vendedor.id,
        nome: `${vendedor.name} ${vendedor.lastName}`,
        email: vendedor.email,
        criadas: criadas[0]?.total || 0,
        ganhas: ganhas[0]?.total || 0,
        perdidas: perdidas[0]?.total || 0,
        abertas: abertas[0]?.total || 0,
        valor: ganhas[0]?.valor || 0,
        meta: meta
      }
    }))

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
    console.error('❌ Erro ao buscar matriz de vendedores:', error)
    
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















