import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// POST - Webhook para avançar fila de uma roleta
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleta_id = params.id

    if (!roleta_id) {
      return NextResponse.json(
        { success: false, error: 'ID da roleta é obrigatório na URL' },
        { status: 400 }
      )
    }

    // Buscar a roleta
    const roletas = await executeQuery(`
      SELECT 
        r.*,
        u.nome as unidade_nome,
        u.responsavel
      FROM roletas r
      LEFT JOIN unidades u ON r.unidade_id = u.id
      WHERE r.id = ? AND r.ativo = TRUE
    `, [roleta_id]) as any[]

    if (roletas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Roleta não encontrada ou inativa' },
        { status: 404 }
      )
    }

    const roleta = roletas[0]

    // Buscar a fila atual
    const fila = await executeQuery(`
      SELECT 
        fr.*,
        v.name,
        v.lastName,
        v.email,
        v.telephone
      FROM fila_roleta fr
      LEFT JOIN vendedores v ON fr.vendedor_id = v.id
      WHERE fr.roleta_id = ?
      ORDER BY fr.ordem ASC
    `, [roleta_id]) as any[]

    if (fila.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Não há vendedores na fila' },
        { status: 400 }
      )
    }

    // Selecionar o primeiro da fila
    const vendedorSelecionado = fila[0]

    // Criar nova fila: mover o primeiro para o final (loop infinito)
    const novaFila = [...fila.slice(1), fila[0]]

    // Atualizar a ordem na fila
    const novaOrdem = novaFila.map((v, index) => v.vendedor_id)
    
    // Limpar fila atual
    await executeQuery(`DELETE FROM fila_roleta WHERE roleta_id = ?`, [roleta_id])

    // Adicionar nova ordem
    for (let i = 0; i < novaOrdem.length; i++) {
      await executeQuery(`
        INSERT INTO fila_roleta (roleta_id, vendedor_id, ordem)
        VALUES (?, ?, ?)
      `, [roleta_id, novaOrdem[i], i + 1])
    }

    // Criar tabela de logs e salvar log da seleção
    try {
      // Criar tabela se não existir
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

      // Salvar log
      await executeQuery(`
        INSERT INTO roleta_logs (
          roleta_id, 
          vendedor_id, 
          vendedor_name, 
          vendedor_email, 
          unidade_nome, 
          responsavel, 
          ordem_anterior
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        roleta.id,
        vendedorSelecionado.vendedor_id,
        `${vendedorSelecionado.name} ${vendedorSelecionado.lastName}`,
        vendedorSelecionado.email,
        roleta.unidade_nome,
        roleta.responsavel,
        vendedorSelecionado.ordem
      ])
    } catch (logError) {
      console.error('Erro ao salvar log:', logError)
      // Não falha o webhook se o log der erro
    }

    // Retornar dados do vendedor selecionado
    return NextResponse.json({
      success: true,
      message: 'Fila avançada com sucesso',
      data: {
        vendedor: {
          id: vendedorSelecionado.vendedor_id,
          name: vendedorSelecionado.name,
          lastName: vendedorSelecionado.lastName,
          email: vendedorSelecionado.email,
          telephone: vendedorSelecionado.telephone,
          ordem_anterior: vendedorSelecionado.ordem
        },
        roleta: {
          id: roleta.id,
          unidade_nome: roleta.unidade_nome,
          responsavel: roleta.responsavel
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Erro no webhook da roleta:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Informações sobre o webhook
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const roletaId = params.id

  if (!roletaId) {
    return NextResponse.json({
      success: true,
      message: 'Webhook da Roleta',
      usage: {
        method: 'POST',
        url: '/api/roleta/webhook/[id]',
        example: '/api/roleta/webhook/1',
        response: {
          success: 'boolean',
          message: 'string',
          data: {
            vendedor: 'object',
            roleta: 'object',
            timestamp: 'string'
          }
        }
      }
    })
  }

  // Verificar se a roleta existe
  const roletas = await executeQuery(`
    SELECT 
      r.*,
      u.nome as unidade_nome,
      u.responsavel
    FROM roletas r
    LEFT JOIN unidades u ON r.unidade_id = u.id
    WHERE r.id = ?
  `, [roletaId]) as any[]

  if (roletas.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Roleta não encontrada' },
      { status: 404 }
    )
  }

  const roleta = roletas[0]

  return NextResponse.json({
    success: true,
    roleta: {
      id: roleta.id,
      unidade_nome: roleta.unidade_nome,
      responsavel: roleta.responsavel,
      ativo: roleta.ativo
    },
    webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/roleta/webhook/${roletaId}`
  })
}
