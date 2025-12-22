import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

// Helper para converter data de São Paulo para UTC
function formatDateSaoPauloToUTC(dateStr: string, isEnd: boolean = false): string {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }
  
  const [year, month, day] = dateStr.split('-').map(Number)
  const dateSP = new Date(year, month - 1, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, 0)
  
  // Adicionar 3 horas para converter de São Paulo (GMT-3) para UTC (GMT+0)
  const dateUTC = new Date(dateSP.getTime() + (3 * 60 * 60 * 1000))
  
  // Formatar para MySQL: YYYY-MM-DD HH:MM:SS
  const yearUTC = dateUTC.getFullYear()
  const monthUTC = String(dateUTC.getMonth() + 1).padStart(2, '0')
  const dayUTC = String(dateUTC.getDate()).padStart(2, '0')
  const hours = String(dateUTC.getHours()).padStart(2, '0')
  const minutes = String(dateUTC.getMinutes()).padStart(2, '0')
  const seconds = String(dateUTC.getSeconds()).padStart(2, '0')
  
  return `${yearUTC}-${monthUTC}-${dayUTC} ${hours}:${minutes}:${seconds}`
}

/**
 * GET - Retorna imagem PNG com soma total de oportunidades ganhas no período
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const currentDate = new Date()
    const mes = parseInt(searchParams.get('mes') || String(currentDate.getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(currentDate.getFullYear()))

    console.log(`[API meta.png] Gerando imagem PNG para ${mes}/${ano}`)

    // Calcular período
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`

    console.log(`[API meta.png] Período: ${dataInicio} até ${dataFim}`)
    
    const dataInicioUTC = formatDateSaoPauloToUTC(dataInicio, false)
    const dataFimUTC = formatDateSaoPauloToUTC(dataFim, true)
    
    console.log(`[API meta.png] Datas UTC: ${dataInicioUTC} até ${dataFimUTC}`)
    
    // 1. Buscar todas as unidades ativas
    const unidades = await executeQuery(`
      SELECT id, COALESCE(nome, name) as nome, users 
      FROM unidades 
      WHERE ativo = 1
      ORDER BY COALESCE(nome, name)
    `) as any[]
    
    console.log(`[API meta.png] ${unidades.length} unidades ativas encontradas`)

    // 1.1 Buscar metas do mês por unidade (soma)
    const metasPorUnidade = await executeQuery(
      `
        SELECT unidade_id, COALESCE(SUM(meta_valor), 0) as meta_total
        FROM metas_mensais
        WHERE mes = ? AND ano = ?
        GROUP BY unidade_id
      `,
      [mes, ano]
    ) as any[]

    const metaMap = new Map<number, number>()
    metasPorUnidade.forEach((m) => {
      metaMap.set(Number(m.unidade_id), Number(m.meta_total || 0))
    })
    
    // 2. Buscar todos os vendedores ativos
    const todosVendedores = await executeQuery(`
      SELECT id, username 
      FROM vendedores 
      WHERE ativo = 1
    `) as any[]
    
    const vendedoresAtivosSet = new Set(todosVendedores.map(v => v.id))
    
    console.log(`[API meta.png] ${todosVendedores.length} vendedores ativos encontrados`)
    
    // 3. Criar mapa de vendedor_id -> unidade_id
    const vendedorIdToUnidade = new Map<number, number>()
    
    unidades.forEach(unidade => {
      if (!unidade.users) return
      
      let parsedUsers: any[] = []
      try {
        if (typeof unidade.users === 'string') {
          parsedUsers = JSON.parse(unidade.users)
        } else if (Array.isArray(unidade.users)) {
          parsedUsers = unidade.users
        } else if (typeof unidade.users === 'object') {
          parsedUsers = [unidade.users]
        }
      } catch (e) {
        return
      }
      
      if (!Array.isArray(parsedUsers)) return
      
      parsedUsers.forEach((u: any) => {
        let vendedorId: number | null = null
        
        if (typeof u === 'object' && u !== null) {
          vendedorId = u.id || u.user_id || u.vendedor_id
        } else if (typeof u === 'number') {
          vendedorId = u
        } else if (typeof u === 'string') {
          const parsed = parseInt(u.trim())
          if (!isNaN(parsed)) vendedorId = parsed
        }
        
        if (vendedorId && vendedoresAtivosSet.has(vendedorId)) {
          vendedorIdToUnidade.set(vendedorId, unidade.id)
        }
      })
    })
    
    console.log(`[API meta.png] ${vendedorIdToUnidade.size} vendedores mapeados para unidades`)
    
    // 4. Buscar oportunidades ganhas no período
    const oportunidades = await executeQuery(`
      SELECT 
        o.user,
        COUNT(*) as quantidade,
        SUM(CAST(o.value AS DECIMAL(15,2))) as valor_total
      FROM oportunidades o
      WHERE o.status = 'gain'
        AND o.gain_date IS NOT NULL
        AND o.gain_date >= ?
        AND o.gain_date <= ?
        AND o.archived = 0
      GROUP BY o.user
    `, [dataInicioUTC, dataFimUTC]) as any[]
    
    console.log(`[API meta.png] ${oportunidades.length} vendedores com vendas no período`)
    
    // 5. Agrupar por unidade
    const unidadesMap = new Map<number, { nome: string, valor: number, quantidade: number, meta: number }>()
    
    // Inicializar todas as unidades com 0
    unidades.forEach(u => {
      unidadesMap.set(u.id, { nome: u.nome, valor: 0, quantidade: 0, meta: metaMap.get(Number(u.id)) || 0 })
    })
    
    // Somar valores por unidade
    let vendedoresNaoMapeados = 0
    oportunidades.forEach(op => {
      const vendedorId = parseInt(op.user)
      const unidadeId = vendedorIdToUnidade.get(vendedorId)
      if (unidadeId && unidadesMap.has(unidadeId)) {
        const unidade = unidadesMap.get(unidadeId)!
        unidade.valor += parseFloat(op.valor_total || 0)
        unidade.quantidade += parseInt(op.quantidade || 0)
      } else {
        vendedoresNaoMapeados++
        if (vendedoresNaoMapeados <= 5) {
          console.log(`[API meta.png] Vendedor não mapeado: ID ${op.user}`)
        }
      }
    })
    
    if (vendedoresNaoMapeados > 0) {
      console.log(`[API meta.png] Total de vendedores não mapeados: ${vendedoresNaoMapeados}`)
    }
    
    // Converter para array e ordenar por valor (maior primeiro)
    const unidadesComVendas = Array.from(unidadesMap.entries())
      .map(([id, data]) => ({
        id,
        nome: data.nome,
        valor: data.valor,
        quantidade: data.quantidade,
        meta: data.meta,
        ticket_medio: data.quantidade > 0 ? data.valor / data.quantidade : 0,
        percentual_meta: data.meta > 0 ? (data.valor / data.meta) * 100 : 0
      }))
      .filter(u => u.valor > 0 || u.meta > 0) // Mostrar unidades com vendas OU meta
      .sort((a, b) => b.valor - a.valor)
    
    // Calcular totais
    const totalOportunidades = unidadesComVendas.reduce((sum, u) => sum + u.quantidade, 0)
    const valorTotal = unidadesComVendas.reduce((sum, u) => sum + u.valor, 0)
    const metaTotal = unidadesComVendas.reduce((sum, u) => sum + u.meta, 0)
    const ticketMedioGeral = totalOportunidades > 0 ? valorTotal / totalOportunidades : 0
    const percentualMetaGeral = metaTotal > 0 ? (valorTotal / metaTotal) * 100 : 0
    
    console.log(`[API meta.png] ${unidadesComVendas.length} unidades com vendas`)
    console.log(`[API meta.png] Total: ${totalOportunidades} oportunidades, R$ ${valorTotal.toFixed(2)}`)

    // Gerar SVG
    const svg = gerarSVG(
      mes,
      ano,
      unidadesComVendas,
      totalOportunidades,
      valorTotal,
      metaTotal,
      ticketMedioGeral,
      percentualMetaGeral,
      dataInicio,
      dataFim
    )

    // Converter SVG para PNG usando sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({
        quality: 100,
        compressionLevel: 6
      })
      .toBuffer()

    console.log(`[API meta.png] PNG gerado com sucesso (${pngBuffer.length} bytes)`)

    // Retornar PNG
    return new NextResponse(pngBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Disposition': `inline; filename="vendas-${mes}-${ano}.png"`
      }
    })

  } catch (error) {
    console.error('[API meta.png] Erro:', error)
    
    // Retornar imagem de erro
    const errorSvg = `
      <svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="200" fill="#fee2e2"/>
        <text x="400" y="100" font-family="Arial" font-size="24" fill="#dc2626" text-anchor="middle">
          Erro ao gerar imagem
        </text>
        <text x="400" y="140" font-family="Arial" font-size="14" fill="#991b1b" text-anchor="middle">
          ${error instanceof Error ? error.message : 'Erro desconhecido'}
        </text>
      </svg>
    `
    
    const errorPng = await sharp(Buffer.from(errorSvg)).png().toBuffer()
    
    return new NextResponse(errorPng as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache'
      },
      status: 500
    })
  }
}

interface UnidadeVenda {
  id: number
  nome: string
  valor: number
  quantidade: number
  meta: number
  ticket_medio: number
  percentual_meta: number
}

function gerarSVG(
  mes: number, 
  ano: number, 
  unidades: UnidadeVenda[], 
  totalOportunidades: number, 
  valorTotal: number, 
  metaTotal: number,
  ticketMedioGeral: number,
  percentualMetaGeral: number,
  dataInicio: string, 
  dataFim: string
): string {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const mesNome = meses[mes - 1]
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0
    return `${safe.toFixed(0)}%`
  }

  const getPercentColor = (p: number) => {
    if (!Number.isFinite(p) || p <= 0) return '#9ca3af'
    if (p >= 100) return '#16a34a'
    if (p >= 80) return '#059669'
    if (p >= 50) return '#f59e0b'
    return '#ef4444'
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const width = 1200
  const headerHeight = 220
  const rowHeight = 46
  const footerHeight = 110
  const tableHeaderHeight = 40

  // Layout helpers (para manter alinhado quando mudar a largura)
  const cardX = 80
  const cardY = 155
  const cardW = width - 160
  const cardH = 55
  const cardCol1X = cardX + 30
  const cardCol2X = cardX + cardW / 3 + 30
  const cardCol3X = cardX + (2 * cardW) / 3 + 30
  const cardDiv1X = cardX + cardW / 3
  const cardDiv2X = cardX + (2 * cardW) / 3

  const colMetaX = width - 540
  const colPercentX = width - 420
  const colTicketX = width - 300
  const colOpsX = width - 180
  const colReceitaX = width - 60
  
  const totalHeight = headerHeight + tableHeaderHeight + (unidades.length * rowHeight) + footerHeight

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 42px; font-weight: 900; fill: #111827; }
      .subtitle { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 600; fill: #6b7280; }
      .cardLabel { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 12px; font-weight: 800; fill: #6b7280; letter-spacing: 0.6px; text-transform: uppercase; }
      .cardValue { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 22px; font-weight: 900; fill: #111827; }
      .cardValueGreen { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 22px; font-weight: 900; fill: #059669; }
      .header-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 13px; font-weight: 700; fill: #374151; text-transform: uppercase; letter-spacing: 0.5px; }
      .cell-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 600; fill: #1f2937; }
      .cell-number { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 700; fill: #059669; }
      .cell-muted { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; fill: #111827; }
      .footer-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 20px; font-weight: 900; fill: #111827; }
      .footer-number { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 22px; font-weight: 900; fill: #059669; }
      .footer-small { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 13px; font-weight: 500; fill: #9ca3af; }
    </style>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f0fdf4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${totalHeight}" fill="url(#bgGradient)"/>
  
  <!-- Header -->
  <text x="${width / 2}" y="60" class="title" text-anchor="middle">💰 Vendas ${mesNome}/${ano}</text>
  <text x="${width / 2}" y="95" class="subtitle" text-anchor="middle">Oportunidades Ganhas • ${formatDate(dataInicio)} a ${formatDate(dataFim)}</text>

  <!-- Cards de resumo -->
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="12" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
  <line x1="${cardDiv1X}" y1="${cardY}" x2="${cardDiv1X}" y2="${cardY + cardH}" stroke="#e5e7eb" stroke-width="2"/>
  <line x1="${cardDiv2X}" y1="${cardY}" x2="${cardDiv2X}" y2="${cardY + cardH}" stroke="#e5e7eb" stroke-width="2"/>
  <text x="${cardCol1X}" y="${cardY + 23}" class="cardLabel">Receita</text>
  <text x="${cardCol1X}" y="${cardY + 47}" class="cardValueGreen">${formatCurrency(valorTotal)}</text>
  <text x="${cardCol2X}" y="${cardY + 23}" class="cardLabel">Meta / %</text>
  <text x="${cardCol2X}" y="${cardY + 47}" class="cardValue">${formatCurrency(metaTotal)} (${formatPercent(percentualMetaGeral)})</text>
  <text x="${cardCol3X}" y="${cardY + 23}" class="cardLabel">Ticket médio</text>
  <text x="${cardCol3X}" y="${cardY + 47}" class="cardValue">${formatCurrency(ticketMedioGeral)}</text>
  
  <!-- Linha separadora -->
  <line x1="60" y1="222" x2="${width - 60}" y2="222" stroke="#d1d5db" stroke-width="2"/>
  
  <!-- Table Header -->
  <rect y="${headerHeight}" width="${width}" height="${tableHeaderHeight}" fill="#f3f4f6"/>
  <text x="80" y="${headerHeight + 25}" class="header-text">#</text>
  <text x="150" y="${headerHeight + 25}" class="header-text">Unidade</text>
  <text x="${colMetaX}" y="${headerHeight + 25}" class="header-text" text-anchor="end">Meta</text>
  <text x="${colPercentX}" y="${headerHeight + 25}" class="header-text" text-anchor="end">% Meta</text>
  <text x="${colTicketX}" y="${headerHeight + 25}" class="header-text" text-anchor="end">Ticket</text>
  <text x="${colOpsX}" y="${headerHeight + 25}" class="header-text" text-anchor="end">Ops</text>
  <text x="${colReceitaX}" y="${headerHeight + 25}" class="header-text" text-anchor="end">Receita</text>
`

  // Table Rows
  let yPos = headerHeight + tableHeaderHeight
  unidades.forEach((unidade, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
    const ranking = index + 1
    
    svg += `
  <!-- Row ${ranking} -->
  <rect y="${yPos}" width="${width}" height="${rowHeight}" fill="${bgColor}"/>
  <text x="80" y="${yPos + 28}" class="cell-text">${ranking}º</text>
  <text x="150" y="${yPos + 28}" class="cell-text">${unidade.nome}</text>
  <text x="${colMetaX}" y="${yPos + 28}" class="cell-muted" text-anchor="end">${formatCurrency(unidade.meta)}</text>
  <text x="${colPercentX}" y="${yPos + 28}" class="cell-number" text-anchor="end" fill="${getPercentColor(unidade.percentual_meta)}">${formatPercent(unidade.percentual_meta)}</text>
  <text x="${colTicketX}" y="${yPos + 28}" class="cell-muted" text-anchor="end">${formatCurrency(unidade.ticket_medio)}</text>
  <text x="${colOpsX}" y="${yPos + 28}" class="cell-muted" text-anchor="end">${unidade.quantidade}</text>
  <text x="${colReceitaX}" y="${yPos + 28}" class="cell-number" text-anchor="end">${formatCurrency(unidade.valor)}</text>
`
    yPos += rowHeight
  })

  // Footer (Totals)
  svg += `
  <!-- Footer -->
  <rect y="${yPos}" width="${width}" height="${footerHeight}" fill="#1f2937"/>
  <text x="150" y="${yPos + 40}" class="footer-text" fill="#ffffff">TOTAL GERAL</text>
  <text x="${colMetaX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#22c55e">${formatCurrency(metaTotal)}</text>
  <text x="${colPercentX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#22c55e">${formatPercent(percentualMetaGeral)}</text>
  <text x="${colTicketX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#22c55e">${formatCurrency(ticketMedioGeral)}</text>
  <text x="${colOpsX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#22c55e">${totalOportunidades}</text>
  <text x="${colReceitaX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#22c55e">${formatCurrency(valorTotal)}</text>
  
  <text x="${width / 2}" y="${yPos + 75}" class="footer-small" text-anchor="middle" fill="#9ca3af">Grupo Inteli • Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</text>
  
</svg>`

  return svg
}
