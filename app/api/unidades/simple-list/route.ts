import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const unidades = await executeQuery(`
      SELECT id, name, department_id, ativo
      FROM unidades
      WHERE name IS NOT NULL
      ORDER BY name ASC
    `) as any[]

    return NextResponse.json({
      success: true,
      count: unidades.length,
      unidades
    })
  } catch (error) {
    console.error('Erro ao buscar lista de unidades:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

























