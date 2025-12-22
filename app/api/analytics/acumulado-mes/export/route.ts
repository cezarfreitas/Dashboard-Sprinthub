import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

function parseIdList(value: string | null): number[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function getMonthYearFromDateString(dateStr: string): { mes: number; ano: number } {
  const [y, m] = dateStr.split('-').map((x) => Number(x))
  return {
    mes: Number.isFinite(m) ? m : new Date().getMonth() + 1,
    ano: Number.isFinite(y) ? y : new Date().getFullYear()
  }
}

// Extrai IDs de vendedores do campo JSON users da unidade
function parseUsersFromUnidade(users: any): number[] {
  if (!users) return []
  try {
    const parsed = typeof users === 'string' ? JSON.parse(users) : users
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((u: any) => {
        if (typeof u === 'number') return u
        if (typeof u === 'string') return parseInt(u.trim())
        if (typeof u === 'object' && u !== null) return u.id || u.user_id || u.vendedor_id
        return null
      })
      .filter((id: any) => Number.isFinite(id) && id > 0)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const dataInicio = searchParams.get('data_inicio') || searchParams.get('dataInicio') || ''
    const dataFim = searchParams.get('data_fim') || searchParams.get('dataFim') || ''

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros inválidos. Use data_inicio e data_fim no formato YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    const unidadeIdsFilter = parseIdList(searchParams.get('unidade_id') || searchParams.get('unidades') || '')
    const funilIdRaw = searchParams.get('funil_id') || searchParams.get('funil') || ''
    const grupoIdRaw = searchParams.get('grupo_id') || searchParams.get('grupo') || ''

    const funilId = funilIdRaw && funilIdRaw !== 'todos' ? Number(funilIdRaw) : null
    const grupoId = grupoIdRaw && grupoIdRaw !== 'todos' ? Number(grupoIdRaw) : null

    const { mes, ano } = getMonthYearFromDateString(dataInicio)

    // Buscar todas as unidades ativas (com filtros opcionais)
    let unidadesQuery = `
      SELECT 
        u.id,
        COALESCE(NULLIF(u.nome, ''), u.name, 'Sem Nome') as nome,
        u.users,
        u.grupo_id
      FROM unidades u
      WHERE u.ativo = 1
    `
    const unidadesParams: any[] = []

    if (unidadeIdsFilter.length > 0) {
      unidadesQuery += ` AND u.id IN (${unidadeIdsFilter.map(() => '?').join(',')})`
      unidadesParams.push(...unidadeIdsFilter)
    }

    if (Number.isFinite(grupoId) && grupoId! > 0) {
      unidadesQuery += ` AND u.grupo_id = ?`
      unidadesParams.push(grupoId)
    }

    const unidades = await executeQuery<any>(unidadesQuery, unidadesParams)

    // Criar mapa de vendedor -> unidade
    const vendedorToUnidade = new Map<number, { unidade_id: number; unidade_nome: string }>()
    for (const unidade of unidades) {
      const vendedorIds = parseUsersFromUnidade(unidade.users)
      for (const vendedorId of vendedorIds) {
        vendedorToUnidade.set(vendedorId, {
          unidade_id: unidade.id,
          unidade_nome: unidade.nome
        })
      }
    }

    // Buscar oportunidades ganhas no período
    const whereParts: string[] = [
      `o.status = 'gain'`,
      `o.gain_date IS NOT NULL`,
      `DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) BETWEEN ? AND ?`
    ]
    const paramsBase: any[] = [dataInicio, dataFim]

    if (Number.isFinite(funilId) && funilId! > 0) {
      whereParts.push(`cf.id_funil = ?`)
      paramsBase.push(funilId)
    }

    const whereSQL = `WHERE ${whereParts.join(' AND ')}`

    // Buscar todas as oportunidades ganhas
    const oportunidadesRows = await executeQuery<any>(
      `
      SELECT
        o.id AS oportunidade_id,
        o.title AS titulo,
        o.status,
        o.value,
        o.gain_date,
        o.user,
        o.coluna_funil_id,
        cf.id_funil AS funil_id,
        f.funil_nome,
        v.id AS vendedor_id,
        v.name AS vendedor_nome,
        v.lastName AS vendedor_sobrenome,
        v.username AS vendedor_username
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON cf.id = o.coluna_funil_id
      LEFT JOIN funis f ON f.id = cf.id_funil
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      ${whereSQL}
      ORDER BY o.gain_date ASC
      `,
      paramsBase
    )

    // Processar oportunidades e associar unidades via mapa
    const oportunidadesSheetData: any[] = []
    const acumuladoByUnidade = new Map<number, {
      unidade_id: number
      unidade_nome: string
      total_oportunidades: number
      total_realizado: number
      vendedores: Set<number>
    }>()

    for (const r of oportunidadesRows) {
      const vendedorId = r.vendedor_id ? Number(r.vendedor_id) : null
      const unidadeInfo = vendedorId ? vendedorToUnidade.get(vendedorId) : null
      
      const unidadeId = unidadeInfo?.unidade_id || 0
      const unidadeNome = unidadeInfo?.unidade_nome || 'Sem Nome'

      // Filtrar por unidade se necessário (só incluir se vendedor pertence a uma unidade filtrada)
      if (unidadeIdsFilter.length > 0 || grupoId) {
        if (!unidadeInfo) continue // Pular se vendedor não pertence a nenhuma unidade filtrada
      }

      // Adicionar à aba de oportunidades
      oportunidadesSheetData.push({
        oportunidade_id: Number(r.oportunidade_id),
        titulo: r.titulo,
        status: r.status,
        value: Number(r.value || 0),
        gain_date: r.gain_date ? new Date(r.gain_date).toISOString() : null,
        user: r.user,
        coluna_funil_id: r.coluna_funil_id != null ? Number(r.coluna_funil_id) : null,
        funil_id: r.funil_id != null ? Number(r.funil_id) : null,
        funil_nome: r.funil_nome,
        vendedor_id: vendedorId,
        vendedor_nome: r.vendedor_nome,
        vendedor_sobrenome: r.vendedor_sobrenome,
        vendedor_username: r.vendedor_username,
        unidade_id: unidadeId,
        unidade_nome: unidadeNome
      })

      // Acumular por unidade
      if (!acumuladoByUnidade.has(unidadeId)) {
        acumuladoByUnidade.set(unidadeId, {
          unidade_id: unidadeId,
          unidade_nome: unidadeNome,
          total_oportunidades: 0,
          total_realizado: 0,
          vendedores: new Set()
        })
      }
      const acum = acumuladoByUnidade.get(unidadeId)!
      acum.total_oportunidades++
      acum.total_realizado += Number(r.value || 0)
      if (vendedorId) acum.vendedores.add(vendedorId)
    }

    // Buscar metas do mês/ano (por unidade)
    const metasRows = await executeQuery<any>(
      `
      SELECT
        unidade_id,
        COALESCE(SUM(meta_valor), 0) AS meta_total
      FROM metas_mensais
      WHERE mes = ? AND ano = ?
      ${unidadeIdsFilter.length > 0 ? `AND unidade_id IN (${unidadeIdsFilter.map(() => '?').join(',')})` : ''}
      GROUP BY unidade_id
      `,
      [mes, ano, ...(unidadeIdsFilter.length > 0 ? unidadeIdsFilter : [])]
    )
    const metaByUnidade = new Map<number, number>(
      metasRows.map((r: any) => [Number(r.unidade_id), Number(r.meta_total || 0)])
    )

    // Montar dados da aba Acumulado
    const acumuladoSheetData = Array.from(acumuladoByUnidade.values())
      .map((acum) => {
        const metaTotal = metaByUnidade.get(acum.unidade_id) || 0
        const ticketMedio = acum.total_oportunidades > 0 ? acum.total_realizado / acum.total_oportunidades : 0
        const percentualMeta = metaTotal > 0 ? (acum.total_realizado / metaTotal) * 100 : 0

        return {
          unidade_id: acum.unidade_id,
          unidade_nome: acum.unidade_nome,
          mes,
          ano,
          total_vendedores: acum.vendedores.size,
          total_oportunidades: acum.total_oportunidades,
          total_realizado: acum.total_realizado,
          meta_total: metaTotal,
          ticket_medio: ticketMedio,
          percentual_meta: percentualMeta
        }
      })
      .sort((a, b) => b.total_realizado - a.total_realizado)

    // Formatar dados para exibição amigável
    const acumuladoFormatado = acumuladoSheetData.map((row) => ({
      'ID Unidade': row.unidade_id,
      'Unidade': row.unidade_nome,
      'Mês': row.mes,
      'Ano': row.ano,
      'Vendedores': row.total_vendedores,
      'Oportunidades': row.total_oportunidades,
      'Total Realizado (R$)': row.total_realizado,
      'Meta (R$)': row.meta_total,
      'Ticket Médio (R$)': row.ticket_medio,
      '% Meta': row.percentual_meta
    }))

    const oportunidadesFormatado = oportunidadesSheetData.map((row) => ({
      'ID Oportunidade': row.oportunidade_id,
      'Título': row.titulo,
      'Valor (R$)': row.value,
      'Data Ganho': row.gain_date ? new Date(row.gain_date).toLocaleDateString('pt-BR') : '',
      'Funil': row.funil_nome || '',
      'ID Vendedor': row.vendedor_id || '',
      'Vendedor': row.vendedor_nome ? `${row.vendedor_nome} ${row.vendedor_sobrenome || ''}`.trim() : '',
      'ID Unidade': row.unidade_id,
      'Unidade': row.unidade_nome
    }))

    const wb = XLSX.utils.book_new()
    
    // Criar planilha Acumulado
    const wsAcumulado = XLSX.utils.json_to_sheet(acumuladoFormatado)
    
    // Definir largura das colunas - Acumulado
    wsAcumulado['!cols'] = [
      { wch: 12 },  // ID Unidade
      { wch: 30 },  // Unidade
      { wch: 6 },   // Mês
      { wch: 6 },   // Ano
      { wch: 12 },  // Vendedores
      { wch: 14 },  // Oportunidades
      { wch: 20 },  // Total Realizado
      { wch: 18 },  // Meta
      { wch: 18 },  // Ticket Médio
      { wch: 10 }   // % Meta
    ]

    // Criar planilha Oportunidades
    const wsOportunidades = XLSX.utils.json_to_sheet(oportunidadesFormatado)
    
    // Definir largura das colunas - Oportunidades
    wsOportunidades['!cols'] = [
      { wch: 15 },  // ID Oportunidade
      { wch: 40 },  // Título
      { wch: 15 },  // Valor
      { wch: 12 },  // Data Ganho
      { wch: 20 },  // Funil
      { wch: 12 },  // ID Vendedor
      { wch: 30 },  // Vendedor
      { wch: 12 },  // ID Unidade
      { wch: 30 }   // Unidade
    ]

    XLSX.utils.book_append_sheet(wb, wsAcumulado, 'Acumulado')
    XLSX.utils.book_append_sheet(wb, wsOportunidades, 'Oportunidades')

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const filename = `acumulado_${dataInicio}_a_${dataFim}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao exportar Excel',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}


