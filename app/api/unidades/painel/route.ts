import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Buscar todas as unidades ativas com estatísticas de oportunidades
    // usando JOIN com vendedores_unidades para relacionar vendedores e unidades
    // Filtrando apenas por status da oportunidade, sem filtros de vendedores
    const unidades = await executeQuery(`
      SELECT 
        u.id, 
        u.nome, 
        u.name,
        COALESCE(u.nome, u.name) as nome_exibicao,
        COUNT(DISTINCT CASE 
          WHEN o.status IN ('open', 'aberta', 'active') THEN o.id 
          ELSE NULL 
        END) as oportunidades_abertas,
        COUNT(DISTINCT CASE 
          WHEN o.status = 'gain' THEN o.id 
          ELSE NULL 
        END) as oportunidades_ganhas,
        COUNT(DISTINCT CASE 
          WHEN o.status = 'lost' THEN o.id 
          ELSE NULL 
        END) as oportunidades_perdidas,
        COALESCE(SUM(CASE 
          WHEN o.status = 'gain' THEN o.value 
          ELSE 0 
        END), 0) as valor_ganho
      FROM unidades u
      LEFT JOIN vendedores_unidades vu ON u.id = vu.unidade_id
      LEFT JOIN oportunidades o ON vu.vendedor_id = o.user
      WHERE (u.nome IS NOT NULL OR u.name IS NOT NULL)
        AND u.ativo = 1
      GROUP BY u.id, u.nome, u.name
      ORDER BY COALESCE(u.nome, u.name)
    `) as any[]

    // Formatar resultado
    const unidadesComOportunidades = unidades.map((unidade) => ({
      id: unidade.id,
      nome: unidade.nome || unidade.name,
      nome_exibicao: unidade.nome_exibicao,
      oportunidades_abertas: Number(unidade.oportunidades_abertas) || 0,
      oportunidades_ganhas: Number(unidade.oportunidades_ganhas) || 0,
      oportunidades_perdidas: Number(unidade.oportunidades_perdidas) || 0,
      valor_ganho: Number(unidade.valor_ganho) || 0
    }))

    return NextResponse.json({
      success: true,
      unidades: unidadesComOportunidades
    })

  } catch (error) {
    console.error('❌ Erro ao buscar unidades para painel:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

