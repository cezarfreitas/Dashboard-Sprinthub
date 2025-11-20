import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para parse JSON
function parseJSON(value: any): any[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (e) {
      return []
    }
  }
  return []
}

// GET - Buscar total de oportunidades abertas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadesParam = searchParams.get('unidades')

    if (unidadesParam) {
      // Múltiplas unidades selecionadas
      const unidadesIds = unidadesParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      
      if (unidadesIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { total: 0, valorTotal: 0 }
        })
      }

      // Buscar vendedores de todas as unidades selecionadas
      const placeholdersUnidades = unidadesIds.map(() => '?').join(',')
      const unidades = await executeQuery(`
        SELECT users
        FROM unidades
        WHERE id IN (${placeholdersUnidades}) AND ativo = 1
      `, unidadesIds) as any[]

      if (!unidades || unidades.length === 0) {
        return NextResponse.json({
          success: true,
          data: { total: 0, valorTotal: 0 }
        })
      }

      // Extrair todos os vendedores de todas as unidades
      const todosVendedoresIds = new Set<number>()
      unidades.forEach(unidade => {
        const parsedUsers = parseJSON(unidade.users)
        parsedUsers.forEach((u: any) => {
          const id = typeof u === 'object' ? u.id : u
          if (id != null) todosVendedoresIds.add(Number(id))
        })
      })

      if (todosVendedoresIds.size === 0) {
        return NextResponse.json({
          success: true,
          data: { total: 0, valorTotal: 0 }
        })
      }

      // Buscar oportunidades abertas desses vendedores
      const vendedoresArray = Array.from(todosVendedoresIds)
      const placeholdersVendedores = vendedoresArray.map(() => '?').join(',')
      const query = `
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(o.value), 0) as valor_total
        FROM oportunidades o
        WHERE o.user IN (${placeholdersVendedores})
          AND o.status IN ('open', 'aberta', 'active')
          AND (o.archived IS NULL OR o.archived = 0)
      `

      const result = await executeQuery(query, vendedoresArray) as any[]
      
      return NextResponse.json({
        success: true,
        data: {
          total: Number(result[0]?.total || 0),
          valorTotal: Number(result[0]?.valor_total || 0)
        }
      })
      
    } else {
      // Sem filtro - todas as unidades
      const query = `
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(o.value), 0) as valor_total
        FROM oportunidades o
        WHERE o.status IN ('open', 'aberta', 'active')
          AND (o.archived IS NULL OR o.archived = 0)
      `

      const result = await executeQuery(query, []) as any[]

      return NextResponse.json({
        success: true,
        data: {
          total: Number(result[0]?.total || 0),
          valorTotal: Number(result[0]?.valor_total || 0)
        }
      })
    }

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades abertas',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
