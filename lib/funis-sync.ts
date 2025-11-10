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
            [funil.funil_nome, funil.id]
          )
          atualizados++
        } else {
          // Inserir novo funil
          await executeQuery(
            `INSERT INTO funis (id, funil_nome, created_at, updated_at)
             VALUES (?, ?, NOW(), NOW())`,
            [funil.id, funil.funil_nome]
          )
          novos++
        }
      } catch (error) {
        console.error(`❌ Erro ao sincronizar funil ${funil.id}:`, error)
        erros++
      }
    }

    // Registrar histórico de sincronização
    try {
      await executeQuery(
        `INSERT INTO sync_history (entity_type, total_records, new_records, updated_records, errors, sync_date)
         VALUES ('funis', ?, ?, ?, ?, NOW())`,
        [funis.length, novos, atualizados, erros]
      )
    } catch (error) {
      console.error('⚠️ Erro ao registrar histórico (tabela pode não existir):', error)
    }

    const stats = {
      total: funis.length,
      novos,
      atualizados,
      erros
    }

    console.log('✅ Sincronização de funis concluída:', stats)

    return {
      success: true,
      message: `Sincronização concluída: ${novos} novos, ${atualizados} atualizados, ${erros} erros`,
      stats
    }

  } catch (error) {
    console.error('❌ Erro na sincronização de funis:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido na sincronização'
    }
  }
}

