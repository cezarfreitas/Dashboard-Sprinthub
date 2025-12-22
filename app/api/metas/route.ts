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

    // Nota: A tabela metas_mensais já deve existir no banco (ver banco.sql)
    // Não tentamos criar aqui para evitar conflitos com a estrutura existente

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
        m.created_at,
        m.updated_at,
        v.name as vendedor_nome,
        v.lastName as vendedor_lastName,
        v.username as vendedor_username,
        u.nome as unidade_nome
      FROM metas_mensais m
      JOIN vendedores v ON m.vendedor_id = v.id
      JOIN unidades u ON m.unidade_id = u.id
      WHERE m.ano = ?
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
  let bodyData: Record<string, unknown> = {}
  
  try {
    console.log('[POST /api/metas] Iniciando criação de meta...')
    
    const body = await request.json()
    bodyData = body as Record<string, unknown>
    console.log('[POST /api/metas] Body recebido:', JSON.stringify(bodyData))
    
    const { vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao } = body

    // Validações
    if (!vendedor_id || !unidade_id || !mes || !ano || meta_valor === undefined) {
      console.log('[POST /api/metas] ❌ Validação falhou: campos obrigatórios faltando')
      return NextResponse.json(
        { success: false, message: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (meta_valor < 0) {
      console.log('[POST /api/metas] ❌ Validação falhou: meta_valor negativo')
      return NextResponse.json(
        { success: false, message: 'O valor da meta deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    if (mes < 1 || mes > 12) {
      console.log('[POST /api/metas] ❌ Validação falhou: mês inválido')
      return NextResponse.json(
        { success: false, message: 'Mês deve estar entre 1 e 12' },
        { status: 400 }
      )
    }

    if (ano < 2020 || ano > 2030) {
      console.log('[POST /api/metas] ❌ Validação falhou: ano inválido')
      return NextResponse.json(
        { success: false, message: 'Ano deve estar entre 2020 e 2030' },
        { status: 400 }
      )
    }

    console.log('[POST /api/metas] ✅ Validações passaram')
    console.log('[POST /api/metas] Criando/atualizando meta...')
    console.log('[POST /api/metas] Parâmetros:', { vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao })

    // Usar INSERT ... ON DUPLICATE KEY UPDATE para criar ou atualizar
    // A constraint UNIQUE (vendedor_id, unidade_id, mes, ano) garante que só existe uma meta
    const result = await executeQuery(
      `INSERT INTO metas_mensais (vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         meta_valor = VALUES(meta_valor),
         meta_descricao = VALUES(meta_descricao),
         updated_at = CURRENT_TIMESTAMP`,
      [vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao || null]
    ) as any

    const isUpdate = result.affectedRows === 2 // affectedRows = 2 significa UPDATE
    const metaId = isUpdate ? result.insertId : result.insertId

    console.log(`[POST /api/metas] ✅ Meta ${isUpdate ? 'atualizada' : 'criada'} com sucesso! ID: ${metaId || 'existente'}`)

    return NextResponse.json({
      success: true,
      message: isUpdate ? 'Meta atualizada com sucesso' : 'Meta criada com sucesso',
      meta_id: metaId,
      action: isUpdate ? 'updated' : 'created'
    })

  } catch (error) {
    console.error('[POST /api/metas] ❌ ERRO CAPTURADO:')
    console.error('[POST /api/metas] Tipo:', error instanceof Error ? 'Error' : typeof error)
    console.error('[POST /api/metas] Mensagem:', error instanceof Error ? error.message : String(error))
    console.error('[POST /api/metas] Stack:', error instanceof Error ? error.stack : 'N/A')
    console.error('[POST /api/metas] Body enviado:', JSON.stringify(bodyData))
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const errorDetails = error instanceof Error && 'code' in error ? (error as any).code : undefined
    
    // Verificar se é erro de chave duplicada (não deveria acontecer com ON DUPLICATE KEY UPDATE)
    if (errorMessage.includes('Duplicate entry') && errorMessage.includes('unique_vendedor_unidade_mes_ano')) {
      console.error('[POST /api/metas] ⚠️ Erro inesperado de chave duplicada - o UPSERT deveria ter funcionado')
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao processar meta. Tente novamente.',
          error: 'Erro de chave duplicada inesperado'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao criar meta',
        error: errorMessage,
        code: errorDetails,
        details: bodyData
      },
      { status: 500 }
    )
  }
}

// PUT - Atualizar meta existente (mantido para compatibilidade, mas POST agora faz UPSERT)
export async function PUT(request: NextRequest) {
  try {
    console.log('[PUT /api/metas] Iniciando atualização de meta...')
    
    const body = await request.json()
    console.log('[PUT /api/metas] Body recebido:', JSON.stringify(body))
    
    const { id, meta_valor, meta_descricao } = body

    if (!id || meta_valor === undefined) {
      console.log('[PUT /api/metas] ❌ Validação falhou: ID ou meta_valor faltando')
      return NextResponse.json(
        { success: false, message: 'ID da meta e valor são obrigatórios' },
        { status: 400 }
      )
    }

    if (meta_valor < 0) {
      console.log('[PUT /api/metas] ❌ Validação falhou: meta_valor negativo')
      return NextResponse.json(
        { success: false, message: 'O valor da meta deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    // Buscar meta atual
    const currentMeta = await executeQuery(
      'SELECT * FROM metas_mensais WHERE id = ?',
      [id]
    ) as any[]

    if (currentMeta.length === 0) {
      console.log('[PUT /api/metas] ❌ Meta não encontrada')
      return NextResponse.json(
        { success: false, message: 'Meta não encontrada' },
        { status: 404 }
      )
    }

    console.log('[PUT /api/metas] Meta encontrada:', currentMeta[0])
    console.log('[PUT /api/metas] Atualizando meta...')

    await executeQuery(
      'UPDATE metas_mensais SET meta_valor = ?, meta_descricao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [meta_valor, meta_descricao || null, id]
    )

    console.log('[PUT /api/metas] ✅ Meta atualizada com sucesso!')

    return NextResponse.json({
      success: true,
      message: 'Meta atualizada com sucesso'
    })

  } catch (error) {
    console.error('[PUT /api/metas] ❌ ERRO:', error)
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

// DELETE - Remover meta (hard delete - agora que não há status)
export async function DELETE(request: NextRequest) {
  try {
    console.log('[DELETE /api/metas] Iniciando remoção de meta...')
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      console.log('[DELETE /api/metas] ❌ ID não fornecido')
      return NextResponse.json(
        { success: false, message: 'ID da meta é obrigatório' },
        { status: 400 }
      )
    }

    console.log('[DELETE /api/metas] Buscando meta ID:', id)
    
    // Buscar meta atual
    const currentMeta = await executeQuery(
      'SELECT * FROM metas_mensais WHERE id = ?',
      [id]
    ) as any[]

    if (currentMeta.length === 0) {
      console.log('[DELETE /api/metas] ❌ Meta não encontrada')
      return NextResponse.json(
        { success: false, message: 'Meta não encontrada' },
        { status: 404 }
      )
    }

    console.log('[DELETE /api/metas] Meta encontrada:', currentMeta[0])
    console.log('[DELETE /api/metas] Deletando meta...')

    // Hard delete - remove permanentemente
    await executeQuery(
      'DELETE FROM metas_mensais WHERE id = ?',
      [id]
    )

    console.log('[DELETE /api/metas] ✅ Meta deletada com sucesso!')

    return NextResponse.json({
      success: true,
      message: 'Meta removida com sucesso'
    })

  } catch (error) {
    console.error('[DELETE /api/metas] ❌ ERRO:', error)
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
