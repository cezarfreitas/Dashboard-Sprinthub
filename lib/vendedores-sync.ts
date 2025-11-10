import { executeQuery } from '@/lib/database'

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

interface SyncResult {
  inserted: number
  updated: number
  errors: number
  duration: number
}

/**
 * Sincroniza vendedores da SprintHub com o banco de dados local
 */
export async function syncVendedoresFromSprintHub(type: 'manual' | 'scheduled' = 'scheduled'): Promise<SyncResult> {
  const startTime = Date.now()
  let syncHistoryId: number | null = null
  
  console.log('🔄 Iniciando sincronização de vendedores...')

  // Inserir registro de início da sincronização
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const historyResult = await executeQuery(`
    INSERT INTO cron_sync_history (job_name, started_at, status, type)
    VALUES ('vendedores-sync', ?, 'running', ?)
  `, [now, type]) as any
  
  syncHistoryId = historyResult.insertId

  // Obter variáveis de ambiente
  const apiToken = process.env.APITOKEN
  const groupId = process.env.I
  const urlPatch = process.env.URLPATCH

  if (!apiToken || !groupId || !urlPatch) {
    // Atualizar histórico com erro
    if (syncHistoryId) {
      const completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
      await executeQuery(`
        UPDATE cron_sync_history 
        SET completed_at = ?, 
            status = 'error', 
            error_message = ?,
            duration_seconds = ?
        WHERE id = ?
      `, [completedAt, 'Configuração da API não encontrada. Verifique as variáveis de ambiente APITOKEN, I e URLPATCH.', (Date.now() - startTime) / 1000, syncHistoryId])
    }
    throw new Error('Configuração da API não encontrada. Verifique as variáveis de ambiente APITOKEN, I e URLPATCH.')
  }

  try {
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
      console.error('❌ Erro na API SprintHub:', response.status, response.statusText)
      throw new Error(`Erro na API SprintHub: ${response.status} ${response.statusText}`)
    }

    const vendedoresSprintHub: SprintHubUser[] = await response.json()
    console.log('✅ Dados recebidos da SprintHub:', vendedoresSprintHub.length, 'vendedores')

    if (!Array.isArray(vendedoresSprintHub) || vendedoresSprintHub.length === 0) {
      throw new Error('Nenhum vendedor encontrado na SprintHub')
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
      console.error(`❌ Erro ao sincronizar vendedor ${vendedor.id}:`, vendedorError)
      errors++
    }
  }

  console.log(`✅ Sincronização concluída: ${inserted} inseridos, ${updated} atualizados, ${errors} erros`)

  // Atualizar histórico com sucesso
  const duration = (Date.now() - startTime) / 1000
  if (syncHistoryId) {
    const completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await executeQuery(`
      UPDATE cron_sync_history 
      SET completed_at = ?, 
          status = 'success', 
          records_inserted = ?,
          records_updated = ?,
          records_errors = ?,
          duration_seconds = ?
      WHERE id = ?
    `, [completedAt, inserted, updated, errors, duration, syncHistoryId])
  }

    return { inserted, updated, errors, duration }
  } catch (error) {
    // Atualizar histórico com erro
    const duration = (Date.now() - startTime) / 1000
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    if (syncHistoryId) {
      const completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
      await executeQuery(`
        UPDATE cron_sync_history 
        SET completed_at = ?, 
            status = 'error', 
            error_message = ?,
            duration_seconds = ?
        WHERE id = ?
      `, [completedAt, errorMessage, duration, syncHistoryId])
    }
    
    throw error
  }
}
