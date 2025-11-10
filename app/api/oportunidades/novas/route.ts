import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar novas oportunidades do mês atual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')

    // Usar mês e ano atual se não fornecidos
    const dataAtual = new Date()
    const mesAtual = mes ? parseInt(mes) : dataAtual.getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : dataAtual.getFullYear()

    // Usar createDate (igual ao funil)
    const dateField = 'createDate'

    // Obter dia atual para comparar o mesmo período
    const diaAtual = dataAtual.getDate()
    
    // Buscar oportunidades criadas no mês atual (até hoje)
    const queryMesAtual = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE MONTH(o.${dateField}) = ? 
        AND YEAR(o.${dateField}) = ?
        AND DAY(o.${dateField}) <= ?
    `

    // Buscar oportunidades criadas no mês anterior (até o mesmo dia)
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual

    const queryMesAnterior = `
      SELECT COUNT(*) as total
      FROM oportunidades o
      WHERE MONTH(o.${dateField}) = ? 
        AND YEAR(o.${dateField}) = ?
        AND DAY(o.${dateField}) <= ?
    `

    const [resultMesAtual, resultMesAnterior] = await Promise.all([
      executeQuery(queryMesAtual, [mesAtual, anoAtual, diaAtual]),
      executeQuery(queryMesAnterior, [mesAnterior, anoAnterior, diaAtual])
    ]) as [any[], any[]]

    const totalOportunidades = resultMesAtual[0]?.total || 0
    const oportunidadesMesAnterior = resultMesAnterior[0]?.total || 0
    
    // Calcular diferença percentual
    const diferencaPercentual = oportunidadesMesAnterior > 0 
      ? ((totalOportunidades - oportunidadesMesAnterior) / oportunidadesMesAnterior) * 100
      : totalOportunidades > 0 ? 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        totalOportunidades,
        oportunidadesMesAnterior,
        diferencaPercentual
      },
      periodo: {
        mes: mesAtual,
        ano: anoAtual,
        mesAnterior,
        anoAnterior,
        diaAtual,
        dateField
      }
    })

  } catch (error) {
    console.error('Erro ao buscar novas oportunidades:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar novas oportunidades',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
