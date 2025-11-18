import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidades abertas do mês atual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')

    // Usar mês e ano atual se não fornecidos
    const dataAtual = new Date()
    const mesAtual = mes ? parseInt(mes) : dataAtual.getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : dataAtual.getFullYear()

    // Buscar oportunidades abertas criadas no mês atual (com valor)
    const queryMesAtual = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE MONTH(o.createDate) = ? 
        AND YEAR(o.createDate) = ?
        AND o.status IN ('open', 'aberta', 'active')
    `

    // Buscar oportunidades abertas criadas em meses anteriores (com valor)
    const queryMesesAnteriores = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE (
        YEAR(o.createDate) < ? OR 
        (YEAR(o.createDate) = ? AND MONTH(o.createDate) < ?)
      )
      AND o.status IN ('open', 'aberta', 'active')
    `

    // Buscar valor total de todas as oportunidades abertas
    const queryValorTotal = `
      SELECT COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.status IN ('open', 'aberta', 'active')
    `

    const [resultMesAtual, resultMesesAnteriores, resultValorTotal] = await Promise.all([
      executeQuery(queryMesAtual, [mesAtual, anoAtual]),
      executeQuery(queryMesesAnteriores, [anoAtual, anoAtual, mesAtual]),
      executeQuery(queryValorTotal, [])
    ]) as [any[], any[], any[]]

    const abertasMesAtual = resultMesAtual[0]?.total || 0
    const abertasMesesAnteriores = resultMesesAnteriores[0]?.total || 0
    const valorTotalAbertas = Number(resultValorTotal[0]?.valor_total || 0)

    return NextResponse.json({
      success: true,
      data: {
        abertasMesAtual,
        abertasMesesAnteriores,
        totalOportunidades: abertasMesAtual + abertasMesesAnteriores,
        valorTotalAbertas
      },
      periodo: {
        mes: mesAtual,
        ano: anoAtual
      }
    })

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
