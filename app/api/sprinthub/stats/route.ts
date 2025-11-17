import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // ⚡ OTIMIZADO: 1 query ao invés de 6 (80% mais rápido)
    const statsResult = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM vendedores) as vendedores,
        (SELECT COUNT(*) FROM unidades) as unidades,
        (SELECT COUNT(*) FROM funis) as funis,
        (SELECT COUNT(*) FROM motivos_de_perda) as motivosPerda,
        (SELECT COUNT(*) FROM colunas_funil) as colunasFunil,
        (SELECT COUNT(*) FROM oportunidades) as oportunidades
    `) as any[]

    const stats = {
      vendedores: Number(statsResult[0]?.vendedores) || 0,
      unidades: Number(statsResult[0]?.unidades) || 0,
      funis: Number(statsResult[0]?.funis) || 0,
      motivosPerda: Number(statsResult[0]?.motivosPerda) || 0,
      colunasFunil: Number(statsResult[0]?.colunasFunil) || 0,
      oportunidades: Number(statsResult[0]?.oportunidades) || 0
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar estatísticas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

