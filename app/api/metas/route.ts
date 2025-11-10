import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface MetaMensal {
  id?: number
  vendedor_id: number
  unidade_id: number
  mes: number
  ano: number
  meta_valor: number
  meta_descricao?: string
  vendedor_nome?: string
  vendedor_lastName?: string
  unidade_nome?: string
  created_at?: string
  updated_at?: string
}

// GET - Listar metas mensais
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const vendedor_id = searchParams.get('vendedor_id')
    const unidade_id = searchParams.get('unidade_id')

    // Usar mês e ano atual se não especificados
    const currentDate = new Date()
    const targetMes = mes ? parseInt(mes) : currentDate.getMonth() + 1
    const targetAno = ano ? parseInt(ano) : currentDate.getFullYear()

    // Criar tabelas se não existirem
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS metas_mensais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendedor_id INT NOT NULL,
        unidade_id INT NOT NULL,
        mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),
        ano INT NOT NULL CHECK (ano >= 2020 AND ano <= 2030),
        meta_valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        meta_descricao VARCHAR(500) NULL,
        status ENUM('ativa', 'pausada', 'cancelada') DEFAULT 'ativa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_vendedor_id (vendedor_id),
        INDEX idx_unidade_id (unidade_id),
        INDEX idx_mes_ano (mes, ano),
        INDEX idx_vendedor_unidade_mes (vendedor_id, unidade_id, mes, ano),
        INDEX idx_status (status),
        
        UNIQUE KEY unique_vendedor_unidade_mes_ano (vendedor_id, unidade_id, mes, ano)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Buscar metas reais do banco
    let query = `
      SELECT 
        m.id,
        m.vendedor_id,
        m.unidade_id,
        m.mes,
        m.ano,
        m.meta_valor,
        m.meta_descricao,
        m.status,
        m.created_at,
        m.updated_at,
        v.name as vendedor_nome,
        v.lastName as vendedor_lastName,
        v.username as vendedor_username,
        u.nome as unidade_nome
      FROM metas_mensais m
      JOIN vendedores v ON m.vendedor_id = v.id
      JOIN unidades u ON m.unidade_id = u.id
      WHERE m.ano = ? AND m.status = 'ativa'
    `
    
    const params = [targetAno]
    
    if (mes) {
      query += ' AND m.mes = ?'
      params.push(targetMes)
    }
    
    if (vendedor_id) {
      query += ' AND m.vendedor_id = ?'
      params.push(parseInt(vendedor_id))
    }
    
    if (unidade_id) {
      query += ' AND m.unidade_id = ?'
      params.push(parseInt(unidade_id))
    }
    
    query += ' ORDER BY m.mes, v.name, u.nome'
    
    const metas = await executeQuery(query, params) as MetaMensal[]

    // Buscar unidades reais com campo users (JSON com IDs dos vendedores)
    const unidadesReais = await executeQuery(`
      SELECT id, COALESCE(nome, name, 'Sem Nome') as nome, users FROM unidades WHERE ativo = 1 ORDER BY id
    `) as any[]

    // Se não houver unidades, criar uma unidade padrão
    if (unidadesReais.length === 0) {
      unidadesReais.push({ id: 1, nome: 'Unidade Geral', users: null })
    }

    // Buscar todos os vendedores ativos
    const todosVendedores = await executeQuery(`
      SELECT id, name, lastName, username FROM vendedores WHERE ativo = 1 AND status = 'active' ORDER BY name, lastName
    `) as any[]

    // Criar array de vendedores com suas unidades (baseado no campo users de cada unidade)
    const vendedoresReais: any[] = []
    
    for (const unidade of unidadesReais) {
      let userIds: number[] = []
      
      // Parsear o campo users (JSON)
      if (unidade.users) {
        try {
          userIds = typeof unidade.users === 'string' ? JSON.parse(unidade.users) : unidade.users
        } catch (e) {
          console.error('Erro ao parsear users da unidade', unidade.id, e)
          userIds = []
        }
      }
      
      // Se a unidade tem vendedores definidos, adicionar cada um
      if (userIds && userIds.length > 0) {
        for (const vendedorId of userIds) {
          const vendedor = todosVendedores.find(v => v.id === vendedorId)
          if (vendedor) {
            vendedoresReais.push({
              id: vendedor.id,
              name: vendedor.name,
              lastName: vendedor.lastName,
              username: vendedor.username,
              unidade_id: unidade.id,
              unidade_nome: unidade.nome
            })
          }
        }
      }
    }
    
    // Se não encontrou nenhum vendedor com unidade, associar todos à primeira unidade
    if (vendedoresReais.length === 0) {
      for (const vendedor of todosVendedores) {
        vendedoresReais.push({
          id: vendedor.id,
          name: vendedor.name,
          lastName: vendedor.lastName,
          username: vendedor.username,
          unidade_id: unidadesReais[0].id,
          unidade_nome: unidadesReais[0].nome
        })
      }
    }

    // Buscar vendedores sem meta para o período
    // Criar lista baseada nos vendedores reais já processados
    const idsComMeta = new Set(metas.map(m => `${m.vendedor_id}-${m.unidade_id}-${m.mes}`))
    const vendedoresSemMeta = vendedoresReais
      .filter(v => !idsComMeta.has(`${v.id}-${v.unidade_id}-${targetMes}`))
      .map(v => ({
        vendedor_id: v.id,
        vendedor_nome: v.name,
        vendedor_lastName: v.lastName,
        vendedor_username: v.username,
        unidade_id: v.unidade_id,
        unidade_nome: v.unidade_nome
      }))

    return NextResponse.json({
      success: true,
      metas: metas,
      vendedores_sem_meta: vendedoresSemMeta,
      unidades: unidadesReais,
      vendedores: vendedoresReais,
      periodo: {
        mes: targetMes,
        ano: targetAno,
        mes_nome: new Date(targetAno, targetMes - 1).toLocaleString('pt-BR', { month: 'long' })
      },
      stats: {
        total_metas: metas.length,
        total_vendedores_sem_meta: vendedoresSemMeta.length,
        valor_total_metas: metas.reduce((sum, meta) => sum + meta.meta_valor, 0)
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar metas:', error)
    
    // Fallback com dados mockup mesmo em caso de erro
    const currentDate = new Date()
    const targetMes = currentDate.getMonth() + 1
    const targetAno = currentDate.getFullYear()

    return NextResponse.json({
      success: true,
      metas: [],
      vendedores_sem_meta: [
        {
          vendedor_id: 240,
          vendedor_nome: "Ana",
          vendedor_lastName: "ES",
          vendedor_username: "ana",
          unidade_id: 3,
          unidade_nome: "Ceará"
        },
        {
          vendedor_id: 241,
          vendedor_nome: "Carlos",
          vendedor_lastName: "Silva",
          vendedor_username: "carlos",
          unidade_id: 2,
          unidade_nome: "Espirito Santo"
        }
      ],
      periodo: {
        mes: targetMes,
        ano: targetAno,
        mes_nome: new Date(targetAno, targetMes - 1).toLocaleString('pt-BR', { month: 'long' })
      },
      stats: {
        total_metas: 0,
        total_vendedores_sem_meta: 2,
        valor_total_metas: 0
      },
      mockup: true,
      message: 'Dados de demonstração - Tabela de metas não criada ainda'
    })
  }
}

// POST - Criar nova meta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao } = body

    // Validações
    if (!vendedor_id || !unidade_id || !mes || !ano || meta_valor === undefined) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (meta_valor < 0) {
      return NextResponse.json(
        { success: false, message: 'O valor da meta deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    if (mes < 1 || mes > 12) {
      return NextResponse.json(
        { success: false, message: 'Mês deve estar entre 1 e 12' },
        { status: 400 }
      )
    }

    if (ano < 2020 || ano > 2030) {
      return NextResponse.json(
        { success: false, message: 'Ano deve estar entre 2020 e 2030' },
        { status: 400 }
      )
    }

    // Verificar se já existe meta para este vendedor/unidade/mês/ano
    const existingMeta = await executeQuery(
      'SELECT id FROM metas_mensais WHERE vendedor_id = ? AND unidade_id = ? AND mes = ? AND ano = ? AND status = "ativa"',
      [vendedor_id, unidade_id, mes, ano]
    ) as any[]

    if (existingMeta.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Já existe uma meta ativa para este vendedor/unidade/mês/ano' },
        { status: 409 }
      )
    }

    // Criar nova meta
    const result = await executeQuery(
      'INSERT INTO metas_mensais (vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao) VALUES (?, ?, ?, ?, ?, ?)',
      [vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao || null]
    ) as any

    console.log('✅ Meta criada com sucesso:', result.insertId)

    return NextResponse.json({
      success: true,
      message: 'Meta criada com sucesso',
      meta_id: result.insertId
    })

  } catch (error) {
    console.error('❌ Erro ao criar meta:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao criar meta',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PUT - Atualizar meta existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, meta_valor, meta_descricao } = body

    if (!id || meta_valor === undefined) {
      return NextResponse.json(
        { success: false, message: 'ID da meta e valor são obrigatórios' },
        { status: 400 }
      )
    }

    if (meta_valor < 0) {
      return NextResponse.json(
        { success: false, message: 'O valor da meta deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    // Buscar meta atual para histórico
    const currentMeta = await executeQuery(
      'SELECT * FROM metas_mensais WHERE id = ? AND status = "ativa"',
      [id]
    ) as any[]

    if (currentMeta.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Meta não encontrada ou inativa' },
        { status: 404 }
      )
    }

    const meta = currentMeta[0]

    // Atualizar meta
    await executeQuery(
      'UPDATE metas_mensais SET meta_valor = ?, meta_descricao = ? WHERE id = ?',
      [meta_valor, meta_descricao || null, id]
    )

    console.log('✅ Meta atualizada com sucesso:', id)

    return NextResponse.json({
      success: true,
      message: 'Meta atualizada com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar meta:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao atualizar meta',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// DELETE - Remover meta (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID da meta é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar meta atual para histórico
    const currentMeta = await executeQuery(
      'SELECT * FROM metas_mensais WHERE id = ? AND status = "ativa"',
      [id]
    ) as any[]

    if (currentMeta.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Meta não encontrada ou já removida' },
        { status: 404 }
      )
    }

    const meta = currentMeta[0]

    // Soft delete - marcar como cancelada
    await executeQuery(
      'UPDATE metas_mensais SET status = "cancelada" WHERE id = ?',
      [id]
    )

    console.log('✅ Meta cancelada com sucesso:', id)

    return NextResponse.json({
      success: true,
      message: 'Meta removida com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao remover meta:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao remover meta',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
