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

// GET - Buscar oportunidades ganhas (totais e por dia)
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

    // Buscar total de oportunidades ganhas no mês
    const queryTotal = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.gain_date IS NOT NULL
        AND MONTH(o.gain_date) = ? 
        AND YEAR(o.gain_date) = ?
        ${filtroUnidade}
    `

    const resultTotal = await executeQuery(queryTotal, params) as any[]

    // Buscar por dia (para o gráfico)
    const queryDiario = `
      SELECT 
        DAY(o.gain_date) as dia,
        DATE(o.gain_date) as data,
        COUNT(*) as total_oportunidades,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.gain_date IS NOT NULL
        AND MONTH(o.gain_date) = ? 
        AND YEAR(o.gain_date) = ?
        ${filtroUnidade}
      GROUP BY dia, data
      ORDER BY dia
    `

    const resultDiario = await executeQuery(queryDiario, params) as any[]

    // Buscar meta do mês (se houver)
    const queryMeta = `
      SELECT COALESCE(SUM(meta_valor), 0) as meta_total
      FROM metas_mensais
      WHERE mes = ? AND ano = ?
    `
    const resultMeta = await executeQuery(queryMeta, [mesNum, anoNum]) as any[]

    return NextResponse.json({
      success: true,
      data: {
        totalOportunidades: Number(resultTotal[0]?.total || 0),
        totalValor: Number(resultTotal[0]?.valor_total || 0)
      },
      dados: resultDiario.map(r => ({
        dia: r.dia,
        data: r.data,
        total_oportunidades: Number(r.total_oportunidades || 0),
        valor_total: Number(r.valor_total || 0)
      })),
      meta_total: Number(resultMeta[0]?.meta_total || 0)
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades ganhas',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
