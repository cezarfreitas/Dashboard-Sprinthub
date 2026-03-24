import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

function parseJSON(value: any): any[] {
  if (Array.isArray(value)) return value
  let strValue = value
  if (value && typeof value === 'object' && value.toString) {
    strValue = value.toString()
  }
  if (typeof strValue === 'string') {
    try {
      const parsed = JSON.parse(strValue)
      if (Array.isArray(parsed)) return parsed
      if (typeof parsed === 'object') return [parsed]
      return []
    } catch {
      if (strValue.includes(',')) {
        return strValue.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      }
      const num = parseInt(strValue.trim())
      return !isNaN(num) ? [num] : []
    }
  }
  if (typeof strValue === 'number') return [strValue]
  return []
}

async function getVendedorIdsByUnidades(unidadeIds: number[]): Promise<number[]> {
  if (unidadeIds.length === 0) return []

  const placeholders = unidadeIds.map(() => '?').join(',')
  const unidades = await executeQuery(
    `SELECT id, users FROM unidades WHERE id IN (${placeholders}) AND ativo = 1`,
    unidadeIds
  ) as any[]

  if (!unidades || unidades.length === 0) return []

  const todosVendedores = await executeQuery('SELECT id FROM vendedores') as any[]
  const vendedoresSet = new Set(todosVendedores.map(v => v.id))

  const ids = new Set<number>()
  unidades.forEach(unidade => {
    if (!unidade.users) return
    const parsedUsers = parseJSON(unidade.users)
    parsedUsers.forEach((u: any) => {
      let id: any = null
      if (typeof u === 'object' && u !== null) {
        id = u.id || u.user_id || u.vendedor_id
      } else if (typeof u === 'number') {
        id = u
      } else if (typeof u === 'string') {
        const parsed = parseInt(u.trim())
        if (!isNaN(parsed)) id = parsed
      }
      if (id != null && !isNaN(Number(id)) && vendedoresSet.has(Number(id))) {
        ids.add(Number(id))
      }
    })
  })

  return Array.from(ids)
}

interface FullStats {
  novas_oportunidades: number
  oportunidades_ganhas: number
  valor_vendas: number
  oportunidades_perdidas: number
  valor_perdido: number
  oportunidades_abertas: number
  valor_aberto: number
  ticket_medio: number
  taxa_conversao: number
  tempo_medio_ganho: number | null
  tempo_medio_perda: number | null
}

function buildVendedorFilter(vendedorIds: number[]): string {
  if (vendedorIds.length === 0) return ''
  return `AND CAST(o.user AS UNSIGNED) IN (${vendedorIds.map(() => '?').join(',')})`
}

function buildFunilFilter(funilIds: number[]): string {
  if (funilIds.length === 0) return ''
  return `AND EXISTS (SELECT 1 FROM colunas_funil cf WHERE cf.id = o.coluna_funil_id AND cf.id_funil IN (${funilIds.map(() => '?').join(',')}))`
}

