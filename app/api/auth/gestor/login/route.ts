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
              v.unidade_id, v.ativo, v.status
       FROM vendedores v
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

    // Verificar se é gestor - buscar unidades onde é gestor
    const unidadesGestor = await executeQuery(
      `SELECT u.id, u.nome, u.name, u.user_gestao
       FROM unidades u
       WHERE u.ativo = 1
       AND JSON_CONTAINS(u.user_gestao, ?)`,
      [JSON.stringify(vendedor.id)]
    ) as any[]

    if (unidadesGestor.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Você não tem permissão de gestor em nenhuma unidade.' },
        { status: 403 }
      )
    }

    // Atualizar last_login
    await executeQuery(
      'UPDATE vendedores SET last_login = NOW() WHERE id = ?',
      [vendedor.id]
    )

    // Formatar unidades
    const unidades = unidadesGestor.map(u => ({
      id: u.id,
      nome: u.nome || u.name
    }))

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      gestor: {
        id: vendedor.id,
        name: vendedor.name,
        lastName: vendedor.lastName,
        username: vendedor.username,
        email: vendedor.email,
        unidades: unidades,
        unidade_principal: unidades[0]
      }
    })

  } catch (error) {
    console.error('Erro no login do gestor:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

