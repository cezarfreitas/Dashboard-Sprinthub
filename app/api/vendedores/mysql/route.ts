import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * GET - Buscar vendedores diretamente da tabela vendedores por IDs
 * Query params:
 *   - ids: IDs dos vendedores separados por vírgula (ex: ids=256,255,253)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json({
        success: false,
        message: 'Parâmetro "ids" é obrigatório'
      }, { status: 400 })
    }

    // Parsear IDs
    const ids = idsParam
      .split(',')
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id))

    if (ids.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum ID válido fornecido'
      }, { status: 400 })
    }

    // Buscar vendedores
    const placeholders = ids.map(() => '?').join(',')
    const query = `
      SELECT 
        id,
        name,
        lastName,
        email,
        username,
        telephone,
        ativo
      FROM vendedores
      WHERE id IN (${placeholders})
      AND ativo = 1
      ORDER BY name, lastName
    `

    const vendedores = await executeQuery(query, ids) as Array<{
      id: number
      name: string
      lastName: string
      email: string
      username: string
      telephone: string | null
      ativo: number
    }>

    return NextResponse.json({
      success: true,
      vendedores,
      total: vendedores.length,
      message: `${vendedores.length} vendedores encontrados`
    })

  } catch (error) {
    console.error('[API] Erro ao buscar vendedores:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
