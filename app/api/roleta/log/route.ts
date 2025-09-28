import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Criar tabela de logs se não existir
const createLogTable = async () => {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS roleta_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        roleta_id INT NOT NULL,
        vendedor_id INT NOT NULL,
        vendedor_name VARCHAR(255) NOT NULL,
        vendedor_email VARCHAR(255),
        unidade_nome VARCHAR(255) NOT NULL,
        responsavel VARCHAR(255),
        ordem_anterior INT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_roleta_id (roleta_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_vendedor_id (vendedor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  } catch (error) {
    console.error('Erro ao criar tabela de logs:', error)
    // Continua mesmo se der erro na criação da tabela
  }
}

// POST - Salvar log de seleção
export async function POST(request: NextRequest) {
  try {
    await createLogTable()

    const body = await request.json()
    const { 
      roleta_id, 
      vendedor_id, 
      vendedor_name, 
      vendedor_email, 
      unidade_nome, 
      responsavel, 
      ordem_anterior 
    } = body

    if (!roleta_id || !vendedor_id || !vendedor_name || !unidade_nome) {
      return NextResponse.json(
        { success: false, error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    const result = await executeQuery(`
      INSERT INTO roleta_logs (
        roleta_id, 
        vendedor_id, 
        vendedor_name, 
        vendedor_email, 
        unidade_nome, 
        responsavel, 
        ordem_anterior
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [roleta_id, vendedor_id, vendedor_name, vendedor_email, unidade_nome, responsavel, ordem_anterior]) as any

    return NextResponse.json({
      success: true,
      message: 'Log salvo com sucesso',
      log_id: result.insertId
    })

  } catch (error) {
    console.error('Erro ao salvar log:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Buscar logs de uma roleta
export async function GET(request: NextRequest) {
  try {
    await createLogTable()

    const { searchParams } = new URL(request.url)
    const roletaId = searchParams.get('roleta_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!roletaId) {
      return NextResponse.json(
        { success: false, error: 'ID da roleta é obrigatório' },
        { status: 400 }
      )
    }

    const logs = await executeQuery(`
      SELECT 
        l.*,
        DATE_FORMAT(l.timestamp, '%d/%m/%Y %H:%i:%s') as timestamp_formatado
      FROM roleta_logs l
      WHERE l.roleta_id = ?
      ORDER BY l.timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [roletaId]) as any[]

    const totalLogs = await executeQuery(`
      SELECT COUNT(*) as total FROM roleta_logs WHERE roleta_id = ?
    `, [roletaId]) as any[]

    return NextResponse.json({
      success: true,
      logs: logs,
      pagination: {
        total: totalLogs[0].total,
        limit,
        offset,
        hasMore: offset + limit < totalLogs[0].total
      }
    })

  } catch (error) {
    console.error('Erro ao buscar logs:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Limpar logs de uma roleta
export async function DELETE(request: NextRequest) {
  try {
    await createLogTable()

    const { searchParams } = new URL(request.url)
    const roletaId = searchParams.get('roleta_id')

    if (!roletaId) {
      return NextResponse.json(
        { success: false, error: 'ID da roleta é obrigatório' },
        { status: 400 }
      )
    }

    await executeQuery(`
      DELETE FROM roleta_logs WHERE roleta_id = ?
    `, [roletaId])

    return NextResponse.json({
      success: true,
      message: 'Logs removidos com sucesso'
    })

  } catch (error) {
    console.error('Erro ao limpar logs:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
