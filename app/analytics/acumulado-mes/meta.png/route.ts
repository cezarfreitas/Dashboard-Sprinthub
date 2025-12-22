import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

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

function formatDateYMDInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'

  return `${year}-${month}-${day}`
}

function pickBestAgg(
  candidates: Array<{ method: string; quantidade: number; valor_total: number }>
): { method: string; quantidade: number; valor_total: number } {
  return candidates
    .slice()
    .sort((a, b) => {
      if (b.quantidade !== a.quantidade) return b.quantidade - a.quantidade
      return b.valor_total - a.valor_total
    })[0]
}

type DateMode = 'utc_range' | 'local_range'

function makeRangeBounds(dateStartYMD: string, dateEndYMD: string, mode: DateMode) {
  const startLocal = `${dateStartYMD} 00:00:00`
  const endLocal = `${dateEndYMD} 23:59:59`

  if (mode === 'local_range') {
    return { start: startLocal, end: endLocal }
  }

  return {
    start: formatDateSaoPauloToUTC(dateStartYMD, false),
    end: formatDateSaoPauloToUTC(dateEndYMD, true)
  }
}

async function fetchAggByRange(
  dateStartYMD: string,
  dateEndYMD: string,
  mode: DateMode
): Promise<{ quantidade: number; valor_total: number }> {
  const { start, end } = makeRangeBounds(dateStartYMD, dateEndYMD, mode)

  const rows = (await executeQuery(
    `
      SELECT 
        COUNT(*) as quantidade,
        COALESCE(SUM(CAST(o.value AS DECIMAL(15,2))), 0) as valor_total
      FROM oportunidades o
      WHERE o.status = 'gain'
        AND o.gain_date IS NOT NULL
        AND o.gain_date >= ?
        AND o.gain_date <= ?
        AND o.archived = 0
    `,
    [start, end]
  )) as any[]

  return {
    quantidade: parseInt(rows?.[0]?.quantidade || 0),
    valor_total: parseFloat(rows?.[0]?.valor_total || 0)
  }
}

function calcGrowth(current: number, previous: number): { delta: number; pct: number } {
  const delta = current - previous
  const pct = previous > 0 ? (delta / previous) * 100 : current > 0 ? 100 : 0
  return { delta, pct }
}

