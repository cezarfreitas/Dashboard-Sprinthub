import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Buscar contagem de cada tabela
    const vendedoresResult = await executeQuery(
      'SELECT COUNT(*) as total FROM vendedores'
    ) as any[]
    
    const unidadesResult = await executeQuery(
      'SELECT COUNT(*) as total FROM unidades'
    ) as any[]
    
    const funisResult = await executeQuery(
      'SELECT COUNT(*) as total FROM funis'
    ) as any[]
    
    const motivosPerdaResult = await executeQuery(
      'SELECT COUNT(*) as total FROM motivos_de_perda'
    ) as any[]
    
    const colunasFunilResult = await executeQuery(
      'SELECT COUNT(*) as total FROM colunas_funil'
    ) as any[]

    const oportunidadesResult = await executeQuery(
      'SELECT COUNT(*) as total FROM oportunidades'
    ) as any[]

    const stats = {
      vendedores: vendedoresResult[0]?.total || 0,
      unidades: unidadesResult[0]?.total || 0,
      funis: funisResult[0]?.total || 0,
      motivosPerda: motivosPerdaResult[0]?.total || 0,
      colunasFunil: colunasFunilResult[0]?.total || 0,
      oportunidades: oportunidadesResult[0]?.total || 0
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
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

