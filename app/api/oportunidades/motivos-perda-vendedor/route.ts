import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface MotivoPerdaVendedor {
  vendedor_id: number
  vendedor_nome: string
  vendedor_sobrenome: string
  motivo: string
  quantidade: number
}

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
        dados: []
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
        dados: []
      })
    }

    // Criar placeholders para IN clause
    const placeholders = userIds.map(() => '?').join(',')

    // Buscar motivos de perda por vendedor
    const query = `
      SELECT 
        CAST(o.user AS UNSIGNED) as vendedor_id,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        COALESCE(mp.motivo, o.loss_reason, 'Sem motivo') as motivo,
        COUNT(*) as quantidade
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
      GROUP BY vendedor_id, vendedor_nome, vendedor_sobrenome, motivo
      ORDER BY vendedor_nome, vendedor_sobrenome, quantidade DESC
    `

    const params = [...userIds, dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
    const resultados = await executeQuery(query, params) as MotivoPerdaVendedor[]

    // Agrupar por vendedor
    const dadosPorVendedor: Record<number, {
      vendedor_id: number
      vendedor_nome: string
      vendedor_sobrenome: string
      motivos: Array<{ motivo: string; quantidade: number }>
      total: number
    }> = {}

    resultados.forEach((item) => {
      if (!dadosPorVendedor[item.vendedor_id]) {
        dadosPorVendedor[item.vendedor_id] = {
          vendedor_id: item.vendedor_id,
          vendedor_nome: item.vendedor_nome || 'Desconhecido',
          vendedor_sobrenome: item.vendedor_sobrenome || '',
          motivos: [],
          total: 0
        }
      }
      dadosPorVendedor[item.vendedor_id].motivos.push({
        motivo: item.motivo,
        quantidade: item.quantidade
      })
      dadosPorVendedor[item.vendedor_id].total += item.quantidade
    })

    // Converter para array e ordenar por nome
    const dados = Object.values(dadosPorVendedor).sort((a, b) => {
      const nomeA = `${a.vendedor_nome} ${a.vendedor_sobrenome}`.toLowerCase()
      const nomeB = `${b.vendedor_nome} ${b.vendedor_sobrenome}`.toLowerCase()
      return nomeA.localeCompare(nomeB)
    })

    return NextResponse.json({
      success: true,
      dados
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar motivos de perda',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

