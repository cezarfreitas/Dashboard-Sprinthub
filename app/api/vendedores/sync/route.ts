import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface SprintHubUser {
  id: number
  name: string
  lastName: string
  email: string
  cpf: string | null
  username: string
  birthDate: string
  telephone: string
  photo?: string | null
  admin?: number
  branch?: string | null
  position_company?: string
  skills?: string
  state?: string
  city?: string
  whatsapp_automation?: string
  last_login?: string | null
  last_action?: string | null
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronização de vendedores...')

    // Obter variáveis de ambiente
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I

    if (!apiToken || !groupId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Configuração da API não encontrada. Verifique as variáveis de ambiente.' 
        },
        { status: 500 }
      )
    }

    // Buscar vendedores da SprintHub
    const sprintHubUrl = `https://sprinthub-api-master.sprinthub.app/user?apitoken=${apiToken}&i=${groupId}`
    
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      }
    })

    if (!response.ok) {
      console.error('❌ Erro na API SprintHub:', response.status, response.statusText)
      return NextResponse.json(
        { 
          success: false, 
          message: `Erro na API SprintHub: ${response.status} ${response.statusText}` 
        },
        { status: response.status }
      )
    }

    const vendedoresSprintHub: SprintHubUser[] = await response.json()
    console.log('✅ Dados recebidos da SprintHub:', vendedoresSprintHub.length, 'vendedores')

    if (!Array.isArray(vendedoresSprintHub) || vendedoresSprintHub.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum vendedor encontrado na SprintHub'
      }, { status: 404 })
    }

    // Criar tabela se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS vendedores (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) NULL,
        username VARCHAR(100) NOT NULL,
        birthDate DATE NOT NULL,
        telephone VARCHAR(20) NULL,
        photo TEXT NULL,
        admin TINYINT DEFAULT 0,
        branch VARCHAR(100) NULL,
        position_company VARCHAR(255) NULL,
        skills TEXT NULL,
        state VARCHAR(100) NULL,
        city VARCHAR(100) NULL,
        whatsapp_automation VARCHAR(20) NULL,
        last_login DATETIME NULL,
        last_action DATETIME NULL,
        status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_status (status),
        INDEX idx_synced_at (synced_at),
        
        UNIQUE KEY unique_email (email),
        UNIQUE KEY unique_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    let inserted = 0
    let updated = 0
    let errors = 0

    // Sincronizar cada vendedor
    for (const vendedor of vendedoresSprintHub) {
      try {
        // Converter data de nascimento para formato MySQL
        const birthDate = vendedor.birthDate ? new Date(vendedor.birthDate).toISOString().split('T')[0] : null
        const lastLogin = vendedor.last_login ? new Date(vendedor.last_login).toISOString().slice(0, 19).replace('T', ' ') : null
        const lastAction = vendedor.last_action ? new Date(vendedor.last_action).toISOString().slice(0, 19).replace('T', ' ') : null

        // Usar INSERT ... ON DUPLICATE KEY UPDATE para inserir ou atualizar
        const result = await executeQuery(`
          INSERT INTO vendedores (
            id, name, lastName, email, cpf, username, birthDate, telephone, photo,
            admin, branch, position_company, skills, state, city, whatsapp_automation,
            last_login, last_action, status, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            lastName = VALUES(lastName),
            email = VALUES(email),
            cpf = VALUES(cpf),
            username = VALUES(username),
            birthDate = VALUES(birthDate),
            telephone = VALUES(telephone),
            photo = VALUES(photo),
            admin = VALUES(admin),
            branch = VALUES(branch),
            position_company = VALUES(position_company),
            skills = VALUES(skills),
            state = VALUES(state),
            city = VALUES(city),
            whatsapp_automation = VALUES(whatsapp_automation),
            last_login = VALUES(last_login),
            last_action = VALUES(last_action),
            synced_at = NOW(),
            updated_at = NOW()
        `, [
          vendedor.id,
          vendedor.name || '',
          vendedor.lastName || '',
          vendedor.email || '',
          vendedor.cpf || null,
          vendedor.username || '',
          birthDate,
          vendedor.telephone || null,
          vendedor.photo || null,
          vendedor.admin || 0,
          vendedor.branch || null,
          vendedor.position_company || null,
          vendedor.skills || null,
          vendedor.state || null,
          vendedor.city || null,
          vendedor.whatsapp_automation || null,
          lastLogin,
          lastAction
        ]) as any

        if (result.affectedRows === 1) {
          inserted++
        } else if (result.affectedRows === 2) {
          updated++
        }

      } catch (vendedorError) {
        console.error(`❌ Erro ao sincronizar vendedor ${vendedor.id}:`, vendedorError)
        errors++
      }
    }

    // Buscar estatísticas finais
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM vendedores') as any[]
    const total = totalResult[0]?.total || 0

    const recentSyncResult = await executeQuery(`
      SELECT COUNT(*) as recent 
      FROM vendedores 
      WHERE synced_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    `) as any[]
    const recentSync = recentSyncResult[0]?.recent || 0

    console.log(`✅ Sincronização concluída: ${inserted} inseridos, ${updated} atualizados, ${errors} erros`)

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída com sucesso',
      stats: {
        total_sprinthub: vendedoresSprintHub.length,
        inserted,
        updated,
        errors,
        total_database: total,
        recent_sync: recentSync
      }
    })

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor durante a sincronização',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// GET para verificar status da sincronização
export async function GET(request: NextRequest) {
  try {
    // Verificar se a tabela existe
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'vendedores'
    `) as any[]

    if (tableExists[0]?.count === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tabela de vendedores não existe. Execute a sincronização para criar.',
        stats: {
          table_exists: false,
          total: 0,
          last_sync: null
        }
      })
    }

    // Buscar estatísticas
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM vendedores') as any[]
    const total = totalResult[0]?.total || 0

    const lastSyncResult = await executeQuery(`
      SELECT MAX(synced_at) as last_sync 
      FROM vendedores
    `) as any[]
    const lastSync = lastSyncResult[0]?.last_sync

    const recentResult = await executeQuery(`
      SELECT COUNT(*) as recent 
      FROM vendedores 
      WHERE synced_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `) as any[]
    const recent = recentResult[0]?.recent || 0

    return NextResponse.json({
      success: true,
      message: 'Status da sincronização obtido com sucesso',
      stats: {
        table_exists: true,
        total,
        last_sync: lastSync,
        recent_sync_1h: recent
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao verificar status da sincronização',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
