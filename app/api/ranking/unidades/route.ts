import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'mensal' // mensal ou anual
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))

    // Buscar todas as unidades primeiro
    const unidades = await executeQuery(`
      SELECT 
        u.id,
        u.nome,
        u.responsavel,
        u.users
      FROM unidades u
      ORDER BY u.nome
    `) as any[]

    // Para cada unidade, buscar as vendas dos seus vendedores
    const rankingPromises = unidades.map(async (unidade) => {
      // Parsear os IDs dos vendedores do campo users (JSON)
      let vendedorIds: number[] = []
      if (unidade.users) {
        try {
          const users = typeof unidade.users === 'string' ? JSON.parse(unidade.users) : unidade.users
          vendedorIds = Array.isArray(users) ? users : []
        } catch (e) {
          console.warn(`Erro ao parsear users da unidade ${unidade.id}:`, e)
        }
      }

      if (vendedorIds.length === 0) {
        return {
          unidade_id: unidade.id,
          unidade_nome: unidade.nome,
          unidade_responsavel: unidade.responsavel,
          total_oportunidades: 0,
          total_realizado: 0,
          total_vendedores: 0
        }
      }

      // Buscar vendas dos vendedores desta unidade
      let query = `
        SELECT 
          COUNT(DISTINCT o.id) as total_oportunidades,
          COALESCE(SUM(CASE WHEN o.status = 'gain' THEN o.value ELSE 0 END), 0) as total_realizado
        FROM oportunidades o
        WHERE o.user IN (${vendedorIds.map(() => '?').join(',')})
      `

      const params: any[] = [...vendedorIds]

      if (tipo === 'mensal') {
        // Filtrar por mês e ano específicos - GMT-3
        query += ` AND MONTH(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`
        params.push(mes, ano)
      } else if (tipo === 'anual') {
        // Filtrar apenas por ano - GMT-3
        query += ` AND YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`
        params.push(ano)
      }

      const resultado = await executeQuery(query, params) as any[]

      return {
        unidade_id: unidade.id,
        unidade_nome: unidade.nome,
        unidade_responsavel: unidade.responsavel,
        total_oportunidades: parseInt(resultado[0]?.total_oportunidades || 0),
        total_realizado: parseFloat(resultado[0]?.total_realizado || 0),
        total_vendedores: vendedorIds.length
      }
    })

    const ranking = await Promise.all(rankingPromises)

    // Filtrar unidades com vendas e ordenar
    const rankingFiltrado = ranking
      .filter(item => item.total_realizado > 0)
      .sort((a, b) => b.total_realizado - a.total_realizado)

    // Adicionar posição e medalha
    const rankingComPosicao = rankingFiltrado.map((item, index) => ({
      ...item,
      posicao: index + 1,
      medalha: index === 0 ? 'ouro' : index === 1 ? 'prata' : index === 2 ? 'bronze' : null
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
    console.error('Erro ao buscar ranking de unidades:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar ranking de unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

