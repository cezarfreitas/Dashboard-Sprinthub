import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadeId = searchParams.get('unidade_id')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')

    if (!unidadeId) {
      return NextResponse.json(
        { success: false, message: 'unidade_id é obrigatório' },
        { status: 400 }
      )
    }

    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        { success: false, message: 'data_inicio e data_fim são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar vendedores da unidade
    const unidade = await executeQuery(`
      SELECT users FROM unidades WHERE id = ?
    `, [parseInt(unidadeId)]) as any[]

    if (!unidade || unidade.length === 0) {
      return NextResponse.json({
        success: true,
        dados: [],
        motivos: [],
        vendedores: []
      })
    }

    // Parsear lista de vendedores do JSON
    let userIds: number[] = []
    try {
      const usersData = unidade[0].users
      if (typeof usersData === 'string') {
        userIds = JSON.parse(usersData)
      } else if (Array.isArray(usersData)) {
        userIds = usersData
      }
    } catch {
      // Ignorar erro ao parsear
    }

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        dados: [],
        motivos: [],
        vendedores: []
      })
    }

    // Criar placeholders para IN clause
    const placeholders = userIds.map(() => '?').join(',')

    // Buscar dados agrupados por vendedor e motivo de perda
    const query = `
      SELECT 
        CAST(o.user AS UNSIGNED) as vendedor_id,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        COALESCE(mp.motivo, o.loss_reason, 'Sem motivo') as motivo,
        COUNT(*) as quantidade,
        COALESCE(SUM(o.value), 0) as valor_total,
        AVG(DATEDIFF(o.lost_date, o.createDate)) as lost_time_medio
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      LEFT JOIN motivos_de_perda mp ON CAST(
        CASE 
          WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
          ELSE o.loss_reason
        END AS UNSIGNED
      ) = mp.id
      WHERE CAST(o.user AS UNSIGNED) IN (${placeholders})
        AND o.archived = 0
        AND o.status = 'lost'
        AND o.lost_date IS NOT NULL
        AND o.lost_date >= ?
        AND o.lost_date <= ?
      GROUP BY CAST(o.user AS UNSIGNED), v.name, v.lastName, COALESCE(mp.motivo, o.loss_reason, 'Sem motivo')
      ORDER BY v.name, v.lastName, quantidade DESC
    `

    const params = [...userIds, dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
    const resultados = await executeQuery(query, params) as Array<{
      vendedor_id: number
      vendedor_nome: string
      vendedor_sobrenome: string
      motivo: string
      quantidade: number
      valor_total: number
      lost_time_medio: number
    }>

    // Agrupar por vendedor
    const dadosPorVendedor: Record<number, {
      vendedor_id: number
      vendedor_nome: string
      vendedor_sobrenome: string
      motivos: Array<{
        motivo: string
        quantidade: number
        valor_total: number
        lost_time_medio: number
      }>
    }> = {}

    resultados.forEach((item) => {
      if (!dadosPorVendedor[item.vendedor_id]) {
        dadosPorVendedor[item.vendedor_id] = {
          vendedor_id: Number(item.vendedor_id),
          vendedor_nome: item.vendedor_nome || 'Desconhecido',
          vendedor_sobrenome: item.vendedor_sobrenome || '',
          motivos: []
        }
      }
      dadosPorVendedor[item.vendedor_id].motivos.push({
        motivo: item.motivo,
        quantidade: Number(item.quantidade) || 0,
        valor_total: Number(item.valor_total) || 0,
        lost_time_medio: Number(item.lost_time_medio) || 0
      })
    })

    // Converter para array e ordenar por nome
    const vendedores = Object.values(dadosPorVendedor).sort((a, b) => {
      const nomeA = `${a.vendedor_nome} ${a.vendedor_sobrenome}`.toLowerCase()
      const nomeB = `${b.vendedor_nome} ${b.vendedor_sobrenome}`.toLowerCase()
      return nomeA.localeCompare(nomeB)
    })

    // Coletar todos os motivos únicos
    const motivosSet = new Set<string>()
    resultados.forEach(item => {
      motivosSet.add(item.motivo)
    })
    const motivos = Array.from(motivosSet).sort()

    return NextResponse.json({
      success: true,
      dados: vendedores,
      motivos,
      vendedores: vendedores.map(v => ({
        id: v.vendedor_id,
        nome: v.vendedor_nome,
        sobrenome: v.vendedor_sobrenome
      }))
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar matriz de perdas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

