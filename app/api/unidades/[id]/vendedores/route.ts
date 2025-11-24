import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar vendedores de uma unidade específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unidadeId = parseInt(params.id)
    
    if (isNaN(unidadeId)) {
      return NextResponse.json(
        { success: false, message: 'ID de unidade inválido' },
        { status: 400 }
      )
    }

    // Buscar unidade para obter o campo users (JSON)
    const unidades = await executeQuery(
      `SELECT id, users FROM unidades WHERE id = ?`,
      [unidadeId]
    ) as any[]

    if (unidades.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    const unidade = unidades[0]
    
    // Extrair IDs de vendedores do campo JSON users
    let userIds: number[] = []
    if (unidade.users) {
      try {
        const parsed = typeof unidade.users === 'string' 
          ? JSON.parse(unidade.users) 
          : unidade.users
        
        if (Array.isArray(parsed)) {
          userIds = parsed
            .map((u: any) => typeof u === 'object' ? u.id : u)
            .filter((id: any) => typeof id === 'number')
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Se não encontrou IDs no campo users, tentar buscar por unidade_id
    let vendedores: any[] = []
    
    if (userIds.length > 0) {
      // Buscar vendedores pelos IDs extraídos do campo users
      const placeholders = userIds.map(() => '?').join(',')
      vendedores = await executeQuery(
        `SELECT 
          id,
          name,
          lastName,
          email,
          ativo
        FROM vendedores 
        WHERE id IN (${placeholders}) AND ativo = 1
        ORDER BY name ASC, lastName ASC`,
        userIds
      ) as any[]
    } else {
      // Fallback: buscar por unidade_id (caso ainda exista essa relação)
      vendedores = await executeQuery(
        `SELECT 
          id,
          name,
          lastName,
          email,
          ativo
        FROM vendedores 
        WHERE unidade_id = ? AND ativo = 1
        ORDER BY name ASC, lastName ASC`,
        [unidadeId]
      ) as any[]
    }

    return NextResponse.json({
      success: true,
      vendedores: vendedores.map(v => ({
        id: v.id,
        name: v.name,
        lastName: v.lastName || '',
        email: v.email
      }))
    })

  } catch (error) {
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

