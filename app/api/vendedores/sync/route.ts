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
    // Obter variáveis de ambiente
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Configuração da API não encontrada. Verifique as variáveis de ambiente (APITOKEN, I, URLPATCH).' 
        },
        { status: 500 }
      )
    }

    // Buscar vendedores da SprintHub
    const sprintHubUrl = `${urlPatch}/user?apitoken=${apiToken}&i=${groupId}`
    
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Erro na API SprintHub: ${response.status} ${response.statusText}` 
        },
        { status: response.status }
      )
    }

    const vendedoresSprintHub: SprintHubUser[] = await response.json()

    if (!Array.isArray(vendedoresSprintHub) || vendedoresSprintHub.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum vendedor encontrado na SprintHub'
      }, { status: 404 })
    }

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
        success: false,
        message: 'Tabela de vendedores não existe. Verifique a estrutura do banco de dados.',
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