async function getFullStats(
  dateStart: string,
  dateEnd: string,
  vendedorIds: number[],
  funilIds: number[]
): Promise<FullStats> {
  const vFilter = buildVendedorFilter(vendedorIds)
  const fFilter = buildFunilFilter(funilIds)
  const extraParams = [...vendedorIds, ...funilIds]

  const [novasRows, ganhasRows, perdidasRows, abertasRows, tempoGanhoRows, tempoPercaRows] = await Promise.all([
    executeQuery(
      `SELECT COUNT(*) as total FROM oportunidades o
       WHERE o.archived = 0 AND o.createDate >= ? AND o.createDate <= ? ${vFilter} ${fFilter}`,
      [dateStart + ' 00:00:00', dateEnd + ' 23:59:59', ...extraParams]
    ) as Promise<any[]>,

    executeQuery(
      `SELECT COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total FROM oportunidades o
       WHERE o.archived = 0 AND o.gain_date IS NOT NULL
       AND o.gain_date >= ? AND o.gain_date <= ? ${vFilter} ${fFilter}`,
      [dateStart + ' 00:00:00', dateEnd + ' 23:59:59', ...extraParams]
    ) as Promise<any[]>,

    executeQuery(
      `SELECT COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total FROM oportunidades o
       WHERE o.archived = 0 AND o.lost_date IS NOT NULL
       AND o.lost_date >= ? AND o.lost_date <= ? ${vFilter} ${fFilter}`,
      [dateStart + ' 00:00:00', dateEnd + ' 23:59:59', ...extraParams]
    ) as Promise<any[]>,

    executeQuery(
      `SELECT COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total FROM oportunidades o
       WHERE o.archived = 0 AND o.gain_date IS NULL AND o.lost_date IS NULL
       AND o.createDate >= ? AND o.createDate <= ? ${vFilter} ${fFilter}`,
      [dateStart + ' 00:00:00', dateEnd + ' 23:59:59', ...extraParams]
    ) as Promise<any[]>,

    executeQuery(
      `SELECT AVG(DATEDIFF(o.gain_date, o.createDate)) as avg_days FROM oportunidades o
       WHERE o.archived = 0 AND o.gain_date IS NOT NULL
       AND o.gain_date >= ? AND o.gain_date <= ? ${vFilter} ${fFilter}`,
      [dateStart + ' 00:00:00', dateEnd + ' 23:59:59', ...extraParams]
    ) as Promise<any[]>,

    executeQuery(
      `SELECT AVG(DATEDIFF(o.lost_date, o.createDate)) as avg_days FROM oportunidades o
       WHERE o.archived = 0 AND o.lost_date IS NOT NULL
       AND o.lost_date >= ? AND o.lost_date <= ? ${vFilter} ${fFilter}`,
      [dateStart + ' 00:00:00', dateEnd + ' 23:59:59', ...extraParams]
    ) as Promise<any[]>
  ])

  const novas = Number(novasRows[0]?.total || 0)
  const ganhas = Number(ganhasRows[0]?.total || 0)
  const valorGanhas = Number(ganhasRows[0]?.valor_total || 0)
  const perdidas = Number(perdidasRows[0]?.total || 0)
  const valorPerdido = Number(perdidasRows[0]?.valor_total || 0)
  const abertas = Number(abertasRows[0]?.total || 0)
  const valorAberto = Number(abertasRows[0]?.valor_total || 0)

  const totalDecididas = ganhas + perdidas
  const taxaConversao = totalDecididas > 0 ? (ganhas / totalDecididas) * 100 : 0
  const ticketMedio = ganhas > 0 ? valorGanhas / ganhas : 0

  const tempoGanho = tempoGanhoRows[0]?.avg_days != null ? Math.round(Number(tempoGanhoRows[0].avg_days)) : null
  const tempoPerda = tempoPercaRows[0]?.avg_days != null ? Math.round(Number(tempoPercaRows[0].avg_days)) : null

  return {
    novas_oportunidades: novas,
    oportunidades_ganhas: ganhas,
    valor_vendas: valorGanhas,
    oportunidades_perdidas: perdidas,
    valor_perdido: valorPerdido,
    oportunidades_abertas: abertas,
    valor_aberto: valorAberto,
    ticket_medio: ticketMedio,
    taxa_conversao: Math.round(taxaConversao * 10) / 10,
    tempo_medio_ganho: tempoGanho,
    tempo_medio_perda: tempoPerda
  }
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function calcCrescimento(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual > 0 ? 100 : null
  return Math.round(((atual - anterior) / anterior) * 100)
}

function calcCrescimentoDecimal(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual > 0 ? 100 : null
  return Math.round(((atual - anterior) / anterior) * 1000) / 10
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const mesParam = searchParams.get('mes')
    const anoParam = searchParams.get('ano')
    const unidadeIdParam = searchParams.get('unidade_id')
    const funilIdParam = searchParams.get('funil_id')

    const hoje = new Date()
    const mesRef = mesParam ? parseInt(mesParam) : hoje.getMonth() + 1
    const anoRef = anoParam ? parseInt(anoParam) : hoje.getFullYear()

    let vendedorIds: number[] = []
    if (unidadeIdParam) {
      const unidadeIds = unidadeIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      vendedorIds = await getVendedorIdsByUnidades(unidadeIds)
    }

    let funilIds: number[] = []
    if (funilIdParam) {
      funilIds = funilIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
    }

    // === Datas dos períodos ===
    const mesAtualInicio = `${anoRef}-${String(mesRef).padStart(2, '0')}-01`
    const mesAtualFim = `${anoRef}-${String(mesRef).padStart(2, '0')}-${lastDayOfMonth(anoRef, mesRef)}`

    const mesAnteriorDate = new Date(anoRef, mesRef - 2, 1)
    const mesAnteriorAno = mesAnteriorDate.getFullYear()
    const mesAnteriorMes = mesAnteriorDate.getMonth() + 1
    const mesAnteriorInicio = `${mesAnteriorAno}-${String(mesAnteriorMes).padStart(2, '0')}-01`
    const mesAnteriorFim = `${mesAnteriorAno}-${String(mesAnteriorMes).padStart(2, '0')}-${lastDayOfMonth(mesAnteriorAno, mesAnteriorMes)}`

    const mesmoMesAnoAnteriorAno = anoRef - 1
    const mesmoMesAnoAnteriorInicio = `${mesmoMesAnoAnteriorAno}-${String(mesRef).padStart(2, '0')}-01`
    const mesmoMesAnoAnteriorFim = `${mesmoMesAnoAnteriorAno}-${String(mesRef).padStart(2, '0')}-${lastDayOfMonth(mesmoMesAnoAnteriorAno, mesRef)}`

    const acumuladoAnoAtualInicio = `${anoRef}-01-01`
    const acumuladoAnoAtualFim = mesAtualFim

    const acumuladoAnoAnteriorInicio = `${anoRef - 1}-01-01`
    const diaRefAnoAnterior = Math.min(hoje.getDate(), lastDayOfMonth(anoRef - 1, mesRef))
    const acumuladoAnoAnteriorFim = `${anoRef - 1}-${String(mesRef).padStart(2, '0')}-${String(diaRefAnoAnterior).padStart(2, '0')}`

    const anoAnteriorCompletoInicio = `${anoRef - 1}-01-01`
    const anoAnteriorCompletoFim = `${anoRef - 1}-12-31`

    // === Buscar todos os stats em paralelo ===
    const [
      statsMesAnterior,
      statsMesAtual,
      statsMesmoMesAnoAnterior,
      statsAcumuladoAnoAtual,
      statsAcumuladoAnoAnterior,
      statsAnoAnteriorCompleto
    ] = await Promise.all([
      getFullStats(mesAnteriorInicio, mesAnteriorFim, vendedorIds, funilIds),
      getFullStats(mesAtualInicio, mesAtualFim, vendedorIds, funilIds),
      getFullStats(mesmoMesAnoAnteriorInicio, mesmoMesAnoAnteriorFim, vendedorIds, funilIds),
      getFullStats(acumuladoAnoAtualInicio, acumuladoAnoAtualFim, vendedorIds, funilIds),
      getFullStats(acumuladoAnoAnteriorInicio, acumuladoAnoAnteriorFim, vendedorIds, funilIds),
      getFullStats(anoAnteriorCompletoInicio, anoAnteriorCompletoFim, vendedorIds, funilIds)
    ])

    // === Metas ===
    const unidadeFilter = unidadeIdParam
      ? `AND m.unidade_id IN (${unidadeIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)).map(() => '?').join(',')})`
      : ''
    const unidadeParams = unidadeIdParam
      ? unidadeIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      : []

    const [metaMesRows, metaAnualRows] = await Promise.all([
      executeQuery(
        `SELECT COALESCE(SUM(m.meta_valor), 0) as meta_total FROM metas_mensais m WHERE m.mes = ? AND m.ano = ? ${unidadeFilter}`,
        [mesRef, anoRef, ...unidadeParams]
      ) as Promise<any[]>,
      executeQuery(
        `SELECT COALESCE(SUM(m.meta_valor), 0) as meta_total FROM metas_mensais m WHERE m.ano = ? ${unidadeFilter}`,
        [anoRef, ...unidadeParams]
      ) as Promise<any[]>
    ])

    const metaMes = Number(metaMesRows[0]?.meta_total || 0)
    const metaAnual = Number(metaAnualRows[0]?.meta_total || 0)

    // === Top motivos de perda do mês atual ===
    const motivosParams: any[] = [mesAtualInicio + ' 00:00:00', mesAtualFim + ' 23:59:59', ...vendedorIds, ...funilIds]
    const vFilter = buildVendedorFilter(vendedorIds)
    const fFilter = buildFunilFilter(funilIds)
    const motivosRows = await executeQuery(
      `SELECT
         COALESCE(mp.motivo, o.loss_reason, 'Não informado') as motivo,
         COUNT(*) as quantidade,
         COALESCE(SUM(o.value), 0) as valor_perdido
       FROM oportunidades o
       LEFT JOIN motivos_de_perda mp ON (
         o.loss_reason IS NOT NULL
         AND o.loss_reason != ''
         AND o.loss_reason REGEXP '^[0-9]+$'
         AND mp.id = CAST(o.loss_reason AS UNSIGNED)
       )
       WHERE o.archived = 0 AND o.lost_date IS NOT NULL
       AND o.lost_date >= ? AND o.lost_date <= ? ${vFilter} ${fFilter}
       GROUP BY COALESCE(mp.motivo, o.loss_reason, 'Não informado')
       ORDER BY quantidade DESC
       LIMIT 5`,
      motivosParams
    ) as any[]

    const topMotivosPerda = motivosRows.map((r: any) => ({
      motivo: r.motivo || 'Não informado',
      quantidade: Number(r.quantidade || 0),
      valor_perdido: Number(r.valor_perdido || 0)
    }))

    // === Tendência ===
    const diasPassadosNoAno = Math.ceil((new Date(anoRef, mesRef - 1, hoje.getDate()).getTime() - new Date(anoRef, 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1
    const fatorProjecao = diasPassadosNoAno > 0 ? 365 / diasPassadosNoAno : 1

    const targetMes = metaMes > 0 ? Math.round(((statsMesAtual.valor_vendas / metaMes) - 1) * 100) : null
    const targetAnual = metaAnual > 0 ? Math.round(((statsAcumuladoAnoAtual.valor_vendas / metaAnual) - 1) * 100) : null
    const gapValorAnual = metaAnual > 0 ? metaAnual - statsAcumuladoAnoAtual.valor_vendas : statsAcumuladoAnoAtual.valor_vendas

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

    const buildCrescimentoFull = (atual: FullStats, anterior: FullStats) => {
      return {
        novas_oportunidades: calcCrescimento(atual.novas_oportunidades, anterior.novas_oportunidades),
        oportunidades_ganhas: calcCrescimento(atual.oportunidades_ganhas, anterior.oportunidades_ganhas),
        valor_vendas: calcCrescimento(atual.valor_vendas, anterior.valor_vendas),
        oportunidades_perdidas: calcCrescimento(atual.oportunidades_perdidas, anterior.oportunidades_perdidas),
        valor_perdido: calcCrescimento(atual.valor_perdido, anterior.valor_perdido),
        ticket_medio: calcCrescimentoDecimal(atual.ticket_medio, anterior.ticket_medio),
        taxa_conversao: atual.taxa_conversao - anterior.taxa_conversao
      }
    }

    return NextResponse.json({
      success: true,
      data_referencia: `${String(hoje.getDate()).padStart(2, '0')}/${String(mesRef).padStart(2, '0')}`,
      mes_referencia: mesRef,
      ano_referencia: anoRef,
      nome_mes_anterior: nomesMeses[mesAnteriorMes - 1]?.substring(0, 3).toLowerCase() + '/' + String(mesAnteriorAno).slice(-2),
      nome_mes_atual: nomesMeses[mesRef - 1]?.substring(0, 3).toLowerCase() + '/' + String(anoRef).slice(-2),

      periodo: {
        mes_anterior: statsMesAnterior,
        mes_atual: statsMesAtual,
        crescimento: buildCrescimentoFull(statsMesAtual, statsMesAnterior)
      },

      meta_mes: {
        meta_valor: metaMes,
        real: statsMesAtual.valor_vendas,
        target: targetMes
      },

      periodo_yoy: {
        mesmo_mes_ano_anterior: statsMesmoMesAnoAnterior,
        mes_atual: statsMesAtual,
        crescimento: buildCrescimentoFull(statsMesAtual, statsMesmoMesAnoAnterior)
      },

      acumulado_ano: {
        ano_anterior: statsAcumuladoAnoAnterior,
        ano_atual: statsAcumuladoAnoAtual,
        crescimento: buildCrescimentoFull(statsAcumuladoAnoAtual, statsAcumuladoAnoAnterior)
      },

      meta_anual: {
        meta_valor: metaAnual,
        real: statsAcumuladoAnoAtual.valor_vendas,
        target: targetAnual,
        gap_valor: gapValorAnual
      },

      tendencia: {
        ano_anterior_completo: statsAnoAnteriorCompleto,
        tendencia_ano_atual: {
          ...statsAcumuladoAnoAtual,
          novas_oportunidades: Math.round(statsAcumuladoAnoAtual.novas_oportunidades * fatorProjecao),
          oportunidades_ganhas: Math.round(statsAcumuladoAnoAtual.oportunidades_ganhas * fatorProjecao),
          valor_vendas: statsAcumuladoAnoAtual.valor_vendas * fatorProjecao,
          oportunidades_perdidas: Math.round(statsAcumuladoAnoAtual.oportunidades_perdidas * fatorProjecao),
          valor_perdido: statsAcumuladoAnoAtual.valor_perdido * fatorProjecao,
          ticket_medio: statsAcumuladoAnoAtual.ticket_medio,
          taxa_conversao: statsAcumuladoAnoAtual.taxa_conversao
        },
        crescimento: buildCrescimentoFull(
          {
            ...statsAcumuladoAnoAtual,
            novas_oportunidades: Math.round(statsAcumuladoAnoAtual.novas_oportunidades * fatorProjecao),
            oportunidades_ganhas: Math.round(statsAcumuladoAnoAtual.oportunidades_ganhas * fatorProjecao),
            valor_vendas: statsAcumuladoAnoAtual.valor_vendas * fatorProjecao,
            oportunidades_perdidas: Math.round(statsAcumuladoAnoAtual.oportunidades_perdidas * fatorProjecao),
            valor_perdido: statsAcumuladoAnoAtual.valor_perdido * fatorProjecao,
            ticket_medio: statsAcumuladoAnoAtual.ticket_medio,
            taxa_conversao: statsAcumuladoAnoAtual.taxa_conversao,
            oportunidades_abertas: 0,
            valor_aberto: 0,
            tempo_medio_ganho: null,
            tempo_medio_perda: null
          },
          statsAnoAnteriorCompleto
        )
      },

      top_motivos_perda: topMotivosPerda,

      indicadores_mes_atual: {
        ticket_medio: statsMesAtual.ticket_medio,
        taxa_conversao: statsMesAtual.taxa_conversao,
        tempo_medio_ganho: statsMesAtual.tempo_medio_ganho,
        tempo_medio_perda: statsMesAtual.tempo_medio_perda,
        pipeline_aberto: {
          quantidade: statsMesAtual.oportunidades_abertas,
          valor: statsMesAtual.valor_aberto
        }
      }
    })

  } catch (error) {
    console.error('Erro na API /analytics/comparativo-vendas:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar comparativo de vendas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
