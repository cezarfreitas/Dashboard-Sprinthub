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

// GET - Buscar oportunidades abertas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const vendedor_id = searchParams.get('vendedor_id')
    const unidade_id = searchParams.get('unidade_id')

    // Usar mês e ano atual se não fornecidos
    const dataAtual = new Date()
    const mesAtual = mes ? parseInt(mes) : dataAtual.getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : dataAtual.getFullYear()

    // Construir filtros adicionais
    let filtrosAdicionais = ''
    const params: any[] = []

    // Filtro por vendedor
    if (vendedor_id) {
      filtrosAdicionais += ' AND o.user = ?'
      params.push(parseInt(vendedor_id))
    }

    // Filtro por unidade (buscar vendedores da unidade)
    if (unidade_id) {
      const unidadeId = parseInt(unidade_id)
      
      // Buscar vendedores da unidade
      const unidade = await executeQuery(`
        SELECT users FROM unidades WHERE id = ? AND ativo = 1
      `, [unidadeId]) as any[]

      if (unidade && unidade.length > 0) {
        const parsedUsers = parseJSON(unidade[0].users)
        const userIds = parsedUsers
          .map((u: any) => typeof u === 'object' ? u.id : u)
          .filter((id: any) => typeof id === 'number')

        if (userIds.length > 0) {
          const placeholders = userIds.map(() => '?').join(',')
          filtrosAdicionais += ` AND o.user IN (${placeholders})`
          params.push(...userIds)
        } else {
          // Unidade sem vendedores - retornar zero
          return NextResponse.json({
            success: true,
            data: {
              totalOportunidades: 0,
              abertasMesAtual: 0,
              abertasMesesAnteriores: 0
            },
            periodo: {
              mes: mesAtual,
              ano: anoAtual
            }
          })
        }
      } else {
        // Unidade não encontrada - retornar zero
        return NextResponse.json({
          success: true,
          data: {
            totalOportunidades: 0,
            abertasMesAtual: 0,
            abertasMesesAnteriores: 0
          },
          periodo: {
            mes: mesAtual,
            ano: anoAtual
          }
        })
      }
    }

    // Buscar total de oportunidades abertas (todas, sem filtro de período)
    const queryTotal = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE o.status IN ('open', 'aberta', 'active')
        AND (o.archived IS NULL OR o.archived = 0)
        ${filtrosAdicionais}
    `

    // Buscar oportunidades abertas criadas no mês atual
    const queryMesAtual = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE o.status IN ('open', 'aberta', 'active')
        AND (o.archived IS NULL OR o.archived = 0)
        AND MONTH(o.createDate) = ?
        AND YEAR(o.createDate) = ?
        ${filtrosAdicionais}
    `

    // Buscar oportunidades abertas criadas em meses anteriores
    const queryMesesAnteriores = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE o.status IN ('open', 'aberta', 'active')
        AND (o.archived IS NULL OR o.archived = 0)
        AND (
          YEAR(o.createDate) < ?
          OR (YEAR(o.createDate) = ? AND MONTH(o.createDate) < ?)
        )
        ${filtrosAdicionais}
    `

    // Executar queries
    const [resultTotal, resultMesAtual, resultMesesAnteriores] = await Promise.all([
      executeQuery(queryTotal, params),
      executeQuery(queryMesAtual, [mesAtual, anoAtual, ...params]),
      executeQuery(queryMesesAnteriores, [anoAtual, anoAtual, mesAtual, ...params])
    ]) as [any[], any[], any[]]

    const totalOportunidades = Number(resultTotal[0]?.total || 0)
    const abertasMesAtual = Number(resultMesAtual[0]?.total || 0)
    const abertasMesesAnteriores = Number(resultMesesAnteriores[0]?.total || 0)

    return NextResponse.json({
      success: true,
      data: {
        totalOportunidades,
        abertasMesAtual,
        abertasMesesAnteriores
      },
      periodo: {
        mes: mesAtual,
        ano: anoAtual
      }
    })

  } catch (error) {
    console.error('Erro ao buscar oportunidades abertas:', error)
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

