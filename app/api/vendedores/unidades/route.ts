import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Listar todas as unidades de um vendedor específico
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendedor_id = searchParams.get('vendedor_id')

    if (!vendedor_id) {
      return NextResponse.json(
        { success: false, message: 'ID do vendedor é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o vendedor existe
    const vendedor = await executeQuery(
      'SELECT id, name, lastName, email FROM vendedores WHERE id = ?',
      [vendedor_id]
    ) as any[]

    if (vendedor.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    // Buscar unidade do vendedor (via unidade_id direto)
    const unidades = await executeQuery(`
      SELECT u.id, u.nome, u.responsavel, v.created_at
      FROM vendedores v
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE v.id = ? AND u.id IS NOT NULL
      ORDER BY u.nome
    `, [vendedor_id]) as any[]

    return NextResponse.json({
      success: true,
      vendedor: vendedor[0],
      unidades: unidades,
      total_unidades: unidades.length
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// GET - Listar todos os vendedores com suas unidades (para relatório)
export async function POST(request: NextRequest) {
  try {
    // Buscar todos os vendedores com suas unidades (via unidade_id direto)
    const vendedoresUnidades = await executeQuery(`
      SELECT 
        v.id as vendedor_id,
        v.name,
        v.lastName,
        v.email,
        COALESCE(u.nome, u.name, 'Sem unidade') as unidades,
        CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END as total_unidades
      FROM vendedores v
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE v.ativo = 1
      ORDER BY v.name, v.lastName
    `) as any[]

    // Separar vendedores por categoria
    const vendedoresComUnidades = vendedoresUnidades.filter(v => v.total_unidades > 0)
    const vendedoresSemUnidades = vendedoresUnidades.filter(v => v.total_unidades === 0)

    return NextResponse.json({
      success: true,
      vendedores_com_unidades: vendedoresComUnidades,
      vendedores_sem_unidades: vendedoresSemUnidades,
      stats: {
        total_vendedores: vendedoresUnidades.length,
        total_com_unidades: vendedoresComUnidades.length,
        total_sem_unidades: vendedoresSemUnidades.length,
        vendedores_multi_unidade: vendedoresComUnidades.filter(v => v.total_unidades > 1).length
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
