import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidades perdidas do mês atual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')

    // Usar mês e ano atual se não fornecidos
    const dataAtual = new Date()
    const mesAtual = mes ? parseInt(mes) : dataAtual.getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : dataAtual.getFullYear()

    // Buscar oportunidades perdidas no mês atual
    const queryPerdidas = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE MONTH(o.lost_date) = ? 
        AND YEAR(o.lost_date) = ?
        AND o.status IN ('lost', 'perdida', 'closed')
    `

    // Buscar oportunidades perdidas no mês atual E criadas no mês atual
    const queryPerdidasCriadasMes = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE MONTH(o.lost_date) = ? 
        AND YEAR(o.lost_date) = ?
        AND MONTH(o.createDate) = ? 
        AND YEAR(o.createDate) = ?
        AND o.status IN ('lost', 'perdida', 'closed')
    `

    // Buscar oportunidades perdidas no mês atual mas criadas em meses anteriores
    const queryPerdidasCriadasAnterior = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE MONTH(o.lost_date) = ? 
        AND YEAR(o.lost_date) = ?
        AND (
          YEAR(o.createDate) < ? OR 
          (YEAR(o.createDate) = ? AND MONTH(o.createDate) < ?)
        )
        AND o.status IN ('lost', 'perdida', 'closed')
    `

    const [resultPerdidas, resultPerdidasCriadasMes, resultPerdidasCriadasAnterior] = await Promise.all([
      executeQuery(queryPerdidas, [mesAtual, anoAtual]),
      executeQuery(queryPerdidasCriadasMes, [mesAtual, anoAtual, mesAtual, anoAtual]),
      executeQuery(queryPerdidasCriadasAnterior, [mesAtual, anoAtual, anoAtual, anoAtual, mesAtual])
    ]) as [any[], any[], any[]]

    const totalOportunidades = resultPerdidas[0]?.total || 0
    const perdidasCriadasMes = resultPerdidasCriadasMes[0]?.total || 0
    const perdidasCriadasAnterior = resultPerdidasCriadasAnterior[0]?.total || 0

    return NextResponse.json({
      success: true,
      data: {
        totalOportunidades,
        perdidasCriadasMes,
        perdidasCriadasAnterior
      },
      periodo: {
        mes: mesAtual,
        ano: anoAtual
      }
    })

  } catch (error) {
    console.error('Erro ao buscar oportunidades perdidas:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades perdidas',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
