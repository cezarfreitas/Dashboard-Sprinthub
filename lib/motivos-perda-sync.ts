import { executeQuery } from './database'

interface SprintHubMotivoPerda {
  id: number
  motivo?: string
  name?: string
  title?: string
  description?: string
  text?: string
  label?: string
  nome?: string
  motivo_perda?: string
  [key: string]: any // Permitir outros campos dinâmicos
}

export async function syncMotivosPerda(): Promise<{
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
    console.log('🔄 Iniciando sincronização de motivos de perda...')

    // Buscar variáveis de ambiente
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      throw new Error('Variáveis de ambiente APITOKEN, I ou URLPATCH não configuradas')
    }

    // Buscar motivos de perda da API SprintHub
    const sprintHubUrl = `${urlPatch}/crmlossreason?apitoken=${apiToken}&i=${groupId}`
    
    console.log('📡 Buscando motivos de perda do SprintHub...')
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
    let motivos: SprintHubMotivoPerda[] = []
    
    // Normalizar dados da API (pode vir como array direto ou dentro de um objeto)
    if (Array.isArray(data)) {
      motivos = data
    } else if (data.data && Array.isArray(data.data)) {
      motivos = data.data
    } else if (data.motivos && Array.isArray(data.motivos)) {
      motivos = data.motivos
    } else if (data.results && Array.isArray(data.results)) {
      motivos = data.results
    }

    console.log(`✅ ${motivos.length} motivos de perda recebidos da API`)
    console.log('📦 Dados recebidos (primeiros 3):', JSON.stringify(motivos.slice(0, 3), null, 2))

    if (motivos.length === 0) {
      return {
        success: true,
        message: 'Nenhum motivo de perda encontrado na API',
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
      CREATE TABLE IF NOT EXISTS motivos_de_perda (
        id INT PRIMARY KEY,
        motivo VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_motivo (motivo),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    let novos = 0
    let atualizados = 0
    let erros = 0

    // Sincronizar cada motivo de perda
    for (const motivo of motivos) {
      try {
        // Validar dados do motivo
        if (!motivo.id) {
          console.error('❌ Motivo sem ID, pulando:', motivo)
          erros++
          continue
        }

        // Buscar o texto do motivo em diferentes campos possíveis
        // A API pode retornar: motivo, name, title, description, text, label, etc.
        const motivoTexto = 
          motivo.motivo || 
          motivo.name || 
          motivo.title || 
          motivo.description || 
          motivo.text || 
          motivo.label ||
          motivo.nome ||
          motivo.motivo_perda ||
          null

        // Se não encontrou o texto, usar o ID como fallback
        const motivoFinal = motivoTexto || `Motivo ${motivo.id}`
        
        // Log para debug se não encontrou o campo motivo
        if (!motivoTexto) {
          console.warn(`⚠️ Motivo ${motivo.id} sem texto, usando fallback. Dados:`, JSON.stringify(motivo))
        }

        // Verificar se o motivo já existe
        const existing = await executeQuery(
          'SELECT id FROM motivos_de_perda WHERE id = ?',
          [motivo.id]
        ) as any[]

        if (existing.length > 0) {
          // Atualizar motivo existente
          await executeQuery(
            `UPDATE motivos_de_perda 
             SET motivo = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [motivoFinal, motivo.id]
          )
          atualizados++
          console.log(`✓ Motivo ${motivo.id} atualizado: "${motivoFinal}"`)
        } else {
          // Inserir novo motivo
          await executeQuery(
            `INSERT INTO motivos_de_perda (id, motivo, created_at, updated_at)
             VALUES (?, ?, NOW(), NOW())`,
            [motivo.id, motivoFinal]
          )
          novos++
          console.log(`✓ Motivo ${motivo.id} inserido: "${motivoFinal}"`)
        }
      } catch (error) {
        console.error(`❌ Erro ao sincronizar motivo ${motivo.id}:`, error)
        erros++
      }
    }

    const stats = {
      total: motivos.length,
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
         VALUES ('motivos-perda-sync', FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'success', 'manual', ?, ?, ?, ?, FROM_UNIXTIME(?))`,
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

    console.log('✅ Sincronização de motivos de perda concluída:', stats)

    return {
      success: true,
      message: `Sincronização concluída: ${novos} novos, ${atualizados} atualizados, ${erros} erros`,
      stats
    }

  } catch (error) {
    console.error('❌ Erro na sincronização de motivos de perda:', error)
    
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
    
    // Registrar erro no histórico
    try {
      await executeQuery(
        `INSERT INTO cron_sync_history 
         (job_name, started_at, completed_at, status, type, error_message, duration_seconds, created_at)
         VALUES ('motivos-perda-sync', FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'error', 'manual', ?, ?, FROM_UNIXTIME(?))`,
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

