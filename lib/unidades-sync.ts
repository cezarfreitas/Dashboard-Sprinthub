import { executeQuery } from './database'

interface SprintHubDepartment {
  id: number
  name: string
  department?: number | null  // Nome do campo na API
  department_id?: number | null  // Nome alternativo
  show_sac360?: number
  show_crm?: number
  createDate?: string  // Nome do campo na API
  updateDate?: string  // Nome do campo na API
  create_date?: string
  update_date?: string
  subs?: any[]
  users?: any[]
  permissionsGroups?: any[]
  permissions_groups?: number
  voip?: any[]
  branches?: any[]
  accs?: any[]
  google_business_messages?: any[]
}

interface SyncResult {
  inserted: number
  updated: number
  errors: number
  duration: number
}

/**
 * Sincroniza unidades/departamentos da SprintHub com o banco de dados local
 */
export async function syncUnidadesFromSprintHub(type: 'manual' | 'scheduled' = 'scheduled'): Promise<SyncResult> {
  const startTime = Date.now()
  let syncHistoryId: number | null = null
  
  console.log('🔄 Iniciando sincronização de unidades...')

  // Inserir registro de início da sincronização
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const historyResult = await executeQuery(`
    INSERT INTO cron_sync_history (job_name, started_at, status, type)
    VALUES ('unidades-sync', ?, 'running', ?)
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
    // Buscar unidades da SprintHub
    const sprintHubUrl = `${urlPatch}/departament?apitoken=${apiToken}&i=${groupId}`
    
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      }
    })

    if (!response.ok) {
      console.error('❌ Erro na API SprintHub:', response.status, response.statusText)
      throw new Error(`Erro na API SprintHub: ${response.status} ${response.statusText}`)
    }

    let allDepartments: SprintHubDepartment[] = await response.json()
    console.log('✅ Dados recebidos da SprintHub:', allDepartments.length, 'departamentos (total)')

    if (!Array.isArray(allDepartments)) {
      throw new Error('Resposta da API não é um array válido')
    }

    // Buscar o departamento ID 85 e pegar seus subs
    const PARENT_DEPARTMENT_ID = parseInt(process.env.DEPARTMENT_ID_FILTER || '85')
    const parentDepartment = allDepartments.find(d => d.id === PARENT_DEPARTMENT_ID)
    
    if (!parentDepartment) {
      throw new Error(`Departamento pai ${PARENT_DEPARTMENT_ID} não encontrado`)
    }

    console.log(`📊 Departamento pai encontrado: ${parentDepartment.name} (ID: ${parentDepartment.id})`)
    console.log(`📊 Total de subs no departamento pai: ${parentDepartment.subs?.length || 0}`)

    // Os sub-departamentos já vêm completos no array 'subs'
    let unidadesSprintHub: SprintHubDepartment[] = []
    
    if (Array.isArray(parentDepartment.subs) && parentDepartment.subs.length > 0) {
      // Os subs já são objetos completos do tipo SprintHubDepartment
      unidadesSprintHub = parentDepartment.subs as SprintHubDepartment[]
      
      console.log(`✅ Encontrados ${unidadesSprintHub.length} sub-departamentos para sincronizar`)
      
      // Log de algumas unidades para conferência
      if (unidadesSprintHub.length > 0) {
        console.log(`📋 Primeiras 3 unidades:`)
        unidadesSprintHub.slice(0, 3).forEach(u => {
          console.log(`   - ID ${u.id}: ${u.name} (department: ${u.department})`)
        })
      }
    } else {
      console.log(`⚠️ Departamento ${PARENT_DEPARTMENT_ID} não tem subs`)
    }

    if (unidadesSprintHub.length === 0) {
      console.log(`⚠️ Nenhum sub-departamento encontrado para sincronizar`)
      // Não lançar erro, apenas retornar sucesso com 0 registros
    }

  let inserted = 0
  let updated = 0
  let errors = 0

  // Sincronizar cada unidade
  for (const unidade of unidadesSprintHub) {
    try {
      // Converter datas para formato MySQL
      const createDateStr = unidade.createDate || unidade.create_date
      const updateDateStr = unidade.updateDate || unidade.update_date
      const createDate = createDateStr ? new Date(createDateStr).toISOString().slice(0, 19).replace('T', ' ') : null
      const updateDate = updateDateStr ? new Date(updateDateStr).toISOString().slice(0, 19).replace('T', ' ') : null
      
      // Pegar department_id do campo correto
      const departmentId = unidade.department || unidade.department_id || null

      // Identificar sub-departamento de gestão
      let dptoGestao: number | null = null
      let userGestaoIds: number[] = []
      
      if (Array.isArray(unidade.subs) && unidade.subs.length > 0) {
        const subGestao = unidade.subs.find((sub: any) => 
          sub.name && sub.name.toUpperCase().includes('GESTÃO')
        )
        
        if (subGestao) {
          dptoGestao = subGestao.id || null
          // Pegar todos os usuários do sub de gestão
          if (Array.isArray(subGestao.users) && subGestao.users.length > 0) {
            userGestaoIds = subGestao.users.filter((userId: any) => userId != null)
          }
          console.log(`   ✓ Gestão encontrada: ${subGestao.name} (ID: ${dptoGestao}, Users: [${userGestaoIds.join(', ')}])`)
        }
      }

      // Preparar campos JSON (converter arrays/objetos para JSON strings)
      const subsJson = unidade.subs ? JSON.stringify(unidade.subs) : null
      const usersJson = unidade.users ? JSON.stringify(unidade.users) : null
      const permissionsGroupsJson = unidade.permissionsGroups || unidade.permissions_groups 
        ? JSON.stringify(unidade.permissionsGroups || unidade.permissions_groups) 
        : null
      const voipJson = unidade.voip ? JSON.stringify(unidade.voip) : null
      const branchesJson = unidade.branches ? JSON.stringify(unidade.branches) : null
      const accsJson = unidade.accs ? JSON.stringify(unidade.accs) : null
      const googleBusinessMessagesJson = unidade.google_business_messages 
        ? JSON.stringify(unidade.google_business_messages) 
        : null
      
      // user_gestao deve ser JSON (array com todos os IDs dos usuários de gestão)
      const userGestaoJson = userGestaoIds.length > 0 ? JSON.stringify(userGestaoIds) : null

      // Apenas salvar os dados JSON - não criar tabela de relacionamento

      // Usar INSERT ... ON DUPLICATE KEY UPDATE para inserir ou atualizar
      const result = await executeQuery(`
        INSERT INTO unidades (
          id, name, department_id, show_sac360, show_crm, create_date, update_date,
          subs, users, permissions_groups, voip, branches, accs, google_business_messages,
          dpto_gestao, user_gestao,
          synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          department_id = VALUES(department_id),
          show_sac360 = VALUES(show_sac360),
          show_crm = VALUES(show_crm),
          create_date = VALUES(create_date),
          update_date = VALUES(update_date),
          subs = VALUES(subs),
          users = VALUES(users),
          permissions_groups = VALUES(permissions_groups),
          voip = VALUES(voip),
          branches = VALUES(branches),
          accs = VALUES(accs),
          google_business_messages = VALUES(google_business_messages),
          dpto_gestao = VALUES(dpto_gestao),
          user_gestao = VALUES(user_gestao),
          synced_at = NOW(),
          updated_at = NOW()
      `, [
        unidade.id,
        unidade.name || '',
        departmentId,
        unidade.show_sac360 || 0,
        unidade.show_crm || 0,
        createDate,
        updateDate,
        subsJson,
        usersJson,
        permissionsGroupsJson,
        voipJson,
        branchesJson,
        accsJson,
        googleBusinessMessagesJson,
        dptoGestao,
        userGestaoJson
      ]) as any

      if (result.affectedRows === 1) {
        inserted++
      } else if (result.affectedRows === 2) {
        updated++
      }

    } catch (unidadeError) {
      console.error(`❌ Erro ao sincronizar unidade ${unidade.id}:`, unidadeError)
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

