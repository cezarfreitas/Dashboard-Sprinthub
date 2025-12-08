import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// POST - Autenticar gestor
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

    // Buscar vendedor pelo email
    const vendedores = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.username,
        v.email,
        v.telephone
      FROM vendedores v
      WHERE v.email = ? 
        AND v.ativo = TRUE
    `, [email]) as Array<{
      id: number
      name: string
      lastName: string
      username: string
      email: string
      telephone: string
    }>

    if (vendedores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email não encontrado ou usuário inativo' },
        { status: 401 }
      )
    }

    const vendedor = vendedores[0]

    // Verificar se este vendedor é gestor de alguma unidade
    // user_gestao agora é JSON array, usar JSON_CONTAINS para verificar
    const unidades = await executeQuery(`
      SELECT 
        u.id,
        COALESCE(u.name, u.nome) as nome,
        u.dpto_gestao,
        u.user_gestao
      FROM unidades u
      WHERE u.ativo = 1
        AND (
          JSON_CONTAINS(u.user_gestao, CAST(? AS JSON), '$')
          OR u.user_gestao = ?
        )
    `, [vendedor.id, vendedor.id]) as Array<{
      id: number
      nome: string
      dpto_gestao: number | null
      user_gestao: number | string
    }>

    if (unidades.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Este usuário não é gestor de nenhuma unidade ativa' 
        },
        { status: 403 }
      )
    }

    // Se é gestor de múltiplas unidades, pegar a primeira
    const unidade = unidades[0]

    // Retornar dados do gestor
    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      gestor: {
        id: vendedor.id,
        name: vendedor.name,
        lastName: vendedor.lastName,
        username: vendedor.username,
        email: vendedor.email,
        telephone: vendedor.telephone,
        unidades: unidades.map(u => ({
          id: u.id,
          nome: u.nome,
          dpto_gestao: u.dpto_gestao
        })),
        unidade_principal: {
          id: unidade.id,
          nome: unidade.nome,
          dpto_gestao: unidade.dpto_gestao
        }
      }
    })

  } catch (error) {
    console.error('Erro ao autenticar gestor:', error)
    
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

