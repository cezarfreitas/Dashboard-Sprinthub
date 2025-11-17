import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar dados da unidade do gestor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unidadeId = params.id

    if (!unidadeId) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar dados da unidade
    const unidades = await executeQuery(`
      SELECT 
        u.id,
        u.nome,
        u.responsavel,
        COUNT(DISTINCT v.id) as total_vendedores
      FROM unidades u
      LEFT JOIN vendedores v ON u.id = v.unidade_id
      WHERE u.id = ?
      GROUP BY u.id, u.nome, u.responsavel
    `, [unidadeId]) as any[]

    if (unidades.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    const unidade = unidades[0]

    // Buscar vendedores da unidade
    const vendedoresUnidades = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.email,
        v.username,
        v.telephone,
        1 as sequencia,
        v.ativo
      FROM vendedores v
      WHERE v.unidade_id = ?
      ORDER BY v.name ASC
    `, [unidadeId]) as any[]

    // Buscar roleta da unidade
    const roletas = await executeQuery(`
      SELECT id FROM roletas WHERE unidade_id = ? AND ativo = TRUE
    `, [unidadeId]) as any[]

    let filaVendedores: any[] = []
    if (roletas.length > 0) {
      // Buscar fila da roleta
      filaVendedores = await executeQuery(`
        SELECT 
          fr.vendedor_id,
          fr.ordem,
          v.name,
          v.lastName,
          v.email,
          v.telephone
        FROM fila_roleta fr
        LEFT JOIN vendedores v ON fr.vendedor_id = v.id
        WHERE fr.roleta_id = ?
        ORDER BY fr.ordem ASC
      `, [roletas[0].id]) as any[]
    }

    // Separar vendedores em fila e fora da fila
    const vendedoresNaFila = vendedoresUnidades.filter(v => 
      filaVendedores.some(f => f.vendedor_id === v.id)
    )
    const vendedoresForaFila = vendedoresUnidades.filter(v => 
      !filaVendedores.some(f => f.vendedor_id === v.id)
    )

    return NextResponse.json({
      success: true,
      unidade: {
        id: unidade.id,
        nome: unidade.nome,
        responsavel: unidade.responsavel,
        total_vendedores: parseInt(unidade.total_vendedores) || 0,
        vendedores_na_fila: vendedoresNaFila,
        vendedores_fora_fila: vendedoresForaFila,
        fila_roleta: filaVendedores
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar dados da unidade:', error)
    
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
