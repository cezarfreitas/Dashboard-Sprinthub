import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { sincronizarRoletaUnidade, removerRoletaUnidade } from '@/lib/roleta-sync'

export const dynamic = 'force-dynamic'

interface Unidade {
  id: number
  nome: string
  responsavel: string
  created_at: string
  updated_at: string
}

interface VendedorUnidade {
  id: number
  name: string
  lastName: string
  email: string
  username: string
  telephone: string
  unidade_id: number | null
}

// GET - Listar todas as unidades com seus vendedores
export async function GET(request: NextRequest) {
  try {
    // Criar tabela se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS unidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        responsavel VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_nome (nome),
        INDEX idx_responsavel (responsavel)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de relacionamento many-to-many se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS vendedores_unidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendedor_id INT NOT NULL,
        unidade_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_vendedor_id (vendedor_id),
        INDEX idx_unidade_id (unidade_id),
        INDEX idx_vendedor_unidade (vendedor_id, unidade_id),
        UNIQUE KEY unique_vendedor_unidade (vendedor_id, unidade_id),
        
        CONSTRAINT fk_vendedores_unidades_vendedor 
          FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) 
          ON DELETE CASCADE ON UPDATE CASCADE,
          
        CONSTRAINT fk_vendedores_unidades_unidade 
          FOREIGN KEY (unidade_id) REFERENCES unidades(id) 
          ON DELETE CASCADE ON UPDATE CASCADE
          
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Buscar todas as unidades
    const unidades = await executeQuery('SELECT * FROM unidades ORDER BY nome') as Unidade[]

    // Buscar todos os vendedores
    const vendedores = await executeQuery(`
      SELECT id, name, lastName, email, username, telephone 
      FROM vendedores 
      ORDER BY name
    `) as VendedorUnidade[]

    // Buscar relacionamentos vendedores-unidades ordenados pela sequencia
    const vendedoresUnidades = await executeQuery(`
      SELECT vu.vendedor_id, vu.unidade_id, vu.sequencia, vu.ativo, v.name, v.lastName, v.email, v.username, v.telephone, u.nome as unidade_nome
      FROM vendedores_unidades vu
      JOIN vendedores v ON vu.vendedor_id = v.id
      JOIN unidades u ON vu.unidade_id = u.id
      ORDER BY u.nome, vu.sequencia
    `) as any[]

    // Organizar vendedores por unidade
    const unidadesComVendedores = unidades.map(unidade => ({
      ...unidade,
      vendedores: vendedoresUnidades
        .filter(vu => vu.unidade_id === unidade.id)
        .map(vu => ({
          id: vu.vendedor_id,
          name: vu.name,
          lastName: vu.lastName,
          email: vu.email,
          username: vu.username,
          telephone: vu.telephone,
          sequencia: vu.sequencia,
          ativo: vu.ativo
        }))
    }))

    // Vendedores sem unidade (não estão em nenhuma unidade)
    const vendedoresComUnidades = vendedoresUnidades.map(vu => vu.vendedor_id)
    const vendedoresSemUnidade = vendedores.filter(v => !vendedoresComUnidades.includes(v.id))

    return NextResponse.json({
      success: true,
      unidades: unidadesComVendedores,
      vendedores_sem_unidade: vendedoresSemUnidade,
      stats: {
        total_unidades: unidades.length,
        total_vendedores: vendedores.length,
        vendedores_com_unidade: vendedoresUnidades.length,
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

    // Verificar se há vendedores vinculados à unidade
    const vendedoresVinculados = await executeQuery(
      'SELECT COUNT(*) as count FROM vendedores_unidades WHERE unidade_id = ?',
      [id]
    ) as any[]

    const totalVendedores = vendedoresVinculados[0]?.count || 0

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
