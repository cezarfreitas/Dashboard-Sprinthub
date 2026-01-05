import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json()

    if (!email || !senha) {
      return NextResponse.json(
        { success: false, message: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar vendedor pelo email
    const vendedores = await executeQuery(
      `SELECT v.id, v.name, v.lastName, v.email, v.username, v.senha, 
              v.unidade_id, v.ativo, v.status,
              u.nome as unidade_nome
       FROM vendedores v
       LEFT JOIN unidades u ON u.id = v.unidade_id
       WHERE v.email = ?`,
      [email]
    ) as any[]

    if (vendedores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    const vendedor = vendedores[0]

    // Verificar se está ativo
    if (!vendedor.ativo || vendedor.status === 'inactive' || vendedor.status === 'blocked') {
      return NextResponse.json(
        { success: false, message: 'Usuário inativo. Entre em contato com o administrador.' },
        { status: 403 }
      )
    }

    // Verificar se tem senha cadastrada
    if (!vendedor.senha) {
      return NextResponse.json(
        { success: false, message: 'Senha não cadastrada. Use "Esqueci minha senha" para criar uma.' },
        { status: 401 }
      )
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, vendedor.senha)

    if (!senhaValida) {
      return NextResponse.json(
        { success: false, message: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    // Atualizar last_login
    await executeQuery(
      'UPDATE vendedores SET last_login = NOW() WHERE id = ?',
      [vendedor.id]
    )

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      consultor: {
        id: vendedor.id,
        name: vendedor.name,
        lastName: vendedor.lastName,
        username: vendedor.username,
        email: vendedor.email,
        unidade_id: vendedor.unidade_id,
        unidade_nome: vendedor.unidade_nome
      }
    })

  } catch (error) {
    console.error('Erro no login do consultor:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

