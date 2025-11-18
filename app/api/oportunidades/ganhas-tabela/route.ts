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

    // Buscar todas as oportunidades ganhas no período
    const query = `
      SELECT 
        o.id,
        o.title,
        o.value,
        o.createDate,
        o.gain_date,
        CAST(o.user AS UNSIGNED) as vendedor_id,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        u.name as unidade_nome,
        COALESCE(cf.nome_coluna, o.crm_column) as crm_column,
        o.gain_reason,
        o.sale_channel,
        o.campaign,
        DATEDIFF(o.gain_date, o.createDate) as win_time_dias
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      LEFT JOIN unidades u ON v.unidade_id = u.id
      LEFT JOIN colunas_funil cf ON (
        (o.coluna_funil_id IS NOT NULL AND o.coluna_funil_id = cf.id)
        OR
        (o.coluna_funil_id IS NULL AND o.crm_column IS NOT NULL AND CAST(o.crm_column AS UNSIGNED) = cf.id)
      )
      WHERE CAST(o.user AS UNSIGNED) IN (${placeholders})
        AND o.archived = 0
        AND o.status = 'gain'
        AND o.gain_date IS NOT NULL
        AND o.gain_date >= ?
        AND o.gain_date <= ?
      ORDER BY o.gain_date DESC, o.id DESC
    `

    const params = [...userIds, dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
    const resultados = await executeQuery(query, params) as Array<{
      id: number
      title: string
      value: number
      createDate: string
      gain_date: string
      vendedor_id: number
      vendedor_nome: string
      vendedor_sobrenome: string
      unidade_nome: string
      crm_column: string
      gain_reason: string | null
      sale_channel: string | null
      campaign: string | null
      win_time_dias: number
    }>

    // Formatar dados
    const dados = resultados.map(item => ({
      id: Number(item.id),
      titulo: item.title || '',
      valor: Number(item.value) || 0,
      data_criacao: item.createDate,
      data_ganho: item.gain_date,
      vendedor_id: Number(item.vendedor_id),
      vendedor_nome: item.vendedor_nome || 'Desconhecido',
      vendedor_sobrenome: item.vendedor_sobrenome || '',
      unidade_nome: item.unidade_nome || '',
      etapa: item.crm_column || '',
      motivo_ganho: item.gain_reason || '',
      canal_venda: item.sale_channel || '',
      campanha: item.campaign || '',
      win_time_dias: Number(item.win_time_dias) || 0
    }))

    // Calcular totais
    const totalOportunidades = dados.length
    const valorTotal = dados.reduce((sum, item) => sum + item.valor, 0)
    const winTimeMedio = dados.length > 0
      ? dados.reduce((sum, item) => sum + item.win_time_dias, 0) / dados.length
      : 0

    return NextResponse.json({
      success: true,
      dados,
      totais: {
        total_oportunidades: totalOportunidades,
        valor_total: valorTotal,
        win_time_medio: winTimeMedio
      }
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar negócios ganhos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

