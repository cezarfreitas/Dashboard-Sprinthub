import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const unidades = await executeQuery(`
      SELECT 
        u.id, 
        COALESCE(u.nome, u.name) as nome
      FROM unidades u
      WHERE u.ativo = 1
        AND (u.nome IS NOT NULL OR u.name IS NOT NULL)
      ORDER BY COALESCE(u.nome, u.name)
    `) as any[]

    return NextResponse.json({
      success: true,
      unidades: unidades.map(u => ({
        id: u.id,
        nome: u.nome
      }))
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar lista de unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
