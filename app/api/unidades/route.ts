import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { sincronizarRoletaUnidade, removerRoletaUnidade } from '@/lib/roleta-sync'

export const dynamic = 'force-dynamic'

interface Unidade {
  id: number
  nome: string | null
  name?: string | null
  responsavel: string | null
  created_at: string
  updated_at: string
  ativo?: number
  users?: string | any[] // Campo JSON com IDs dos vendedores
}

interface VendedorUnidade {
  id: number
  name: string
  lastName: string
  email: string
  username: string
  telephone: string
}

// GET - Listar todas as unidades com seus vendedores
export async function GET(request: NextRequest) {
  try {
    // Buscar todas as unidades (usando COALESCE para pegar nome ou name)
    const unidades = await executeQuery(`
      SELECT *, 
        COALESCE(nome, name) as nome_exibicao 
      FROM unidades 
      WHERE (nome IS NOT NULL OR name IS NOT NULL)
        AND ativo = 1
      ORDER BY COALESCE(nome, name)
    `) as Unidade[]

    // Buscar todos os vendedores
    const vendedores = await executeQuery(`
      SELECT id, name, lastName, email, username, telephone
      FROM vendedores 
      ORDER BY name
    `) as VendedorUnidade[]

    // Buscar informações das roletas e filas para cada unidade
    const unidadesComVendedores = await Promise.all(unidades.map(async (unidade) => {
      // Extrair IDs de vendedores do campo JSON users da unidade
      let userIds: number[] = []
      if (unidade.users) {
        try {
          const parsed = typeof unidade.users === 'string' 
            ? JSON.parse(unidade.users) 
            : unidade.users
          
          if (Array.isArray(parsed)) {
            userIds = parsed
              .map((u: any) => typeof u === 'object' ? u.id : u)
              .filter((id: any) => typeof id === 'number')
          }
        } catch (e) {
          console.warn(`Erro ao parsear users da unidade ${unidade.id}:`, e)
        }
      }

      // Buscar vendedores da unidade pelos IDs extraídos
      const vendedoresUnidade = vendedores
        .filter(v => userIds.includes(v.id))
        .map(v => ({
          id: v.id,
          name: v.name,
          lastName: v.lastName,
          email: v.email,
          username: v.username,
          telephone: v.telephone
        }))

      // Tabela roletas foi removida - todos os vendedores são tratados como "fora da fila"
      const vendedoresNaFila: any[] = []
      const vendedoresForaFila = vendedoresUnidade

      return {
        ...unidade,
        nome: (unidade as any).nome_exibicao || unidade.nome || (unidade as any).name,
        vendedores: vendedoresUnidade,
        vendedores_na_fila: vendedoresNaFila,
        vendedores_fora_fila: vendedoresForaFila,
        fila_roleta: vendedoresNaFila
      }
    }))

    // Vendedores sem unidade (aqueles que não estão no campo users de nenhuma unidade)
    const todosUserIds = unidades.flatMap(u => {
      if (!u.users) return []
      try {
        const parsed = typeof u.users === 'string' ? JSON.parse(u.users) : u.users
        if (Array.isArray(parsed)) {
          return parsed.map((user: any) => typeof user === 'object' ? user.id : user)
        }
      } catch (e) {
        console.warn(`Erro ao parsear users da unidade ${u.id}:`, e)
      }
      return []
    })
    
    const vendedoresSemUnidade = vendedores.filter(v => !todosUserIds.includes(v.id))

    return NextResponse.json({
      success: true,
      unidades: unidadesComVendedores,
      vendedores_sem_unidade: vendedoresSemUnidade,
      stats: {
        total_unidades: unidades.length,
        total_vendedores: vendedores.length,
        vendedores_com_unidade: todosUserIds.length,
        vendedores_sem_unidade: vendedoresSemUnidade.length
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar unidades:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// POST - Criar nova unidade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, responsavel } = body

    if (!nome || !responsavel) {
      return NextResponse.json(
        { success: false, message: 'Nome e responsável são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe unidade com o mesmo nome
    const existingUnit = await executeQuery(
      'SELECT id FROM unidades WHERE nome = ?',
      [nome]
    ) as any[]

    if (existingUnit.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Já existe uma unidade com este nome' },
        { status: 409 }
      )
    }

    // Criar nova unidade
    const result = await executeQuery(
      'INSERT INTO unidades (nome, responsavel) VALUES (?, ?)',
      [nome, responsavel]
    ) as any

    const novaUnidade = await executeQuery(
      'SELECT * FROM unidades WHERE id = ?',
      [result.insertId]
    ) as Unidade[]

    // Sincronizar roleta da nova unidade
    await sincronizarRoletaUnidade(result.insertId)

    return NextResponse.json({
      success: true,
      message: 'Unidade criada com sucesso',
      unidade: novaUnidade[0]
    })

  } catch (error) {
    console.error('❌ Erro ao criar unidade:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao criar unidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PUT - Atualizar unidade
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nome, responsavel } = body

    if (!id || !nome || !responsavel) {
      return NextResponse.json(
        { success: false, message: 'ID, nome e responsável são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a unidade existe
    const existingUnit = await executeQuery(
      'SELECT id FROM unidades WHERE id = ?',
      [id]
    ) as any[]

    if (existingUnit.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se já existe outra unidade com o mesmo nome
    const duplicateUnit = await executeQuery(
      'SELECT id FROM unidades WHERE nome = ? AND id != ?',
      [nome, id]
    ) as any[]

    if (duplicateUnit.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Já existe uma unidade com este nome' },
        { status: 409 }
      )
    }

    // Atualizar unidade
    await executeQuery(
      'UPDATE unidades SET nome = ?, responsavel = ? WHERE id = ?',
      [nome, responsavel, id]
    )

    const unidadeAtualizada = await executeQuery(
      'SELECT * FROM unidades WHERE id = ?',
      [id]
    ) as Unidade[]

    return NextResponse.json({
      success: true,
      message: 'Unidade atualizada com sucesso',
      unidade: unidadeAtualizada[0]
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar unidade:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao atualizar unidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// DELETE - Excluir unidade
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a unidade existe
    const existingUnit = await executeQuery(
      'SELECT id FROM unidades WHERE id = ?',
      [id]
    ) as any[]

    if (existingUnit.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se há vendedores vinculados à unidade (campo users)
    const unidadeParaExcluir = await executeQuery(
      'SELECT users FROM unidades WHERE id = ?',
      [id]
    ) as any[]

    let totalVendedores = 0
    if (unidadeParaExcluir.length > 0 && unidadeParaExcluir[0].users) {
      try {
        const parsed = typeof unidadeParaExcluir[0].users === 'string' 
          ? JSON.parse(unidadeParaExcluir[0].users) 
          : unidadeParaExcluir[0].users
        if (Array.isArray(parsed)) {
          totalVendedores = parsed.length
        }
      } catch (e) {
        console.warn('Erro ao parsear users:', e)
      }
    }

    if (totalVendedores > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Não é possível excluir a unidade. Há ${totalVendedores} vendedor(es) vinculado(s) a ela.` 
        },
        { status: 409 }
      )
    }

    // Remover roleta da unidade antes de excluir
    await removerRoletaUnidade(parseInt(id))

    // Excluir unidade
    await executeQuery('DELETE FROM unidades WHERE id = ?', [id])

    return NextResponse.json({
      success: true,
      message: 'Unidade excluída com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao excluir unidade:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao excluir unidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
