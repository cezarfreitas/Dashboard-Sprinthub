import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeMutation } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Listar ausências de uma unidade
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

    // Buscar ausências da unidade com nomes dos vendedores
    const ausencias = await executeQuery(
      `SELECT 
        va.id,
        va.unidade_id,
        va.vendedor_id,
        va.data_inicio,
        va.data_fim,
        va.motivo,
        va.created_at,
        va.updated_at,
        CONCAT(v.name, ' ', COALESCE(v.lastName, '')) as vendedor_nome
      FROM vendedores_ausencias va
      LEFT JOIN vendedores v ON va.vendedor_id = v.id
      WHERE va.unidade_id = ?
      ORDER BY va.data_inicio DESC`,
      [unidadeId]
    ) as any[]

    return NextResponse.json({
      success: true,
      ausencias: ausencias.map(a => ({
        id: a.id,
        vendedor_id: a.vendedor_id,
        vendedor_nome: a.vendedor_nome?.trim() || null,
        data_inicio: a.data_inicio,
        data_fim: a.data_fim,
        motivo: a.motivo,
        created_at: a.created_at,
        updated_at: a.updated_at
      }))
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar ausências',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// POST - Criar nova ausência
export async function POST(
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

    const body = await request.json()
    const { vendedor_id, data_inicio, data_fim, motivo } = body

    // Validações
    if (!vendedor_id || !data_inicio || !data_fim || !motivo) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (new Date(data_fim) <= new Date(data_inicio)) {
      return NextResponse.json(
        { success: false, message: 'Data de fim deve ser posterior à data de início' },
        { status: 400 }
      )
    }

    // Verificar se a unidade existe
    const unidade = await executeQuery(
      `SELECT id FROM unidades WHERE id = ?`,
      [unidadeId]
    ) as any[]

    if (unidade.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o vendedor existe
    const vendedor = await executeQuery(
      `SELECT id FROM vendedores WHERE id = ? AND ativo = 1`,
      [vendedor_id]
    ) as any[]

    if (vendedor.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado ou inativo' },
        { status: 400 }
      )
    }

    // Buscar gestor do header (se disponível)
    const gestorId = request.headers.get('x-gestor-id')
    const createdBy = gestorId ? parseInt(gestorId, 10) : null

    // Validar tipos de dados
    const vendedorIdNum = Number(vendedor_id)
    if (isNaN(vendedorIdNum)) {
      return NextResponse.json(
        { success: false, message: 'ID do vendedor inválido' },
        { status: 400 }
      )
    }

    // Converter datas para formato MySQL (YYYY-MM-DD HH:MM:SS)
    const dataInicioDate = new Date(data_inicio)
    const dataFimDate = new Date(data_fim)
    
    if (isNaN(dataInicioDate.getTime()) || isNaN(dataFimDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Datas inválidas' },
        { status: 400 }
      )
    }

    const dataInicioMySQL = dataInicioDate.toISOString().slice(0, 19).replace('T', ' ')
    const dataFimMySQL = dataFimDate.toISOString().slice(0, 19).replace('T', ' ')

    // Inserir ausência
    const result = await executeMutation(
      `INSERT INTO vendedores_ausencias 
       (unidade_id, vendedor_id, data_inicio, data_fim, motivo, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [unidadeId, vendedorIdNum, dataInicioMySQL, dataFimMySQL, motivo.trim(), createdBy]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Erro ao inserir ausência' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Ausência registrada com sucesso',
      id: result.insertId || null
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao registrar ausência',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

