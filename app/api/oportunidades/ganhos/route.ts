import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar ganhos do mês atual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')

    // Usar mês e ano atual se não fornecidos
    const dataAtual = new Date()
    const mesAtual = mes ? parseInt(mes) : dataAtual.getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : dataAtual.getFullYear()

    // Buscar oportunidades com status='gain' E gain_date no mês atual
    const queryGanhas = `
      SELECT 
        COUNT(*) as total_oportunidades,
        COALESCE(SUM(value), 0) as total_valor,
        COALESCE(MIN(value), 0) as menor_valor,
        COALESCE(MAX(value), 0) as maior_valor
      FROM oportunidades o
      WHERE o.status = 'gain'
        AND o.gain_date IS NOT NULL
        AND MONTH(o.gain_date) = ? 
        AND YEAR(o.gain_date) = ?
    `

    // Buscar oportunidades com status='gain', gain_date no mês atual E criadas no mês atual
    const queryGanhasCriadasMes = `
      SELECT 
        COUNT(*) as total_oportunidades,
        COALESCE(SUM(value), 0) as total_valor
      FROM oportunidades o
      WHERE o.status = 'gain'
        AND o.gain_date IS NOT NULL
        AND MONTH(o.gain_date) = ? 
        AND YEAR(o.gain_date) = ?
        AND MONTH(o.createDate) = ? 
        AND YEAR(o.createDate) = ?
    `

    // Buscar oportunidades com status='gain', gain_date no mês atual mas criadas em meses anteriores
    const queryGanhasCriadasAnterior = `
      SELECT 
        COUNT(*) as total_oportunidades,
        COALESCE(SUM(value), 0) as total_valor
      FROM oportunidades o
      WHERE o.status = 'gain'
        AND o.gain_date IS NOT NULL
        AND MONTH(o.gain_date) = ? 
        AND YEAR(o.gain_date) = ?
        AND (
          YEAR(o.createDate) < ? OR 
          (YEAR(o.createDate) = ? AND MONTH(o.createDate) < ?)
        )
    `

    const [resultGanhas, resultGanhasCriadasMes, resultGanhasCriadasAnterior] = await Promise.all([
      executeQuery(queryGanhas, [mesAtual, anoAtual]),
      executeQuery(queryGanhasCriadasMes, [mesAtual, anoAtual, mesAtual, anoAtual]),
      executeQuery(queryGanhasCriadasAnterior, [mesAtual, anoAtual, anoAtual, anoAtual, mesAtual])
    ]) as [any[], any[], any[]]

    const dataGanhas = resultGanhas[0] || { total_oportunidades: 0, total_valor: 0, menor_valor: 0, maior_valor: 0 }
    const dataGanhasCriadasMes = resultGanhasCriadasMes[0] || { total_oportunidades: 0, total_valor: 0 }
    const dataGanhasCriadasAnterior = resultGanhasCriadasAnterior[0] || { total_oportunidades: 0, total_valor: 0 }

    return NextResponse.json({
      success: true,
      data: {
        totalOportunidades: dataGanhas.total_oportunidades,
        totalValor: dataGanhas.total_valor,
        menorValor: dataGanhas.menor_valor,
        maiorValor: dataGanhas.maior_valor,
        ganhasCriadasMes: dataGanhasCriadasMes.total_oportunidades,
        ganhasCriadasAnterior: dataGanhasCriadasAnterior.total_oportunidades
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
        message: 'Erro ao buscar ganhos',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
