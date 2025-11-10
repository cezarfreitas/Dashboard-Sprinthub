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

    // Buscar oportunidades abertas criadas no mês atual
    const queryMesAtual = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE MONTH(o.createDate) = ? 
        AND YEAR(o.createDate) = ?
        AND o.status IN ('open', 'aberta', 'active')
    `

    // Buscar oportunidades abertas criadas em meses anteriores
    const queryMesesAnteriores = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE (
        YEAR(o.createDate) < ? OR 
        (YEAR(o.createDate) = ? AND MONTH(o.createDate) < ?)
      )
      AND o.status IN ('open', 'aberta', 'active')
    `

    const [resultMesAtual, resultMesesAnteriores] = await Promise.all([
      executeQuery(queryMesAtual, [mesAtual, anoAtual]),
      executeQuery(queryMesesAnteriores, [anoAtual, anoAtual, mesAtual])
    ]) as [any[], any[]]

    const abertasMesAtual = resultMesAtual[0]?.total || 0
    const abertasMesesAnteriores = resultMesesAnteriores[0]?.total || 0

    return NextResponse.json({
      success: true,
      data: {
        abertasMesAtual,
        abertasMesesAnteriores,
        totalOportunidades: abertasMesAtual + abertasMesesAnteriores
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
