import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// POST - Autenticar consultor (apenas com email)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      )
    }

    // Buscar consultor no banco por email (sem validar unidade)
    const consultores = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.username,
        v.email,
        v.telephone,
        v.ativo,
        v.status,
        u.id as unidade_id,
        COALESCE(u.name, u.nome) as unidade_nome,
        u.responsavel as unidade_responsavel
      FROM vendedores v
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE v.email = ?
    `, [email]) as Array<{
      id: number
      name: string
      lastName: string
      username: string
      email: string
      telephone: string
      ativo: number
      status: string
      unidade_id: number | null
      unidade_nome: string | null
      unidade_responsavel: string | null
    }>

    if (consultores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email não encontrado' },
        { status: 401 }
      )
    }

    const consultor = consultores[0]

    // Retornar dados do consultor (com ou sem unidade)
    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      consultor: {
        id: consultor.id,
        name: consultor.name,
        lastName: consultor.lastName,
        username: consultor.username,
        email: consultor.email,
        telephone: consultor.telephone,
        unidade_id: consultor.unidade_id || null,
        unidade_nome: consultor.unidade_nome || null,
        unidade_responsavel: consultor.unidade_responsavel || null
      }
    })

  } catch (error) {
    console.error('Erro ao autenticar consultor:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}





















