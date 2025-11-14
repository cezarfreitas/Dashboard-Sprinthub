import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import bcrypt from 'bcryptjs'
import { normalizePermissoes, parsePermissoesFromDB } from '@/lib/normalize-permissoes'

export const dynamic = 'force-dynamic'

interface UsuarioSistema {
  id: number
  nome: string
  email: string
  whatsapp: string | null
  senha: string
  permissoes: string | string[]
  ativo: boolean
  created_at: string
  updated_at: string
}

// GET - Listar todos os usuários
export async function GET(request: NextRequest) {
  try {
    const usuarios = await executeQuery(`
      SELECT id, nome, email, whatsapp, permissoes, ativo, created_at, updated_at
      FROM usuarios_sistema 
      ORDER BY nome
    `) as UsuarioSistema[]

    // Parsear permissões JSON usando normalização
    const usuariosFormatados = usuarios.map(usuario => ({
      ...usuario,
      permissoes: parsePermissoesFromDB(usuario.permissoes)
    }))

    return NextResponse.json({
      success: true,
      usuarios: usuariosFormatados
    })

  } catch (error) {
    console.error('❌ Erro ao buscar usuários do sistema:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar usuários',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// POST - Criar novo usuário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, email, whatsapp, senha, permissoes, ativo } = body

    // Validações
    if (!nome || !email || !senha) {
      return NextResponse.json(
        { success: false, message: 'Nome, email e senha são obrigatórios' },
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

    // Verificar se email já existe
    const existingUser = await executeQuery(
      'SELECT id FROM usuarios_sistema WHERE email = ?',
      [email]
    ) as any[]

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Email já cadastrado' },
        { status: 409 }
      )
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)

    // Normalizar permissões - aceita qualquer formato e retorna array limpo
    const permissoesNormalizadas = normalizePermissoes(permissoes)
    const permissoesJson = JSON.stringify(permissoesNormalizadas)

    // Inserir usuário
    const result = await executeQuery(
      `INSERT INTO usuarios_sistema (nome, email, whatsapp, senha, permissoes, ativo) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, email, whatsapp || null, senhaHash, permissoesJson, ativo !== false]
    ) as any

    const novoUsuario = await executeQuery(
      'SELECT id, nome, email, whatsapp, permissoes, ativo, created_at, updated_at FROM usuarios_sistema WHERE id = ?',
      [result.insertId]
    ) as UsuarioSistema[]

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      usuario: {
        ...novoUsuario[0],
        permissoes: parsePermissoesFromDB(novoUsuario[0].permissoes)
      }
    })

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao criar usuário',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nome, email, whatsapp, senha, permissoes, ativo } = body

    if (!id || !nome || !email) {
      return NextResponse.json(
        { success: false, message: 'ID, nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se usuário existe
    const existingUser = await executeQuery(
      'SELECT id FROM usuarios_sistema WHERE id = ?',
      [id]
    ) as any[]

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se email já está em uso por outro usuário
    const duplicateEmail = await executeQuery(
      'SELECT id FROM usuarios_sistema WHERE email = ? AND id != ?',
      [email, id]
    ) as any[]

    if (duplicateEmail.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Email já está em uso por outro usuário' },
        { status: 409 }
      )
    }

    // Normalizar permissões - aceita qualquer formato e retorna array limpo
    const permissoesNormalizadas = normalizePermissoes(permissoes)
    const permissoesJson = JSON.stringify(permissoesNormalizadas)

    // Se senha foi fornecida, fazer hash
    if (senha && senha.trim() !== '') {
      const senhaHash = await bcrypt.hash(senha, 10)
      await executeQuery(
        `UPDATE usuarios_sistema 
         SET nome = ?, email = ?, whatsapp = ?, senha = ?, permissoes = ?, ativo = ?
         WHERE id = ?`,
        [nome, email, whatsapp || null, senhaHash, permissoesJson, ativo !== false, id]
      )
    } else {
      // Atualizar sem alterar a senha
      await executeQuery(
        `UPDATE usuarios_sistema 
         SET nome = ?, email = ?, whatsapp = ?, permissoes = ?, ativo = ?
         WHERE id = ?`,
        [nome, email, whatsapp || null, permissoesJson, ativo !== false, id]
      )
    }

    const usuarioAtualizado = await executeQuery(
      'SELECT id, nome, email, whatsapp, permissoes, ativo, created_at, updated_at FROM usuarios_sistema WHERE id = ?',
      [id]
    ) as UsuarioSistema[]

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      usuario: {
        ...usuarioAtualizado[0],
        permissoes: parsePermissoesFromDB(usuarioAtualizado[0].permissoes)
      }
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao atualizar usuário',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se usuário existe
    const existingUser = await executeQuery(
      'SELECT id FROM usuarios_sistema WHERE id = ?',
      [id]
    ) as any[]

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Excluir usuário
    await executeQuery('DELETE FROM usuarios_sistema WHERE id = ?', [id])

    return NextResponse.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao excluir usuário',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

