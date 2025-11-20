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
    console.log('🔗 URL:', sprintHubUrl.replace(apiToken, '***TOKEN***'))
    console.log('🔑 Token configurado:', apiToken ? 'SIM' : 'NÃO')
    console.log('🔑 Group ID configurado:', groupId ? 'SIM' : 'NÃO')
    console.log('🔑 URL Patch configurado:', urlPatch ? 'SIM' : 'NÃO')
    
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      },
      cache: 'no-store' // Evitar cache
    })

    console.log('📊 Status da resposta:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erro na resposta da API:', errorText)
      throw new Error(`Erro na API SprintHub: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const rawData = await response.json()
    let motivos: SprintHubMotivoPerda[] = []
    
    // Normalizar dados da API (pode vir como array direto ou dentro de um objeto)
    // Formato 1: Array direto
    if (Array.isArray(rawData)) {
      motivos = rawData
    }
    // Formato 2: { data: [...] }
    else if (rawData && Array.isArray(rawData.data)) {
      motivos = rawData.data
    }
    // Formato 3: { motivos: [...] }
    else if (rawData && Array.isArray(rawData.motivos)) {
      motivos = rawData.motivos
    }
    // Formato 4: { results: [...] }
    else if (rawData && Array.isArray(rawData.results)) {
      motivos = rawData.results
    }
    // Formato 5: Objeto com múltiplas propriedades que podem ser arrays
    else if (rawData && typeof rawData === 'object') {
      // Procurar por qualquer propriedade que seja array
      for (const key in rawData) {
        if (Array.isArray(rawData[key])) {
          motivos = rawData[key]
          console.log(`📌 Array encontrado na propriedade '${key}'`)
          break
        }
      }
    }

    console.log(`✅ ${motivos.length} motivos de perda recebidos da API`)

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
    const registrosInseridos: Array<{ id: number; motivo: string }> = []
    const registrosAtualizados: Array<{ id: number; motivo: string; motivoAnterior?: string }> = []

    console.log('')
    console.log('📋 Iniciando sincronização dos motivos de perda...')
    console.log('')

    // Sincronizar cada motivo de perda
    for (const motivo of motivos) {
      try {
        // Validar dados do motivo
        if (!motivo || typeof motivo !== 'object') {
          console.error('❌ Motivo inválido (não é objeto), pulando:', motivo)
          erros++
          continue
        }

        // Extrair ID (pode estar em diferentes propriedades)
        const motivoId = motivo.id || motivo.motivo_id || motivo.ID || motivo.MotivoId
        if (!motivoId) {
          console.error('❌ Motivo sem ID, pulando:', JSON.stringify(motivo))
          erros++
          continue
        }

        // Buscar o texto do motivo em diferentes campos possíveis
        // A API pode retornar: motivo, name, title, description, text, label, etc.
        // Prioridade: motivo, name (formato da API SprintHub), depois outros
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
        const motivoFinal = motivoTexto || `Motivo ${motivoId}`

        // Verificar se o motivo já existe e buscar o texto atual
        const existing = await executeQuery(
          'SELECT id, motivo FROM motivos_de_perda WHERE id = ?',
          [motivoId]
        ) as any[]

        if (existing.length > 0) {
          // Atualizar motivo existente apenas se o texto mudou
          const existingMotivo = existing[0]
          const motivoAtual = existingMotivo.motivo || ''
          
          if (motivoAtual !== motivoFinal) {
            await executeQuery(
              `UPDATE motivos_de_perda 
               SET motivo = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [motivoFinal, motivoId]
            )
            atualizados++
            registrosAtualizados.push({
              id: motivoId,
              motivo: motivoFinal,
              motivoAnterior: motivoAtual
            })
          }
        } else {
          // Inserir novo motivo
          await executeQuery(
            `INSERT INTO motivos_de_perda (id, motivo, created_at, updated_at)
             VALUES (?, ?, NOW(), NOW())`,
            [motivoId, motivoFinal]
          )
          novos++
          registrosInseridos.push({
            id: motivoId,
            motivo: motivoFinal
          })
        }
      } catch (error) {
        const motivoId = motivo?.id || motivo?.motivo_id || motivo?.ID || 'DESCONHECIDO'
        console.error(`❌ Erro ao sincronizar motivo ${motivoId}:`, error instanceof Error ? error.message : 'Erro desconhecido')
        erros++
      }
    }

    // Mostrar registros inseridos
    if (registrosInseridos.length > 0) {
      console.log('')
      console.log('📝 REGISTROS INSERIDOS:')
      registrosInseridos.forEach((registro, index) => {
        console.log(`  ${index + 1}. ID: ${registro.id} | Motivo: "${registro.motivo}"`)
      })
    }

    // Mostrar registros atualizados
    if (registrosAtualizados.length > 0) {
      console.log('')
      console.log('🔄 REGISTROS ATUALIZADOS:')
      registrosAtualizados.forEach((registro, index) => {
        console.log(`  ${index + 1}. ID: ${registro.id} | "${registro.motivoAnterior}" -> "${registro.motivo}"`)
      })
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

    console.log('')
    console.log('✅ Sincronização concluída!')
    console.log(`   • Novos: ${novos}`)
    console.log(`   • Atualizados: ${atualizados}`)
    console.log(`   • Erros: ${erros}`)
    console.log(`   • Total processado: ${motivos.length}`)

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

