import { executeQuery } from './database'

interface SprintHubFunil {
  id: number
  funil_nome: string
}

export async function syncFunis(): Promise<{
  success: boolean
  message: string
  stats?: {
    total: number
    novos: number
    atualizados: number
    erros: number
  }
}> {
  const startTime = Date.now()
  
  try {
    console.log('🔄 Iniciando sincronização de funis...')

    // Buscar variáveis de ambiente
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      throw new Error('Variáveis de ambiente APITOKEN, I ou URLPATCH não configuradas')
    }

    // Buscar funis da API SprintHub
    const sprintHubUrl = `${urlPatch}/crm?apitoken=${apiToken}&i=${groupId}`
    
    console.log('📡 Buscando funis do SprintHub...')
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Erro na API SprintHub: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const funis: SprintHubFunil[] = Array.isArray(data) ? data : []

    console.log(`✅ ${funis.length} funis recebidos da API`)
    console.log('📦 Dados recebidos:', JSON.stringify(funis, null, 2))

    if (funis.length === 0) {
      return {
        success: true,
        message: 'Nenhum funil encontrado na API',
        stats: {
          total: 0,
          novos: 0,
          atualizados: 0,
          erros: 0
        }
      }
    }

    // Criar tabela se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS funis (
        id INT PRIMARY KEY,
        funil_nome VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_funil_nome (funil_nome),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    let novos = 0
    let atualizados = 0
    let erros = 0

    // Sincronizar cada funil
    for (const funil of funis) {
      try {
        // Validar dados do funil
        if (!funil.id) {
          console.error('❌ Funil sem ID, pulando:', funil)
          erros++
          continue
        }

        // Garantir que funil_nome não seja undefined
        // Se não tiver nome, usar o ID como fallback
        const funilNome = funil.funil_nome || `Funil ${funil.id}`

        // Verificar se o funil já existe
        const existing = await executeQuery(
          'SELECT id FROM funis WHERE id = ?',
          [funil.id]
        ) as any[]

        if (existing.length > 0) {
          // Atualizar funil existente
          await executeQuery(
            `UPDATE funis 
             SET funil_nome = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [funilNome, funil.id]
          )
          atualizados++
          console.log(`✓ Funil ${funil.id} atualizado`)
        } else {
          // Inserir novo funil
          await executeQuery(
            `INSERT INTO funis (id, funil_nome, created_at, updated_at)
             VALUES (?, ?, NOW(), NOW())`,
            [funil.id, funilNome]
          )
          novos++
          console.log(`✓ Funil ${funil.id} inserido`)
        }
      } catch (error) {
        console.error(`❌ Erro ao sincronizar funil ${funil.id}:`, error)
        erros++
      }
    }

    const stats = {
      total: funis.length,
      novos,
      atualizados,
      erros
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2)

    // Registrar histórico de sincronização
    try {
      await executeQuery(
        `INSERT INTO cron_sync_history 
         (job_name, started_at, completed_at, status, type, records_inserted, records_updated, records_errors, duration_seconds, created_at)
         VALUES ('funis-sync', FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'success', 'manual', ?, ?, ?, ?, FROM_UNIXTIME(?))`,
        [
          Math.floor(startTime / 1000),
          Math.floor(Date.now() / 1000),
          novos,
          atualizados,
          erros,
          parseFloat(durationSeconds),
          Math.floor(startTime / 1000)
        ]
      )
    } catch (error) {
      console.error('⚠️ Erro ao registrar histórico (tabela pode não existir):', error)
    }

    console.log('✅ Sincronização de funis concluída:', stats)

    return {
      success: true,
      message: `Sincronização concluída: ${novos} novos, ${atualizados} atualizados, ${erros} erros`,
      stats
    }

  } catch (error) {
    console.error('❌ Erro na sincronização de funis:', error)
    
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
    
    // Registrar erro no histórico
    try {
      await executeQuery(
        `INSERT INTO cron_sync_history 
         (job_name, started_at, completed_at, status, type, error_message, duration_seconds, created_at)
         VALUES ('funis-sync', FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'error', 'manual', ?, ?, FROM_UNIXTIME(?))`,
        [
          Math.floor(startTime / 1000),
          Math.floor(Date.now() / 1000),
          error instanceof Error ? error.message : 'Erro desconhecido',
          parseFloat(durationSeconds),
          Math.floor(startTime / 1000)
        ]
      )
    } catch (historyError) {
      console.error('⚠️ Erro ao registrar histórico de erro:', historyError)
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido na sincronização'
    }
  }
}