/**
 * GET - Retorna imagem PNG com soma total de oportunidades ganhas no período
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const debug = searchParams.get('debug') === '1'
    const format = (searchParams.get('format') || 'png').toLowerCase()
    const debugLog: string[] = []

    const log = (...args: Array<string | number | boolean | null | undefined>) => {
      if (!debug) return
      debugLog.push(args.map((a) => String(a)).join(' '))
    }

    const currentDate = new Date()
    const mes = parseInt(searchParams.get('mes') || String(currentDate.getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(currentDate.getFullYear()))

    log('[meta.png]', 'Gerando', `${mes}/${ano}`)

    // Calcular período
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`
    
    const dataInicioUTC = formatDateSaoPauloToUTC(dataInicio, false)
    const dataFimUTC = formatDateSaoPauloToUTC(dataFim, true)
    log('[meta.png]', 'Período SP:', dataInicio, '→', dataFim)
    log('[meta.png]', 'Período UTC:', dataInicioUTC, '→', dataFimUTC)
    
    // 1. Buscar todas as unidades ativas
    const unidades = await executeQuery(`
      SELECT id, COALESCE(nome, name) as nome, users 
      FROM unidades 
      WHERE ativo = 1
      ORDER BY COALESCE(nome, name)
    `) as any[]
    log('[meta.png]', 'Unidades ativas:', unidades.length)

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
    log('[meta.png]', 'Vendedores ativos:', todosVendedores.length)
    
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
    
    log('[meta.png]', 'Vendedores mapeados p/ unidades:', vendedorIdToUnidade.size)
    
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
    log('[meta.png]', 'Vendedores com vendas no período:', oportunidades.length)
    
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
        if (debug && vendedoresNaoMapeados <= 10) {
          log('[meta.png]', 'Vendedor não mapeado:', op.user)
        }
      }
    })
    
    if (vendedoresNaoMapeados > 0) {
      log('[meta.png]', 'Total vendedores não mapeados:', vendedoresNaoMapeados)
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
    
    log('[meta.png]', 'Unidades listadas:', unidadesComVendas.length)
    log('[meta.png]', 'Total mês:', totalOportunidades, 'ops', `R$ ${valorTotal.toFixed(2)}`)

    // 6. Detectar modo de data (gain_date pode estar gravado como UTC ou local; escolhemos 1 modo para manter comparações consistentes)
    const tz = 'America/Sao_Paulo'
    const hojeSpStr = formatDateYMDInTimeZone(new Date(), tz)
    const ontemSpStr = formatDateYMDInTimeZone(new Date(Date.now() - 24 * 60 * 60 * 1000), tz)
    const seteDiasAtrasSpStr = formatDateYMDInTimeZone(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), tz)

    const agg7Utc = await fetchAggByRange(seteDiasAtrasSpStr, hojeSpStr, 'utc_range')
    const agg7Local = await fetchAggByRange(seteDiasAtrasSpStr, hojeSpStr, 'local_range')

    const dateMode: DateMode = pickBestAgg([
      { method: 'utc_range', quantidade: agg7Utc.quantidade, valor_total: agg7Utc.valor_total },
      { method: 'local_range', quantidade: agg7Local.quantidade, valor_total: agg7Local.valor_total }
    ]).method as DateMode

    log('[meta.png]', 'Hoje SP:', hojeSpStr)
    log('[meta.png]', 'Modo data escolhido:', dateMode)

    // 7. Vendas de ontem e anteontem (usando o modo escolhido)
    const anteOntemSpStr = formatDateYMDInTimeZone(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), tz)
    const aggOntem = await fetchAggByRange(ontemSpStr, ontemSpStr, dateMode)
    const aggAnteOntem = await fetchAggByRange(anteOntemSpStr, anteOntemSpStr, dateMode)

    const valorOntem = aggOntem.valor_total
    const quantidadeOntem = aggOntem.quantidade
    const growthOntem = calcGrowth(aggOntem.valor_total, aggAnteOntem.valor_total)

    // 7. Insights (ritmo e projeção) — só faz sentido no mês atual (SP)
    const [hojeAno, hojeMes, hojeDia] = hojeSpStr.split('-').map((n) => parseInt(n))
    const diasNoMes = ultimoDia
    const isMesAtualSp = hojeAno === ano && hojeMes === mes
    const diaDoMes = isMesAtualSp ? Math.min(Math.max(hojeDia, 1), diasNoMes) : diasNoMes
    const diasDecorridos = isMesAtualSp ? diaDoMes : diasNoMes
    const diasRestantes = isMesAtualSp ? Math.max(0, diasNoMes - diaDoMes) : 0

    const mediaDiaria = diasDecorridos > 0 ? valorTotal / diasDecorridos : 0
    const projecaoMes = isMesAtualSp ? mediaDiaria * diasNoMes : valorTotal
    const restanteMeta = Math.max(0, metaTotal - valorTotal)
    const necessarioPorDia = diasRestantes > 0 ? restanteMeta / diasRestantes : 0

    // 8. Crescimento vs período anterior do mês (MTD vs MTD do mês anterior)
    const mtdEndStr = isMesAtualSp ? hojeSpStr : dataFim
    const mtdStartStr = `${ano}-${String(mes).padStart(2, '0')}-01`

    const prevMonthDate = new Date(ano, mes - 2, 1) // JS: mes-1 é 0-based; aqui mes-2 = mês anterior
    const prevAno = prevMonthDate.getFullYear()
    const prevMes = prevMonthDate.getMonth() + 1
    const prevUltimoDia = new Date(prevAno, prevMes, 0).getDate()
    const cutoffDia = isMesAtualSp ? diaDoMes : ultimoDia
    const prevCutoffDia = Math.min(cutoffDia, prevUltimoDia)
    const prevStartStr = `${prevAno}-${String(prevMes).padStart(2, '0')}-01`
    const prevEndStr = `${prevAno}-${String(prevMes).padStart(2, '0')}-${String(prevCutoffDia).padStart(2, '0')}`

    const aggMtdAtual = await fetchAggByRange(mtdStartStr, mtdEndStr, dateMode)
    const aggMtdPrev = await fetchAggByRange(prevStartStr, prevEndStr, dateMode)

    const growthMtd = calcGrowth(aggMtdAtual.valor_total, aggMtdPrev.valor_total)

    if (debug && format === 'json') {
      return NextResponse.json({
        success: true,
        periodo: { mes, ano, dataInicio, dataFim, dataInicioUTC, dataFimUTC },
        hojeSp: hojeSpStr,
        dateMode,
        ranges: {
          last7Days: { start: seteDiasAtrasSpStr, end: hojeSpStr, agg7Utc, agg7Local },
          ontem: { ontemSpStr, anteOntemSpStr, aggOntem, aggAnteOntem }
        },
        totais: {
          totalOportunidades,
          valorTotal,
          metaTotal,
          ticketMedioGeral,
          percentualMetaGeral
        },
        insights: {
          diasNoMes,
          isMesAtualSp,
          diaDoMes,
          diasDecorridos,
          diasRestantes,
          mediaDiaria,
          projecaoMes,
          restanteMeta,
          necessarioPorDia,
          crescimento: {
            ontemVsAnteontem: growthOntem,
            mtdVsMesAnterior: {
              atual: { start: mtdStartStr, end: mtdEndStr, ...aggMtdAtual },
              anterior: { start: prevStartStr, end: prevEndStr, ...aggMtdPrev },
              growth: growthMtd
            }
          }
        },
        debugLog
      })
    }

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
      dataFim,
      valorOntem,
      quantidadeOntem,
      ontemSpStr,
      mediaDiaria,
      projecaoMes,
      restanteMeta,
      necessarioPorDia,
      diaDoMes,
      diasNoMes,
      diasRestantes,
      growthOntem.pct,
      growthMtd.pct
    )

    // Converter SVG para PNG usando sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({
        quality: 100,
        compressionLevel: 6
      })
      .toBuffer()

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
  dataFim: string,
  valorOntem: number,
  quantidadeOntem: number,
  dataOntem: string,
  mediaDiaria: number,
  projecaoMes: number,
  restanteMeta: number,
  necessarioPorDia: number,
  diaDoMes: number,
  diasNoMes: number,
  diasRestantes: number,
  crescimentoOntemPct: number,
  crescimentoMtdPct: number
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

  const formatSignedPercent = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0
    const sign = safe > 0 ? '+' : safe < 0 ? '' : ''
    return `${sign}${safe.toFixed(0)}%`
  }

  const getTrendColor = (pct: number) => {
    if (!Number.isFinite(pct) || pct === 0) return '#6b7280'
    return pct > 0 ? '#16a34a' : '#dc2626'
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
  const rowHeight = 46
  const footerHeight = 110
  const tableHeaderHeight = 40

  // Layout helpers (para manter alinhado quando mudar a largura)
  const cardX = 80
  const cardY = 150
  const cardW = width - 160
  const cardH = 78
  const cardGap = 16
  const cardSingleW = (cardW - 2 * cardGap) / 3
  const card1X = cardX
  const card2X = cardX + cardSingleW + cardGap
  const card3X = cardX + 2 * (cardSingleW + cardGap)
  const cardPadX = 22

  // Linha 2 de cards
  const card2Y = cardY + cardH + 12
  const card2H = cardH

  // Table start (abaixo dos cards)
  const headerHeight = card2Y + card2H + 30

  const colMetaX = width - 540
  const colPercentX = width - 420
  const colTicketX = width - 300
  const colOpsX = width - 180
  const colReceitaX = width - 60
  
  const totalHeight = headerHeight + tableHeaderHeight + (unidades.length * rowHeight) + footerHeight

  // Ler fontes e converter para base64
  const fontRegularPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.woff2')
  const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.woff2')
  
  const fontRegularBase64 = fs.readFileSync(fontRegularPath).toString('base64')
  const fontBoldBase64 = fs.readFileSync(fontBoldPath).toString('base64')

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Roboto';
        font-style: normal;
        font-weight: 400;
        src: url(data:font/woff2;charset=utf-8;base64,${fontRegularBase64}) format('woff2');
      }
      @font-face {
        font-family: 'Roboto';
        font-style: normal;
        font-weight: 700;
        src: url(data:font/woff2;charset=utf-8;base64,${fontBoldBase64}) format('woff2');
      }
      .title { font-family: 'Roboto', sans-serif; font-size: 42px; font-weight: 700; fill: #111827; }
      .subtitle { font-family: 'Roboto', sans-serif; font-size: 18px; font-weight: 700; fill: #6b7280; }
      .cardLabel { font-family: 'Roboto', sans-serif; font-size: 11px; font-weight: 700; fill: #6b7280; letter-spacing: 0.7px; text-transform: uppercase; }
      .cardValue { font-family: 'Roboto', sans-serif; font-size: 24px; font-weight: 700; fill: #111827; }
      .cardValueGreen { font-family: 'Roboto', sans-serif; font-size: 24px; font-weight: 700; fill: #059669; }
      .cardSub { font-family: 'Roboto', sans-serif; font-size: 12px; font-weight: 400; fill: #6b7280; }
      .cardLabelGreen { font-family: 'Roboto', sans-serif; font-size: 11px; font-weight: 700; fill: #047857; letter-spacing: 0.7px; text-transform: uppercase; }
      .cardSubGreen { font-family: 'Roboto', sans-serif; font-size: 12px; font-weight: 400; fill: #065f46; }
      .header-text { font-family: 'Roboto', sans-serif; font-size: 13px; font-weight: 700; fill: #374151; text-transform: uppercase; letter-spacing: 0.5px; }
      .cell-text { font-family: 'Roboto', sans-serif; font-size: 15px; font-weight: 700; fill: #1f2937; }
      .cell-number { font-family: 'Roboto', sans-serif; font-size: 15px; font-weight: 700; fill: #059669; }
      .cell-muted { font-family: 'Roboto', sans-serif; font-size: 14px; font-weight: 700; fill: #111827; }
      .footer-text { font-family: 'Roboto', sans-serif; font-size: 20px; font-weight: 700; fill: #111827; }
      .footer-number { font-family: 'Roboto', sans-serif; font-size: 22px; font-weight: 700; fill: #059669; }
      .footer-small { font-family: 'Roboto', sans-serif; font-size: 13px; font-weight: 400; fill: #9ca3af; }
    </style>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#111827" flood-opacity="0.10"/>
    </filter>
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

  <!-- Cards (linha 1) -->
  <rect x="${card1X}" y="${cardY}" width="${cardSingleW}" height="${cardH}" rx="14" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" filter="url(#cardShadow)"/>
  <text x="${card1X + cardPadX}" y="${cardY + 24}" class="cardLabel">Receita (mês)</text>
  <text x="${card1X + cardPadX}" y="${cardY + 54}" class="cardValueGreen">${formatCurrency(valorTotal)}</text>
  <text x="${card1X + cardPadX}" y="${cardY + 70}" class="cardSub">vs mês ant. (mesmo período): <tspan fill="${getTrendColor(crescimentoMtdPct)}">${formatSignedPercent(crescimentoMtdPct)}</tspan></text>

  <rect x="${card2X}" y="${cardY}" width="${cardSingleW}" height="${cardH}" rx="14" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" filter="url(#cardShadow)"/>
  <text x="${card2X + cardPadX}" y="${cardY + 24}" class="cardLabel">Meta / % atingida</text>
  <text x="${card2X + cardPadX}" y="${cardY + 54}" class="cardValue">${formatCurrency(metaTotal)} (${formatPercent(percentualMetaGeral)})</text>
  <text x="${card2X + cardPadX}" y="${cardY + 70}" class="cardSub">Restante: ${formatCurrency(restanteMeta)} • Nec./dia: ${formatCurrency(necessarioPorDia)}</text>

  <rect x="${card3X}" y="${cardY}" width="${cardSingleW}" height="${cardH}" rx="14" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" filter="url(#cardShadow)"/>
  <text x="${card3X + cardPadX}" y="${cardY + 24}" class="cardLabel">Ticket / Oportunidades</text>
  <text x="${card3X + cardPadX}" y="${cardY + 54}" class="cardValue">${formatCurrency(ticketMedioGeral)} • ${totalOportunidades}</text>
  <text x="${card3X + cardPadX}" y="${cardY + 70}" class="cardSub">Dia ${diaDoMes}/${diasNoMes} • Restam ${diasRestantes}</text>

  <!-- Cards (linha 2) -->
  <rect x="${card1X}" y="${card2Y}" width="${cardSingleW}" height="${card2H}" rx="14" fill="#ecfdf5" stroke="#10b981" stroke-width="2" filter="url(#cardShadow)"/>
  <text x="${card1X + cardPadX}" y="${card2Y + 24}" class="cardLabelGreen">Vendas ontem (${formatDate(dataOntem)})</text>
  <text x="${card1X + cardPadX}" y="${card2Y + 54}" class="cardValueGreen" fill="#047857">${formatCurrency(valorOntem)}</text>
  <text x="${card1X + cardPadX}" y="${card2Y + 70}" class="cardSubGreen">${quantidadeOntem} oportunidades • <tspan fill="${getTrendColor(crescimentoOntemPct)}">vs anteontem: ${formatSignedPercent(crescimentoOntemPct)}</tspan></text>

  <rect x="${card2X}" y="${card2Y}" width="${cardSingleW}" height="${card2H}" rx="14" fill="#f8fafc" stroke="#e5e7eb" stroke-width="2" filter="url(#cardShadow)"/>
  <text x="${card2X + cardPadX}" y="${card2Y + 24}" class="cardLabel">Projeção (mês)</text>
  <text x="${card2X + cardPadX}" y="${card2Y + 54}" class="cardValue">${formatCurrency(projecaoMes)}</text>
  <text x="${card2X + cardPadX}" y="${card2Y + 70}" class="cardSub">Média/dia: ${formatCurrency(mediaDiaria)}</text>

  <rect x="${card3X}" y="${card2Y}" width="${cardSingleW}" height="${card2H}" rx="14" fill="#f8fafc" stroke="#e5e7eb" stroke-width="2" filter="url(#cardShadow)"/>
  <text x="${card3X + cardPadX}" y="${card2Y + 24}" class="cardLabel">Ritmo p/ bater a meta</text>
  <text x="${card3X + cardPadX}" y="${card2Y + 54}" class="cardValue">${formatCurrency(necessarioPorDia)}</text>
  <text x="${card3X + cardPadX}" y="${card2Y + 70}" class="cardSub">por dia até o fim do mês</text>
  
  <!-- Linha separadora -->
  <line x1="60" y1="${headerHeight - 8}" x2="${width - 60}" y2="${headerHeight - 8}" stroke="#d1d5db" stroke-width="2"/>
  
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
  <rect y="${yPos}" width="${width}" height="${footerHeight}" fill="#f3f4f6"/>
  <text x="150" y="${yPos + 40}" class="footer-text" fill="#111827">TOTAL GERAL</text>
  <text x="${colMetaX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#111827">${formatCurrency(metaTotal)}</text>
  <text x="${colPercentX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#059669">${formatPercent(percentualMetaGeral)}</text>
  <text x="${colTicketX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#111827">${formatCurrency(ticketMedioGeral)}</text>
  <text x="${colOpsX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#111827">${totalOportunidades}</text>
  <text x="${colReceitaX}" y="${yPos + 40}" class="footer-number" text-anchor="end" fill="#059669">${formatCurrency(valorTotal)}</text>
  
  <text x="${width / 2}" y="${yPos + 75}" class="footer-small" text-anchor="middle" fill="#6b7280">Gerado em ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(new Date())} às ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', timeStyle: 'medium' }).format(new Date())} (SP)</text>
  
</svg>`

  return svg
}
