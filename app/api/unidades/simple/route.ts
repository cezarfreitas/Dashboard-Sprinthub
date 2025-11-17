import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const unidades = await executeQuery(`
      SELECT 
        id, 
        COALESCE(nome, name) as nome,
        ativo
      FROM unidades 
      WHERE (nome IS NOT NULL OR name IS NOT NULL)
      ORDER BY COALESCE(nome, name) ASC
    `) as Array<{ id: number; nome: string; ativo: number }>

    return NextResponse.json({
      success: true,
      unidades: unidades.map(u => ({
        id: u.id,
        nome: u.nome,
        ativo: u.ativo === 1
      }))
    })
  } catch (error) {
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

