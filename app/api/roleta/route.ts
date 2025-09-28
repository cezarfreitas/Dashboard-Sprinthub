import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface RoletaUnidade {
  id?: number
  unidade_id: number
  ativo: boolean
  created_at?: string
  updated_at?: string
}

interface FilaUsuario {
  id?: number
  roleta_id: number
  vendedor_id: number
  ordem: number
  created_at?: string
}

// GET - Buscar roletas e suas filas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadeId = searchParams.get('unidade_id')

    // Criar tabela roletas se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS roletas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unidade_id INT NOT NULL,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_unidade (unidade_id),
        INDEX idx_ativo (ativo),
        FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela fila_roleta se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS fila_roleta (
        id INT AUTO_INCREMENT PRIMARY KEY,
        roleta_id INT NOT NULL,
        vendedor_id INT NOT NULL,
        ordem INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_roleta_vendedor (roleta_id, vendedor_id),
        INDEX idx_roleta_ordem (roleta_id, ordem),
        FOREIGN KEY (roleta_id) REFERENCES roletas(id) ON DELETE CASCADE,
        FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    let query = `
      SELECT 
        r.*,
        u.nome as unidade_nome,
        u.responsavel,
        COUNT(fr.id) as total_vendedores
      FROM roletas r
      LEFT JOIN unidades u ON r.unidade_id = u.id
      LEFT JOIN fila_roleta fr ON r.id = fr.roleta_id
      WHERE 1=1
    `
    const params: any[] = []

    if (unidadeId) {
      query += ` AND r.unidade_id = ?`
      params.push(parseInt(unidadeId))
    }

    query += ` GROUP BY r.id ORDER BY u.nome`

    const roletas = await executeQuery(query, params) as any[]

    // Para cada roleta, buscar a fila de vendedores
    const roletasComFila = await Promise.all(
      roletas.map(async (roleta) => {
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
        `, [roleta.id]) as any[]

        return {
          ...roleta,
          fila: fila
        }
      })
    )

    return NextResponse.json({
      success: true,
      roletas: roletasComFila
    })

  } catch (error) {
    console.error('Erro ao buscar roletas:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar roletas' },
      { status: 500 }
    )
  }
}

// POST - Adicionar unidade à roleta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { unidade_id, vendedores_ids } = body

    if (!unidade_id) {
      return NextResponse.json(
        { success: false, error: 'ID da unidade é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a unidade já está na roleta
    const existing = await executeQuery(`
      SELECT id FROM roletas WHERE unidade_id = ?
    `, [unidade_id]) as any[]

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Esta unidade já está na roleta' },
        { status: 400 }
      )
    }

    // Adicionar unidade à roleta
    const result = await executeQuery(`
      INSERT INTO roletas (unidade_id, ativo)
      VALUES (?, TRUE)
    `, [unidade_id]) as any

    const roletaId = result.insertId

    // Se vendedores foram especificados, adicionar à fila
    if (vendedores_ids && Array.isArray(vendedores_ids) && vendedores_ids.length > 0) {
      for (let i = 0; i < vendedores_ids.length; i++) {
        await executeQuery(`
          INSERT INTO fila_roleta (roleta_id, vendedor_id, ordem)
          VALUES (?, ?, ?)
        `, [roletaId, vendedores_ids[i], i + 1])
      }
    } else {
      // Se não especificados, adicionar todos os vendedores da unidade
      const vendedores = await executeQuery(`
        SELECT id FROM vendedores WHERE unidade_id = ? ORDER BY name
      `, [unidade_id]) as any[]

      for (let i = 0; i < vendedores.length; i++) {
        await executeQuery(`
          INSERT INTO fila_roleta (roleta_id, vendedor_id, ordem)
          VALUES (?, ?, ?)
        `, [roletaId, vendedores[i].id, i + 1])
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Unidade adicionada à roleta com sucesso!',
      roleta_id: roletaId
    })

  } catch (error) {
    console.error('Erro ao adicionar unidade à roleta:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao adicionar unidade à roleta' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar fila de vendedores
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { roleta_id, vendedores_ordem, registrar_log } = body

    if (!roleta_id || !vendedores_ordem) {
      return NextResponse.json(
        { success: false, error: 'ID da roleta e ordem dos vendedores são obrigatórios' },
        { status: 400 }
      )
    }

    // Se for para registrar log, buscar informações da roleta e vendedor selecionado
    let vendedorSelecionado = null
    let roletaInfo = null
    
    if (registrar_log) {
      // Buscar informações da roleta
      const roletas = await executeQuery(`
        SELECT 
          r.*,
          u.nome as unidade_nome,
          u.responsavel
        FROM roletas r
        LEFT JOIN unidades u ON r.unidade_id = u.id
        WHERE r.id = ?
      `, [roleta_id]) as any[]

      if (roletas.length > 0) {
        roletaInfo = roletas[0]
        
        // Buscar o vendedor que estava na primeira posição (foi selecionado)
        const filaAnterior = await executeQuery(`
          SELECT 
            fr.*,
            v.name,
            v.lastName,
            v.email
          FROM fila_roleta fr
          LEFT JOIN vendedores v ON fr.vendedor_id = v.id
          WHERE fr.roleta_id = ? AND fr.ordem = 1
        `, [roleta_id]) as any[]

        if (filaAnterior.length > 0) {
          vendedorSelecionado = filaAnterior[0]
        }
      }
    }

    // Limpar fila atual
    await executeQuery(`DELETE FROM fila_roleta WHERE roleta_id = ?`, [roleta_id])

    // Adicionar nova ordem
    for (let i = 0; i < vendedores_ordem.length; i++) {
      await executeQuery(`
        INSERT INTO fila_roleta (roleta_id, vendedor_id, ordem)
        VALUES (?, ?, ?)
      `, [roleta_id, vendedores_ordem[i], i + 1])
    }

    // Registrar log se solicitado e temos as informações necessárias
    if (registrar_log && vendedorSelecionado && roletaInfo) {
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
          roletaInfo.id,
          vendedorSelecionado.vendedor_id,
          `${vendedorSelecionado.name} ${vendedorSelecionado.lastName}`,
          vendedorSelecionado.email,
          roletaInfo.unidade_nome,
          roletaInfo.responsavel,
          vendedorSelecionado.ordem
        ])
      } catch (logError) {
        console.error('Erro ao salvar log:', logError)
        // Não falha a operação se o log der erro
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Fila atualizada com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao atualizar fila:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar fila' },
      { status: 500 }
    )
  }
}

// DELETE - Remover unidade da roleta
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roletaId = searchParams.get('id')

    if (!roletaId) {
      return NextResponse.json(
        { success: false, error: 'ID da roleta é obrigatório' },
        { status: 400 }
      )
    }

    // Remover roleta (cascade remove a fila automaticamente)
    await executeQuery(`DELETE FROM roletas WHERE id = ?`, [roletaId])

    return NextResponse.json({
      success: true,
      message: 'Unidade removida da roleta com sucesso!'
    })

  } catch (error) {
    console.error('Erro ao remover roleta:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover roleta' },
      { status: 500 }
    )
  }
}
