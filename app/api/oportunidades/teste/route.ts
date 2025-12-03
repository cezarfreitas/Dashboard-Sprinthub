import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar dados customizados para gráficos de teste
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodoInicio = searchParams.get('data_inicio')
    const periodoFim = searchParams.get('data_fim')

    // Construir filtro de data
    let filtroData = ''
    const params: any[] = []
    
    if (periodoInicio && periodoFim) {
      filtroData = `AND DATE(o.createDate) BETWEEN ? AND ?`
      params.push(periodoInicio, periodoFim)
    }

    // 1. Distribuição por Status
    const queryStatus = `
      SELECT 
        COALESCE(o.status, 'unknown') as status,
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.archived = 0
        ${filtroData}
      GROUP BY o.status
      ORDER BY total DESC
    `
    const statusData = await executeQuery(queryStatus, params) as any[]

    // 2. Valor total por mês
    const queryValorMes = `
      SELECT 
        DATE_FORMAT(o.createDate, '%Y-%m') as mes,
        DATE_FORMAT(o.createDate, '%b/%Y') as mes_formatado,
        COUNT(*) as total_oportunidades,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.archived = 0
        ${filtroData}
      GROUP BY mes, mes_formatado
      ORDER BY mes DESC
      LIMIT 12
    `
    const valorMesData = await executeQuery(queryValorMes, params) as any[]

    // 3. Top 10 Vendedores por Valor
    const queryTopVendedores = `
      SELECT 
        o.user as vendedor,
        COUNT(*) as total_oportunidades,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.archived = 0
        AND o.user IS NOT NULL
        AND o.user != ''
        ${filtroData}
      GROUP BY o.user
      ORDER BY valor_total DESC
      LIMIT 10
    `
    const topVendedoresData = await executeQuery(queryTopVendedores, params) as any[]

    // 4. Oportunidades Ganhas vs Perdidas por mês
    const queryGanhasPerdidas = `
      SELECT 
        DATE_FORMAT(COALESCE(o.gain_date, o.lost_date, o.createDate), '%Y-%m') as mes,
        DATE_FORMAT(COALESCE(o.gain_date, o.lost_date, o.createDate), '%b/%Y') as mes_formatado,
        SUM(CASE WHEN o.status = 'won' THEN 1 ELSE 0 END) as ganhas,
        SUM(CASE WHEN o.status = 'won' THEN o.value ELSE 0 END) as valor_ganhas,
        SUM(CASE WHEN o.status = 'lost' THEN 1 ELSE 0 END) as perdidas,
        SUM(CASE WHEN o.status = 'lost' THEN o.value ELSE 0 END) as valor_perdidas
      FROM oportunidades o
      WHERE o.archived = 0
        AND (o.status = 'won' OR o.status = 'lost')
        ${filtroData}
      GROUP BY mes, mes_formatado
      ORDER BY mes DESC
      LIMIT 12
    `
    const ganhasPerdidasData = await executeQuery(queryGanhasPerdidas, params) as any[]

    // 5. Distribuição por Canal de Vendas
    const queryCanal = `
      SELECT 
        COALESCE(o.sale_channel, 'Não informado') as canal,
        COUNT(*) as total,
        COALESCE(SUM(o.value), 0) as valor_total
      FROM oportunidades o
      WHERE o.archived = 0
        ${filtroData}
      GROUP BY o.sale_channel
      ORDER BY total DESC
      LIMIT 10
    `
    const canalData = await executeQuery(queryCanal, params) as any[]

    // 6. Taxa de Conversão por Mês
    const queryTaxaConversao = `
      SELECT 
        DATE_FORMAT(o.createDate, '%Y-%m') as mes,
        DATE_FORMAT(o.createDate, '%b/%Y') as mes_formatado,
        COUNT(*) as total_criadas,
        SUM(CASE WHEN o.status = 'won' THEN 1 ELSE 0 END) as ganhas,
        SUM(CASE WHEN o.status = 'lost' THEN 1 ELSE 0 END) as perdidas,
        ROUND(
          (SUM(CASE WHEN o.status = 'won' THEN 1 ELSE 0 END) * 100.0) / 
          NULLIF(COUNT(*), 0), 
          2
        ) as taxa_conversao
      FROM oportunidades o
      WHERE o.archived = 0
        ${filtroData}
      GROUP BY mes, mes_formatado
      ORDER BY mes DESC
      LIMIT 12
    `
    const taxaConversaoData = await executeQuery(queryTaxaConversao, params) as any[]

    return NextResponse.json({
      success: true,
      data: {
        status: statusData.map(r => ({
          status: r.status || 'unknown',
          total: Number(r.total || 0),
          valor_total: Number(r.valor_total || 0)
        })),
        valorPorMes: valorMesData.map(r => ({
          mes: r.mes,
          mes_formatado: r.mes_formatado,
          total_oportunidades: Number(r.total_oportunidades || 0),
          valor_total: Number(r.valor_total || 0)
        })),
        topVendedores: topVendedoresData.map(r => ({
          vendedor: r.vendedor || 'Não informado',
          total_oportunidades: Number(r.total_oportunidades || 0),
          valor_total: Number(r.valor_total || 0)
        })),
        ganhasPerdidas: ganhasPerdidasData.map(r => ({
          mes: r.mes,
          mes_formatado: r.mes_formatado,
          ganhas: Number(r.ganhas || 0),
          valor_ganhas: Number(r.valor_ganhas || 0),
          perdidas: Number(r.perdidas || 0),
          valor_perdidas: Number(r.valor_perdidas || 0)
        })),
        canais: canalData.map(r => ({
          canal: r.canal || 'Não informado',
          total: Number(r.total || 0),
          valor_total: Number(r.valor_total || 0)
        })),
        taxaConversao: taxaConversaoData.map(r => ({
          mes: r.mes,
          mes_formatado: r.mes_formatado,
          total_criadas: Number(r.total_criadas || 0),
          ganhas: Number(r.ganhas || 0),
          perdidas: Number(r.perdidas || 0),
          taxa_conversao: Number(r.taxa_conversao || 0)
        }))
      }
    })

  } catch (error) {
    console.error('Erro ao buscar dados customizados:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar dados',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

