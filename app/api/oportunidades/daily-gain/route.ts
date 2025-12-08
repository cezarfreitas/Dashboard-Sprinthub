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

// GET - Buscar receita diária (oportunidades ganhas por dia)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const unidadesParam = searchParams.get('unidades')

    if (!mes || !ano) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros mes e ano são obrigatórios' },
        { status: 400 }
      )
    }

    const mesNum = parseInt(mes)
    const anoNum = parseInt(ano)

    // Construir filtro de unidade
    let filtroUnidade = ''
    const params: any[] = [mesNum, anoNum]

    if (unidadesParam) {
      const unidadesIds = unidadesParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      
      if (unidadesIds.length > 0) {
        // Buscar vendedores de todas as unidades selecionadas
        const placeholders = unidadesIds.map(() => '?').join(',')
        const unidades = await executeQuery(`
          SELECT users FROM unidades WHERE id IN (${placeholders}) AND ativo = 1
        `, unidadesIds) as any[]

        if (unidades && unidades.length > 0) {
          const todosVendedoresIds = new Set<number>()
          unidades.forEach(unidade => {
            const parsedUsers = parseJSON(unidade.users)
            parsedUsers.forEach((u: any) => {
              const id = typeof u === 'object' ? u.id : u
              if (id != null) todosVendedoresIds.add(Number(id))
            })
          })

          if (todosVendedoresIds.size > 0) {
            const vendedoresArray = Array.from(todosVendedoresIds)
            const placeholdersVendedores = vendedoresArray.map(() => '?').join(',')
            filtroUnidade = `AND o.user IN (${placeholdersVendedores})`
            params.push(...vendedoresArray)
          }
        }
      }
    }

    // Buscar oportunidades ganhas por dia (usando GMT-3)
    const query = `
      SELECT 
        DAY(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) as dia,
        DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) as data,
        COUNT(*) as total_oportunidades,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.gain_date IS NOT NULL
        AND MONTH(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ? 
        AND YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?
        ${filtroUnidade}
      GROUP BY dia, data
      ORDER BY dia
    `

    const result = await executeQuery(query, params) as any[]

    return NextResponse.json({
      success: true,
      dados: result.map(r => ({
        dia: r.dia,
        data: r.data,
        total_oportunidades: Number(r.total_oportunidades || 0),
        valor_total: Number(r.valor_total || 0)
      }))
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar receita diária',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
