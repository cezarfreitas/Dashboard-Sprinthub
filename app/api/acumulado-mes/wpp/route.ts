import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface UnidadeStats {
  unidade_id: number
  unidade_nome: string
  meta_total: number
  realizado: number
  percentual: number
  vendedores_count: number
  status: 'on-track' | 'warning' | 'off-track' | 'no-meta'
}

/**
 * GET - Gerar imagem da tabela de metas acumuladas para WhatsApp
 * Query params:
 *   - mes: Mês (1-12, default: mês atual)
 *   - ano: Ano (default: ano atual)
 *   - format: 'svg' (default) ou 'json' (retorna dados para conversão no frontend)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const currentDate = new Date()
    const mes = parseInt(searchParams.get('mes') || String(currentDate.getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(currentDate.getFullYear()))
    const format = searchParams.get('format') || 'svg'

    console.log(`[API /acumulado-mes/wpp] Gerando imagem para ${mes}/${ano}`)

    // 1. Buscar metas do mês
    const metas = await executeQuery(`
      SELECT 
        m.unidade_id,
        COALESCE(u.nome, u.name, 'Sem Nome') as unidade_nome,
        SUM(m.meta_valor) as meta_total,
        COUNT(DISTINCT m.vendedor_id) as vendedores_count
      FROM metas_mensais m
      JOIN unidades u ON m.unidade_id = u.id
      WHERE m.mes = ? AND m.ano = ?
      GROUP BY m.unidade_id, u.nome, u.name
      ORDER BY COALESCE(u.nome, u.name)
    `, [mes, ano]) as any[]

    console.log(`[API /acumulado-mes/wpp] ${metas.length} unidades com metas`)

    // 2. Buscar realizações (vendas ganhas) do mês
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`

    const realizacoes = await executeQuery(`
      SELECT 
        v.unidade_id,
        SUM(CAST(o.value AS DECIMAL(15,2))) as realizado
      FROM oportunidades o
      INNER JOIN vendedores v ON o.user COLLATE utf8mb4_unicode_ci = v.username COLLATE utf8mb4_unicode_ci
      WHERE o.status = 'gain'
        AND o.gain_date >= ?
        AND o.gain_date <= ?
        AND v.unidade_id IS NOT NULL
      GROUP BY v.unidade_id
    `, [dataInicio, dataFim]) as any[]

    console.log(`[API /acumulado-mes/wpp] ${realizacoes.length} unidades com vendas`)

    // 3. Criar mapa de realizações
    const realizacoesMap = new Map<number, number>()
    realizacoes.forEach(r => {
      realizacoesMap.set(r.unidade_id, parseFloat(r.realizado || 0))
    })

    // 4. Combinar dados
    const unidadesStats: UnidadeStats[] = metas.map(meta => {
      const realizado = realizacoesMap.get(meta.unidade_id) || 0
      const metaTotal = parseFloat(meta.meta_total || 0)
      const percentual = metaTotal > 0 ? (realizado / metaTotal) * 100 : 0

      let status: UnidadeStats['status'] = 'no-meta'
      if (metaTotal > 0) {
        if (percentual >= 80) status = 'on-track'
        else if (percentual >= 50) status = 'warning'
        else status = 'off-track'
      }

      return {
        unidade_id: meta.unidade_id,
        unidade_nome: meta.unidade_nome,
        meta_total: metaTotal,
        realizado,
        percentual,
        vendedores_count: meta.vendedores_count,
        status
      }
    })

    // Ordenar por percentual (maior primeiro)
    unidadesStats.sort((a, b) => b.percentual - a.percentual)

    // 5. Calcular totais
    const totais = {
      meta_total: unidadesStats.reduce((sum, u) => sum + u.meta_total, 0),
      realizado: unidadesStats.reduce((sum, u) => sum + u.realizado, 0),
      unidades: unidadesStats.length,
      percentual: 0
    }
    totais.percentual = totais.meta_total > 0 ? (totais.realizado / totais.meta_total) * 100 : 0

    console.log(`[API /acumulado-mes/wpp] Totais: Meta ${totais.meta_total}, Realizado ${totais.realizado}, ${totais.percentual.toFixed(1)}%`)

    // 6. Retornar formato solicitado
    if (format === 'json') {
      // Retornar dados em JSON para conversão no frontend
      return NextResponse.json({
        success: true,
        data: {
          unidades: unidadesStats,
          totais,
          periodo: { mes, ano }
        }
      })
    }

    // 7. Gerar SVG da tabela (default)
    const svg = gerarSVGTabela(unidadesStats, totais, mes, ano)

    // 8. Retornar SVG
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Disposition': `inline; filename="metas-${mes}-${ano}.svg"`
      }
    })

  } catch (error) {
    console.error('[API /acumulado-mes/wpp] Erro:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao gerar imagem',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

function gerarSVGTabela(unidades: UnidadeStats[], totais: any, mes: number, ano: number): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const mesNome = meses[mes - 1]
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getStatusColor = (status: UnidadeStats['status']) => {
    switch (status) {
      case 'on-track': return '#22c55e' // green-500
      case 'warning': return '#f59e0b' // amber-500
      case 'off-track': return '#ef4444' // red-500
      default: return '#9ca3af' // gray-400
    }
  }

  const width = 1200
  const headerHeight = 120
  const rowHeight = 50
  const footerHeight = 80
  const totalHeight = headerHeight + (unidades.length * rowHeight) + footerHeight + 40

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap');
      .title { font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 800; fill: #111827; }
      .subtitle { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 600; fill: #6b7280; }
      .header-text { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; fill: #374151; text-transform: uppercase; }
      .cell-text { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; fill: #1f2937; }
      .cell-number { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700; fill: #111827; }
      .footer-text { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; fill: #111827; }
      .footer-number { font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${totalHeight}" fill="#f9fafb"/>
  
  <!-- Header -->
  <rect width="${width}" height="${headerHeight}" fill="#ffffff"/>
  <text x="40" y="50" class="title">📊 Metas ${mesNome}/${ano}</text>
  <text x="40" y="85" class="subtitle">Desempenho por Unidade - Grupo Inteli</text>
  
  <!-- Table Header -->
  <rect y="${headerHeight}" width="${width}" height="40" fill="#f3f4f6"/>
  <text x="40" y="${headerHeight + 25}" class="header-text">Unidade</text>
  <text x="500" y="${headerHeight + 25}" class="header-text" text-anchor="end">Meta</text>
  <text x="700" y="${headerHeight + 25}" class="header-text" text-anchor="end">Realizado</text>
  <text x="900" y="${headerHeight + 25}" class="header-text" text-anchor="end">%</text>
  <text x="1100" y="${headerHeight + 25}" class="header-text" text-anchor="middle">Status</text>
`

  // Table Rows
  let yPos = headerHeight + 40
  unidades.forEach((unidade, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
    const statusColor = getStatusColor(unidade.status)
    
    svg += `
  <!-- Row ${index + 1} -->
  <rect y="${yPos}" width="${width}" height="${rowHeight}" fill="${bgColor}"/>
  <text x="40" y="${yPos + 32}" class="cell-text">${unidade.unidade_nome}</text>
  <text x="500" y="${yPos + 32}" class="cell-number" text-anchor="end">${formatCurrency(unidade.meta_total)}</text>
  <text x="700" y="${yPos + 32}" class="cell-number" text-anchor="end" fill="${statusColor}">${formatCurrency(unidade.realizado)}</text>
  <text x="900" y="${yPos + 32}" class="cell-number" text-anchor="end" fill="${statusColor}">${unidade.percentual.toFixed(1)}%</text>
  <circle cx="1100" cy="${yPos + 25}" r="12" fill="${statusColor}"/>
`
    yPos += rowHeight
  })

  // Footer (Totals)
  svg += `
  <!-- Footer -->
  <rect y="${yPos}" width="${width}" height="${footerHeight}" fill="#1f2937"/>
  <text x="40" y="${yPos + 35}" class="footer-text" fill="#ffffff">TOTAL GERAL</text>
  <text x="500" y="${yPos + 35}" class="footer-number" text-anchor="end" fill="#ffffff">${formatCurrency(totais.meta_total)}</text>
  <text x="700" y="${yPos + 35}" class="footer-number" text-anchor="end" fill="#22c55e">${formatCurrency(totais.realizado)}</text>
  <text x="900" y="${yPos + 35}" class="footer-number" text-anchor="end" fill="#22c55e">${totais.percentual.toFixed(1)}%</text>
  
  <text x="40" y="${yPos + 65}" class="subtitle" fill="#9ca3af">${unidades.length} unidades • Gerado em ${new Date().toLocaleDateString('pt-BR')}</text>
  
</svg>`

  return svg
}

