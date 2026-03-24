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

interface PeriodStats {
  novas_oportunidades: number
  oportunidades_ganhas: number
  valor_vendas: number
}

async function getStats(
  dateField: string,
  dateStart: string,
  dateEnd: string,
  vendedorIds: number[],
  funilIds: number[],
  extraCondition?: string
): Promise<PeriodStats> {
  const params: any[] = []
  const where: string[] = ['o.archived = 0']

  where.push(`${dateField} >= ?`)
  params.push(dateStart + ' 00:00:00')
  where.push(`${dateField} <= ?`)
  params.push(dateEnd + ' 23:59:59')

  if (vendedorIds.length > 0) {
    where.push(`CAST(o.user AS UNSIGNED) IN (${vendedorIds.map(() => '?').join(',')})`)
    params.push(...vendedorIds)
  }

  if (funilIds.length > 0) {
    where.push(`EXISTS (SELECT 1 FROM colunas_funil cf WHERE cf.id = o.coluna_funil_id AND cf.id_funil IN (${funilIds.map(() => '?').join(',')}))`)
    params.push(...funilIds)
  }

  if (extraCondition) {
    where.push(extraCondition)
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const [novasRows] = await Promise.all([
    executeQuery(`SELECT COUNT(*) as total FROM oportunidades o WHERE o.archived = 0 AND o.createDate >= ? AND o.createDate <= ? ${vendedorIds.length > 0 ? `AND CAST(o.user AS UNSIGNED) IN (${vendedorIds.map(() => '?').join(',')})` : ''} ${funilIds.length > 0 ? `AND EXISTS (SELECT 1 FROM colunas_funil cf WHERE cf.id = o.coluna_funil_id AND cf.id_funil IN (${funilIds.map(() => '?').join(',')}))` : ''}`, [
      dateStart + ' 00:00:00',
      dateEnd + ' 23:59:59',
      ...vendedorIds,
      ...funilIds
    ]) as Promise<any[]>
  ])

  const ganhasRows = await executeQuery(
    `SELECT COUNT(*) as total, COALESCE(SUM(o.value), 0) as valor_total FROM oportunidades o WHERE o.archived = 0 AND o.gain_date IS NOT NULL AND o.gain_date >= ? AND o.gain_date <= ? ${vendedorIds.length > 0 ? `AND CAST(o.user AS UNSIGNED) IN (${vendedorIds.map(() => '?').join(',')})` : ''} ${funilIds.length > 0 ? `AND EXISTS (SELECT 1 FROM colunas_funil cf WHERE cf.id = o.coluna_funil_id AND cf.id_funil IN (${funilIds.map(() => '?').join(',')}))` : ''}`,
    [
      dateStart + ' 00:00:00',
      dateEnd + ' 23:59:59',
      ...vendedorIds,
      ...funilIds
    ]
  ) as any[]

  return {
    novas_oportunidades: Number(novasRows[0]?.total || 0),
    oportunidades_ganhas: Number(ganhasRows[0]?.total || 0),
    valor_vendas: Number(ganhasRows[0]?.valor_total || 0)
  }
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
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

    // === PERÍODO: Mês anterior vs Mês atual ===
    const mesAtualInicio = `${anoRef}-${String(mesRef).padStart(2, '0')}-01`
    const mesAtualFim = `${anoRef}-${String(mesRef).padStart(2, '0')}-${lastDayOfMonth(anoRef, mesRef)}`

    const mesAnteriorDate = new Date(anoRef, mesRef - 2, 1)
    const mesAnteriorAno = mesAnteriorDate.getFullYear()
    const mesAnteriorMes = mesAnteriorDate.getMonth() + 1
    const mesAnteriorInicio = `${mesAnteriorAno}-${String(mesAnteriorMes).padStart(2, '0')}-01`
    const mesAnteriorFim = `${mesAnteriorAno}-${String(mesAnteriorMes).padStart(2, '0')}-${lastDayOfMonth(mesAnteriorAno, mesAnteriorMes)}`

    // === PERÍODO: Mesmo mês do ano anterior ===
    const mesmoMesAnoAnteriorAno = anoRef - 1
    const mesmoMesAnoAnteriorInicio = `${mesmoMesAnoAnteriorAno}-${String(mesRef).padStart(2, '0')}-01`
    const mesmoMesAnoAnteriorFim = `${mesmoMesAnoAnteriorAno}-${String(mesRef).padStart(2, '0')}-${lastDayOfMonth(mesmoMesAnoAnteriorAno, mesRef)}`

    // === PERÍODO ACUMULADO ANO ===
    const acumuladoAnoAtualInicio = `${anoRef}-01-01`
    const acumuladoAnoAtualFim = mesAtualFim

    const acumuladoAnoAnteriorInicio = `${anoRef - 1}-01-01`
    const diaRefAnoAnterior = Math.min(hoje.getDate(), lastDayOfMonth(anoRef - 1, mesRef))
    const acumuladoAnoAnteriorFim = `${anoRef - 1}-${String(mesRef).padStart(2, '0')}-${String(diaRefAnoAnterior).padStart(2, '0')}`

    // === TENDÊNCIA: Projeção do ano inteiro ===
    const anoAnteriorCompletoInicio = `${anoRef - 1}-01-01`
    const anoAnteriorCompletoFim = `${anoRef - 1}-12-31`

    const [
      statsMesAnterior,
      statsMesAtual,
      statsMesmoMesAnoAnterior,
      statsAcumuladoAnoAtual,
      statsAcumuladoAnoAnterior,
      statsAnoAnteriorCompleto
    ] = await Promise.all([
      getStats('o.createDate', mesAnteriorInicio, mesAnteriorFim, vendedorIds, funilIds),
      getStats('o.createDate', mesAtualInicio, mesAtualFim, vendedorIds, funilIds),
      getStats('o.createDate', mesmoMesAnoAnteriorInicio, mesmoMesAnoAnteriorFim, vendedorIds, funilIds),
      getStats('o.createDate', acumuladoAnoAtualInicio, acumuladoAnoAtualFim, vendedorIds, funilIds),
      getStats('o.createDate', acumuladoAnoAnteriorInicio, acumuladoAnoAnteriorFim, vendedorIds, funilIds),
      getStats('o.createDate', anoAnteriorCompletoInicio, anoAnteriorCompletoFim, vendedorIds, funilIds)
    ])

    // Meta do mês atual
    const unidadeFilter = unidadeIdParam
      ? `AND m.unidade_id IN (${unidadeIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)).map(() => '?').join(',')})`
      : ''
    const unidadeParams = unidadeIdParam
      ? unidadeIdParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      : []

    const metaMesRows = await executeQuery(
      `SELECT COALESCE(SUM(m.meta_valor), 0) as meta_total
       FROM metas_mensais m
       WHERE m.mes = ? AND m.ano = ? ${unidadeFilter}`,
      [mesRef, anoRef, ...unidadeParams]
    ) as any[]

    const metaMes = Number(metaMesRows[0]?.meta_total || 0)

    // Meta anual (soma de todas as metas dos 12 meses)
    const metaAnualRows = await executeQuery(
      `SELECT COALESCE(SUM(m.meta_valor), 0) as meta_total
       FROM metas_mensais m
       WHERE m.ano = ? ${unidadeFilter}`,
      [anoRef, ...unidadeParams]
    ) as any[]

    const metaAnual = Number(metaAnualRows[0]?.meta_total || 0)

    // Calcular tendência ano atual
    const diasPassadosNoAno = Math.ceil((new Date(anoRef, mesRef - 1, hoje.getDate()).getTime() - new Date(anoRef, 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1
    const diasNoAno = 365
    const fatorProjecao = diasPassadosNoAno > 0 ? diasNoAno / diasPassadosNoAno : 1

    const tendenciaNovas = Math.round(statsAcumuladoAnoAtual.novas_oportunidades * fatorProjecao)
    const tendenciaGanhas = Math.round(statsAcumuladoAnoAtual.oportunidades_ganhas * fatorProjecao)
    const tendenciaValor = statsAcumuladoAnoAtual.valor_vendas * fatorProjecao

    function calcCrescimento(atual: number, anterior: number): number | null {
      if (anterior === 0) return atual > 0 ? 100 : null
      return Math.round(((atual - anterior) / anterior) * 100)
    }

    const targetMes = metaMes > 0 ? Math.round(((statsMesAtual.valor_vendas / metaMes) - 1) * 100) : null
    const targetAnual = metaAnual > 0 ? Math.round(((statsAcumuladoAnoAtual.valor_vendas / metaAnual) - 1) * 100) : null
    const gapValorAnual = metaAnual > 0 ? metaAnual - statsAcumuladoAnoAtual.valor_vendas : statsAcumuladoAnoAtual.valor_vendas

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

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
        crescimento: {
          novas_oportunidades: calcCrescimento(statsMesAtual.novas_oportunidades, statsMesAnterior.novas_oportunidades),
          oportunidades_ganhas: calcCrescimento(statsMesAtual.oportunidades_ganhas, statsMesAnterior.oportunidades_ganhas),
          valor_vendas: calcCrescimento(statsMesAtual.valor_vendas, statsMesAnterior.valor_vendas)
        }
      },

      meta_mes: {
        meta_valor: metaMes,
        real: statsMesAtual.valor_vendas,
        target: targetMes
      },

      periodo_yoy: {
        mesmo_mes_ano_anterior: statsMesmoMesAnoAnterior,
        mes_atual: statsMesAtual,
        crescimento: {
          novas_oportunidades: calcCrescimento(statsMesAtual.novas_oportunidades, statsMesmoMesAnoAnterior.novas_oportunidades),
          oportunidades_ganhas: calcCrescimento(statsMesAtual.oportunidades_ganhas, statsMesmoMesAnoAnterior.oportunidades_ganhas),
          valor_vendas: calcCrescimento(statsMesAtual.valor_vendas, statsMesmoMesAnoAnterior.valor_vendas)
        }
      },

      acumulado_ano: {
        ano_anterior: statsAcumuladoAnoAnterior,
        ano_atual: statsAcumuladoAnoAtual,
        crescimento: {
          novas_oportunidades: calcCrescimento(statsAcumuladoAnoAtual.novas_oportunidades, statsAcumuladoAnoAnterior.novas_oportunidades),
          oportunidades_ganhas: calcCrescimento(statsAcumuladoAnoAtual.oportunidades_ganhas, statsAcumuladoAnoAnterior.oportunidades_ganhas),
          valor_vendas: calcCrescimento(statsAcumuladoAnoAtual.valor_vendas, statsAcumuladoAnoAnterior.valor_vendas)
        }
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
          novas_oportunidades: tendenciaNovas,
          oportunidades_ganhas: tendenciaGanhas,
          valor_vendas: tendenciaValor
        },
        crescimento: {
          novas_oportunidades: calcCrescimento(tendenciaNovas, statsAnoAnteriorCompleto.novas_oportunidades),
          oportunidades_ganhas: calcCrescimento(tendenciaGanhas, statsAnoAnteriorCompleto.oportunidades_ganhas),
          valor_vendas: calcCrescimento(tendenciaValor, statsAnoAnteriorCompleto.valor_vendas)
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
