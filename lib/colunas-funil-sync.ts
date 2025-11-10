import { executeQuery } from './database'

interface SprintHubColunaFunil {
  id: number
  nome_coluna: string
  total_oportunidades: number
  valor_total: number
  sequencia: number
}

export async function syncColunasFunil(): Promise<{
  success: boolean
  message: string
  stats?: {
    totalFunis: number
    totalColunas: number
    novos: number
    atualizados: number
    erros: number
  }
}> {
  const startTime = Date.now()
  
  try {
    console.log('🔄 Iniciando sincronização de colunas de funil...')

    // Buscar variáveis de ambiente
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      throw new Error('Variáveis de ambiente APITOKEN, I ou URLPATCH não configuradas')
    }

    // Buscar todos os funis do banco
    console.log('📂 Buscando funis do banco de dados...')
    const funis = await executeQuery('SELECT id FROM funis ORDER BY id') as any[]
    
    if (funis.length === 0) {
      return {
        success: true,
        message: 'Nenhum funil encontrado no banco. Execute a sincronização de funis primeiro.',
        stats: {
          totalFunis: 0,
          totalColunas: 0,
          novos: 0,
          atualizados: 0,
          erros: 0
        }
      }
    }

    console.log(`✅ ${funis.length} funis encontrados no banco`)

    // Criar tabela se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS colunas_funil (
        id INT NOT NULL,
        nome_coluna VARCHAR(255) NOT NULL,
        id_funil INT NOT NULL,
        total_oportunidades INT DEFAULT 0,
        valor_total DECIMAL(15,2) DEFAULT '0.00',
        sequencia INT NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `)

    let totalColunas = 0
    let novos = 0
    let atualizados = 0
    let erros = 0

    // Processar cada funil
    for (const funil of funis) {
      try {
        console.log(`📡 Buscando colunas do funil ${funil.id}...`)
        
        // Buscar colunas do funil da API SprintHub
        const sprintHubUrl = `${urlPatch}/crmfastloadv2?apitoken=${apiToken}&i=${groupId}&id=${funil.id}`
        
        const response = await fetch(sprintHubUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CRM-by-INTELI/1.0'
          }
        })

        if (!response.ok) {
          console.error(`❌ Erro na API para funil ${funil.id}: ${response.status}`)
          erros++
          continue
        }

        const data = await response.json()
        const colunas: SprintHubColunaFunil[] = Array.isArray(data) ? data : []

        console.log(`  ✓ ${colunas.length} colunas recebidas para funil ${funil.id}`)
        totalColunas += colunas.length

        // Sincronizar cada coluna
        for (const coluna of colunas) {
          try {
            // Validar dados da coluna
            if (!coluna.id) {
              console.error('❌ Coluna sem ID, pulando:', coluna)
              erros++
              continue
            }

            // Garantir valores obrigatórios (NOT NULL)
            const nomeColuna = coluna.nome_coluna || `Coluna ${coluna.id}`
            const totalOportunidades = coluna.total_oportunidades || 0
            const valorTotal = coluna.valor_total || 0
            const sequencia = coluna.sequencia !== undefined ? coluna.sequencia : 0

            // Verificar se a coluna já existe
            const existing = await executeQuery(
              'SELECT id FROM colunas_funil WHERE id = ?',
              [coluna.id]
            ) as any[]

            if (existing.length > 0) {
              // Atualizar coluna existente
              await executeQuery(
                `UPDATE colunas_funil 
                 SET nome_coluna = ?,
                     id_funil = ?,
                     total_oportunidades = ?,
                     valor_total = ?,
                     sequencia = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [nomeColuna, funil.id, totalOportunidades, valorTotal, sequencia, coluna.id]
              )
              atualizados++
            } else {
              // Inserir nova coluna
              await executeQuery(
                `INSERT INTO colunas_funil 
                 (id, nome_coluna, id_funil, total_oportunidades, valor_total, sequencia, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [coluna.id, nomeColuna, funil.id, totalOportunidades, valorTotal, sequencia]
              )
              novos++
            }
          } catch (error) {
            console.error(`❌ Erro ao sincronizar coluna ${coluna.id}:`, error)
            erros++
          }
        }

        // Pequeno delay entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Erro ao processar funil ${funil.id}:`, error)
        erros++
      }
    }

    const stats = {
      totalFunis: funis.length,
      totalColunas,
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
         VALUES ('colunas-funil-sync', FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'success', 'manual', ?, ?, ?, ?, FROM_UNIXTIME(?))`,
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
      console.error('⚠️ Erro ao registrar histórico:', error)
    }

    console.log('✅ Sincronização de colunas de funil concluída:', stats)

    return {
      success: true,
      message: `Sincronização concluída: ${funis.length} funis processados, ${totalColunas} colunas (${novos} novas, ${atualizados} atualizadas, ${erros} erros)`,
      stats
    }

  } catch (error) {
    console.error('❌ Erro na sincronização de colunas de funil:', error)
    
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
    
    // Registrar erro no histórico
    try {
      await executeQuery(
        `INSERT INTO cron_sync_history 
         (job_name, started_at, completed_at, status, type, error_message, duration_seconds, created_at)
         VALUES ('colunas-funil-sync', FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'error', 'manual', ?, ?, FROM_UNIXTIME(?))`,
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

