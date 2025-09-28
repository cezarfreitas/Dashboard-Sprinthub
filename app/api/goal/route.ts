import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { broadcastEvent } from '@/lib/sse'

export const dynamic = 'force-dynamic'

interface MetaConfig {
  id?: number
  vendedor_id: number
  mes: number
  ano: number
  meta_valor: number
  meta_quantidade: number
}

// GET - Buscar metas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const unidadeId = searchParams.get('unidade_id')

    // Criar tabela se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS metas_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendedor_id INT NOT NULL,
        mes INT NOT NULL,
        ano INT NOT NULL,
        meta_valor DECIMAL(15,2) DEFAULT 0,
        meta_quantidade INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_vendedor_mes_ano (vendedor_id, mes, ano),
        INDEX idx_vendedor (vendedor_id),
        INDEX idx_mes_ano (mes, ano)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    let query = `
      SELECT mc.*, v.name, v.lastName, v.email, v.unidade_id, u.nome as unidade_nome
      FROM metas_config mc
      LEFT JOIN vendedores v ON mc.vendedor_id = v.id
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (mes) {
      query += ` AND mc.mes = ?`
      params.push(parseInt(mes))
    }

    if (ano) {
      query += ` AND mc.ano = ?`
      params.push(parseInt(ano))
    }

    if (unidadeId) {
      query += ` AND v.unidade_id = ?`
      params.push(parseInt(unidadeId))
    }

    query += ` ORDER BY u.nome, v.name`

    const metas = await executeQuery(query, params) as any[]

    return NextResponse.json({
      success: true,
      metas: metas
    })

  } catch (error) {
    console.error('Erro ao buscar metas:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar metas' },
      { status: 500 }
    )
  }
}

// POST - Salvar metas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metas, mes, ano } = body

    if (!metas || !Array.isArray(metas)) {
      return NextResponse.json(
        { success: false, error: 'Dados de metas inválidos' },
        { status: 400 }
      )
    }

    // Criar tabela se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS metas_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendedor_id INT NOT NULL,
        mes INT NOT NULL,
        ano INT NOT NULL,
        meta_valor DECIMAL(15,2) DEFAULT 0,
        meta_quantidade INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_vendedor_mes_ano (vendedor_id, mes, ano),
        INDEX idx_vendedor (vendedor_id),
        INDEX idx_mes_ano (mes, ano)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Salvar cada meta
    for (const meta of metas) {
      if (meta.vendedor_id && (meta.meta_valor > 0 || meta.meta_quantidade > 0)) {
        await executeQuery(`
          INSERT INTO metas_config (vendedor_id, mes, ano, meta_valor, meta_quantidade)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            meta_valor = VALUES(meta_valor),
            meta_quantidade = VALUES(meta_quantidade),
            updated_at = CURRENT_TIMESTAMP
        `, [
          meta.vendedor_id,
          mes,
          ano,
          meta.meta_valor || 0,
          meta.meta_quantidade || 0
        ])
      }
    }

    // Enviar evento SSE
    broadcastEvent({
      type: 'metas_updated',
      message: 'Metas atualizadas com sucesso!',
      data: { mes, ano, count: metas.length },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Metas salvas com sucesso!',
      count: metas.length
    })

  } catch (error) {
    console.error('Erro ao salvar metas:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar metas' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar meta específica
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, meta_valor, meta_quantidade } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da meta é obrigatório' },
        { status: 400 }
      )
    }

    await executeQuery(`
      UPDATE metas_config 
      SET meta_valor = ?, meta_quantidade = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [meta_valor || 0, meta_quantidade || 0, id])

    return NextResponse.json({
      success: true,
      message: 'Meta atualizada com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao atualizar meta:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar meta' },
      { status: 500 }
    )
  }
}

// DELETE - Remover meta
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da meta é obrigatório' },
        { status: 400 }
      )
    }

    await executeQuery(`DELETE FROM metas_config WHERE id = ?`, [id])

    return NextResponse.json({
      success: true,
      message: 'Meta removida com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao remover meta:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover meta' },
      { status: 500 }
    )
  }
}
