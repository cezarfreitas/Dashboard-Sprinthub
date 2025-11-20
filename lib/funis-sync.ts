import { executeQuery } from './database'

interface SprintHubFunil {
  id: number
  name?: string        // Campo retornado pela API SprintHub
  funil_nome?: string  // Formato alternativo
  nome?: string        // Formato alternativo
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

    // Verificar quais variáveis estão faltando
    const missingVars = []
    if (!apiToken) missingVars.push('APITOKEN')
    if (!groupId) missingVars.push('I')
    if (!urlPatch) missingVars.push('URLPATCH')

    if (missingVars.length > 0) {
      const errorMsg = `❌ Variáveis de ambiente faltando no .env: ${missingVars.join(', ')}`
      console.error(errorMsg)
      console.error('💡 Configure estas variáveis no arquivo .env para habilitar a sincronização com SprintHub')
      throw new Error(errorMsg)
    }

    // Buscar funis da API SprintHub
    const sprintHubUrl = `${urlPatch}/crm?apitoken=${apiToken}&i=${groupId}`
    
    console.log('📡 Buscando funis do SprintHub...')
    console.log('🔗 URL:', apiToken ? sprintHubUrl.replace(apiToken, '***TOKEN***') : sprintHubUrl)
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
    
    // Tentar diferentes formatos de resposta
    let funis: SprintHubFunil[] = []
    
    // Formato 1: Array direto
    if (Array.isArray(rawData)) {
      funis = rawData
    }
    // Formato 2: { data: [...] }
    else if (rawData && Array.isArray(rawData.data)) {
      funis = rawData.data
    }
    // Formato 3: { funis: [...] }
    else if (rawData && Array.isArray(rawData.funis)) {
      funis = rawData.funis
    }
    // Formato 4: { results: [...] }
    else if (rawData && Array.isArray(rawData.results)) {
      funis = rawData.results
    }
    // Formato 5: Objeto com múltiplas propriedades que podem ser arrays
    else if (rawData && typeof rawData === 'object') {
      // Procurar por qualquer propriedade que seja array
      for (const key in rawData) {
        if (Array.isArray(rawData[key])) {
          funis = rawData[key]
          console.log(`📌 Array encontrado na propriedade '${key}'`)
          break
        }
      }
    }

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
    const registrosInseridos: Array<{ id: number; nome: string }> = []
    const registrosAtualizados: Array<{ id: number; nome: string; nomeAnterior?: string }> = []

    console.log('')
    console.log('📋 Iniciando sincronização dos funis...')
    console.log('')

    // Sincronizar cada funil
    for (const funil of funis) {
      try {
        // Validar dados do funil
        if (!funil || typeof funil !== 'object') {
          console.error('❌ Funil inválido (não é objeto), pulando:', funil)
          erros++
          continue
        }

        // Extrair ID (pode estar em diferentes propriedades)
        const funilId = funil.id || (funil as any).funil_id || (funil as any).ID || (funil as any).FunilId
        if (!funilId) {
          console.error('❌ Funil sem ID, pulando:', JSON.stringify(funil))
          erros++
          continue
        }

        // Extrair nome (pode estar em diferentes propriedades)
        // Prioridade: name (formato da API SprintHub), depois outros formatos
        const funilNome = funil.name || funil.funil_nome || funil.nome || (funil as any).Nome || (funil as any).funilNome || `Funil ${funilId}`

        // Verificar se o funil já existe e buscar o nome atual
        const existing = await executeQuery(
          'SELECT id, funil_nome FROM funis WHERE id = ?',
          [funilId]
        ) as any[]

        if (existing.length > 0) {
          // Atualizar funil existente apenas se o nome mudou
          const existingFunil = existing[0]
          const nomeAtual = existingFunil.funil_nome || ''
          
          if (nomeAtual !== funilNome) {
            await executeQuery(
              `UPDATE funis 
               SET funil_nome = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [funilNome, funilId]
            )
            atualizados++
            registrosAtualizados.push({
              id: funilId,
              nome: funilNome,
              nomeAnterior: nomeAtual
            })
          }
        } else {
          // Inserir novo funil
          await executeQuery(
            `INSERT INTO funis (id, funil_nome, created_at, updated_at)
             VALUES (?, ?, NOW(), NOW())`,
            [funilId, funilNome]
          )
          novos++
          registrosInseridos.push({
            id: funilId,
            nome: funilNome
          })
        }
      } catch (error) {
        const funilId = funil?.id || (funil as any)?.funil_id || (funil as any)?.ID || 'DESCONHECIDO'
        console.error(`❌ Erro ao sincronizar funil ${funilId}:`, error instanceof Error ? error.message : 'Erro desconhecido')
        erros++
      }
    }

    // Mostrar registros inseridos
    if (registrosInseridos.length > 0) {
      console.log('')
      console.log('📝 REGISTROS INSERIDOS:')
      registrosInseridos.forEach((registro, index) => {
        console.log(`  ${index + 1}. ID: ${registro.id} | Nome: "${registro.nome}"`)
      })
    }

    // Mostrar registros atualizados
    if (registrosAtualizados.length > 0) {
      console.log('')
      console.log('🔄 REGISTROS ATUALIZADOS:')
      registrosAtualizados.forEach((registro, index) => {
        console.log(`  ${index + 1}. ID: ${registro.id} | "${registro.nomeAnterior}" -> "${registro.nome}"`)
      })
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

    console.log('')
    console.log('✅ Sincronização concluída!')
    console.log(`   • Novos: ${novos}`)
    console.log(`   • Atualizados: ${atualizados}`)
    console.log(`   • Erros: ${erros}`)
    console.log(`   • Total processado: ${funis.length}`)

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

