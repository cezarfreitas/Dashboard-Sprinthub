import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// POST - Autenticar consultor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar consultor no banco
    const consultores = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.username,
        v.email,
        v.telephone,
        u.id as unidade_id,
        COALESCE(u.name, u.nome) as unidade_nome,
        u.responsavel as unidade_responsavel
      FROM vendedores v
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE v.username = ?
    `, [username]) as Array<{
      id: number
      name: string
      lastName: string
      username: string
      email: string
      telephone: string
      unidade_id: number
      unidade_nome: string
      unidade_responsavel: string
    }>

    if (consultores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado ou inativo' },
        { status: 401 }
      )
    }

    const consultor = consultores[0]

    // Verificar senha (por enquanto, aceita qualquer senha - implementar hash depois)
    // TODO: Implementar verificação de senha com hash
    if (password !== '123456') {
      return NextResponse.json(
        { success: false, message: 'Senha incorreta' },
        { status: 401 }
      )
    }

    // Retornar dados do consultor (sem senha)
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
        unidade: {
          id: consultor.unidade_id,
          nome: consultor.unidade_nome,
          responsavel: consultor.unidade_responsavel
        }
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





















