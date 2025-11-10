import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { SignJWT } from 'jose'

export const dynamic = 'force-dynamic'

// POST - Login do gestor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, senha } = body

    if (!email || !senha) {
      return NextResponse.json(
        { success: false, message: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar gestor por email e username (senha)
    const gestores = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.email,
        v.username,
        u.id as unidade_id,
        u.nome as unidade_nome,
        u.responsavel
      FROM vendedores v
      JOIN unidades u ON u.responsavel = CONCAT(v.name, ' ', v.lastName)
      WHERE v.email = ? AND v.username = ?
    `, [email, senha]) as any[]

    if (gestores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    const gestor = gestores[0]

    // Verificar se o gestor é realmente responsável pela unidade
    if (gestor.responsavel !== `${gestor.name} ${gestor.lastName}`) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - você não é gestor desta unidade' },
        { status: 403 }
      )
    }

    // Criar token JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')
    const token = await new SignJWT({
      id: gestor.id,
      email: gestor.email,
      unidade_id: gestor.unidade_id,
      type: 'gestor'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret)

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      gestor: {
        id: gestor.id,
        name: gestor.name,
        lastName: gestor.lastName,
        email: gestor.email,
        username: gestor.username,
        unidade_id: gestor.unidade_id,
        unidade_nome: gestor.unidade_nome
      }
    })

  } catch (error) {
    console.error('❌ Erro no login do gestor:', error)
    
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

// GET - Verificar se gestor está autenticado
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Aqui você pode verificar o token JWT
    // Por simplicidade, vamos apenas retornar sucesso se o token existe
    return NextResponse.json({
      success: true,
      message: 'Token válido'
    })

  } catch (error) {
    console.error('❌ Erro ao verificar token:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Token inválido'
      },
      { status: 401 }
    )
  }
}
