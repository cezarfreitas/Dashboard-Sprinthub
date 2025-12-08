import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'mensal' // mensal ou anual
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))

    let query = `
      SELECT 
        v.id as vendedor_id,
        v.name,
        v.lastName,
        v.email,
        v.username,
        v.telephone,
        COUNT(DISTINCT o.id) as total_oportunidades,
        COALESCE(SUM(CASE WHEN o.status = 'gain' THEN o.value ELSE 0 END), 0) as total_realizado,
        GROUP_CONCAT(DISTINCT o.status) as status_list
      FROM vendedores v
      LEFT JOIN oportunidades o ON o.user = v.id
    `

    const params: any[] = []

    if (tipo === 'mensal') {
      // Filtrar por mês e ano específicos - GMT-3
      query += ` WHERE MONTH(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`
      params.push(mes, ano)
    } else if (tipo === 'anual') {
      // Filtrar apenas por ano - GMT-3
      query += ` WHERE YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`
      params.push(ano)
    }

    query += `
      GROUP BY v.id, v.name, v.lastName, v.email, v.username, v.telephone
      HAVING total_realizado > 0
      ORDER BY total_realizado DESC
    `

    const ranking = await executeQuery(query, params) as any[]

    // Adicionar posição e medalha
    const rankingComPosicao = ranking.map((item, index) => ({
      ...item,
      posicao: index + 1,
      medalha: index === 0 ? 'ouro' : index === 1 ? 'prata' : index === 2 ? 'bronze' : null,
      total_realizado: parseFloat(item.total_realizado || 0),
      total_oportunidades: parseInt(item.total_oportunidades || 0)
    }))

    return NextResponse.json({
      success: true,
      ranking: rankingComPosicao,
      filtros: {
        tipo,
        mes: tipo === 'mensal' ? mes : null,
        ano
      }
    })

  } catch (error) {
    console.error('Erro ao buscar ranking de vendedores:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar ranking de vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

