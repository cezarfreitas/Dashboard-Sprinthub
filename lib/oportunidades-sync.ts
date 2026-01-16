import { executeQuery } from './database'

// Rate Limiter: 50 requisições por minuto
class RateLimiter {
  private requests: number[] = []
  private maxRequests: number
  private windowMs: number
  private totalRequests: number = 0
  private totalWaits: number = 0

  constructor(maxRequests: number = 50, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    
    // Remove requisições antigas (fora da janela de 1 minuto)
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs)
    
    // Se atingiu o limite, esperar até que uma requisição saia da janela
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.windowMs - (now - oldestRequest) + 100 // +100ms de margem
      
      if (waitTime > 0) {
        this.totalWaits++
        console.log(`⏳ Rate limit atingido (${this.maxRequests} req/min). Aguardando ${Math.ceil(waitTime / 1000)}s... [Total de esperas: ${this.totalWaits}]`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        // Limpar novamente após esperar
        const newNow = Date.now()
        this.requests = this.requests.filter(timestamp => newNow - timestamp < this.windowMs)
      }
    }
    
    // Registrar nova requisição
    this.requests.push(Date.now())
    this.totalRequests++
    
    // Log a cada 10 requisições
    if (this.totalRequests % 10 === 0) {
      console.log(`📊 Rate limiter: ${this.totalRequests} requisições totais | ${this.requests.length} na janela atual | ${this.totalWaits} esperas`)
    }
  }
  
  getStats() {
    return {
      totalRequests: this.totalRequests,
      currentWindow: this.requests.length,
      totalWaits: this.totalWaits,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    }
  }
  
  reset() {
    this.requests = []
    this.totalRequests = 0
    this.totalWaits = 0
  }
}

// Instância global do rate limiter (50 req/min)
const rateLimiter = new RateLimiter(50, 60000)

// Helper para converter data ISO para formato MySQL
function convertToMySQLDateTime(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null
  try {
    // Remove 'Z' e 'T', converte para formato MySQL
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return null
    
    // Formato: YYYY-MM-DD HH:MM:SS
    return date.toISOString().slice(0, 19).replace('T', ' ')
  } catch {
    return null
  }
}

interface SprintHubOportunidade {
  id: string | number
  title: string
  value: number | string
  crm_column?: number
  lead_id?: number
  sequence?: number
  status?: string
  loss_reason?: string
  gain_reason?: string
  expectedCloseDate?: string
  sale_channel?: string
  campaign?: string
  user?: string
  last_column_change?: string
  last_status_change?: string
  gain_date?: string
  lost_date?: string
  reopen_date?: string
  await_column_approved?: boolean | null
  await_column_approved_user?: string | null
  reject_appro?: boolean | null
  reject_appro_desc?: string | null
  conf_installment?: any
  fields?: any
  createDate?: string
  updateDate?: string
  archived?: number
  dataLead?: any
}

interface PaginatedResponse {
  data: SprintHubOportunidade[]
  total: number
  page: number
  totalPages: number
}

export async function syncOportunidades(): Promise<{
  success: boolean
  message: string
  stats?: {
    totalFunis: number
    totalColunas: number
    totalOportunidades: number
    novos: number
    atualizados: number
    erros: number
  }
}> {
  const startTime = Date.now()
  
  try {
    console.log('🔄 Iniciando sincronização de oportunidades...')

    // Configurações da API
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      throw new Error('Variáveis de ambiente não configuradas (APITOKEN, I, URLPATCH)')
    }

    // Buscar todos os funis do banco
    const funis = await executeQuery(
      'SELECT id FROM funis ORDER BY id'
    ) as any[]

    if (funis.length === 0) {
      return {
        success: false,
        message: 'Nenhum funil encontrado no banco. Execute a sincronização de funis primeiro.'
      }
    }

    console.log(`✅ ${funis.length} funis encontrados no banco`)

    let totalColunas = 0
    let totalOportunidades = 0
    let novos = 0
    let atualizados = 0
    let erros = 0

    // Processar cada funil
    for (const funil of funis) {
      try {
        console.log(`\n📊 Processando funil ${funil.id}...`)
        
        // Buscar colunas do funil
        const colunas = await executeQuery(
          'SELECT id, nome_coluna FROM colunas_funil WHERE id_funil = ? ORDER BY sequencia',
          [funil.id]
        ) as any[]

        if (colunas.length === 0) {
          console.log(`  ⚠️ Nenhuma coluna encontrada para funil ${funil.id}`)
          continue
        }

        console.log(`  ✅ ${colunas.length} colunas encontradas`)
        totalColunas += colunas.length

        // Processar cada coluna
        for (const coluna of colunas) {
          try {
            console.log(`  📋 Processando coluna ${coluna.id} (${coluna.nome_coluna})...`)
            
            let page = 0
            let hasMorePages = true

            // Paginar através de todas as oportunidades da coluna
            while (hasMorePages) {
              const payload = {
                filterByUsers: null,
                filterByStatus: ["open", "gain", "lost"],
                filterByExpectedCloseDate: null,
                filters: [],
                search: "",
                page: page,
                limit: 100,
                columnId: coluna.id,
                onlyArchived: false,
                searchBy: "opportunity"
              }

              const sprintHubUrl = `${urlPatch}/crm/opportunities/${funil.id}?apitoken=${apiToken}&i=${groupId}`
              
              console.log(`    📄 Página ${page + 1}...`)
              console.log(`    🌐 URL: ${sprintHubUrl.replace(apiToken, '***')}`)
              console.log(`    📦 Payload:`, JSON.stringify(payload))

              // Rate limiting: aguardar se necessário (50 req/min)
              await rateLimiter.waitIfNeeded()

              const response = await fetch(sprintHubUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'CRM-by-INTELI/1.0'
                },
                body: JSON.stringify(payload)
              })

              if (!response.ok) {
                console.error(`    ❌ Erro na API para coluna ${coluna.id}, página ${page}: ${response.status}`)
                const errorText = await response.text()
                console.error(`    📄 Resposta de erro:`, errorText.substring(0, 200))
                erros++
                break
              }

              const data = await response.json()

              // Log da estrutura completa da resposta (primeira vez apenas)
              if (page === 0 && coluna.id === colunas[0]?.id) {
                console.log(`    📦 Estrutura completa da resposta (sample):`, JSON.stringify(data, null, 2).substring(0, 500))
              }

              // Log detalhado da resposta para debug
              console.log(`    📦 Resposta da API:`, {
                keys: Object.keys(data || {}),
                hasData: !!data.data,
                dataLength: data.data?.length || 0,
                total: data.total,
                page: data.page,
                totalPages: data.totalPages,
                dataType: typeof data.data,
                isArray: Array.isArray(data.data),
                isDirect: Array.isArray(data)
              })

              // A API pode retornar diretamente um array ou um objeto com propriedade data
              const oportunidades = Array.isArray(data) ? data : (data.data || [])
              
              console.log(`    ✓ ${oportunidades.length} oportunidades recebidas`)
              
              // Se recebeu oportunidades, mostrar amostra da primeira
              if (oportunidades.length > 0) {
                console.log(`    📄 Primeira oportunidade (sample):`, {
                  id: oportunidades[0].id,
                  title: oportunidades[0].title,
                  status: oportunidades[0].status,
                  value: oportunidades[0].value,
                  lead_id: oportunidades[0].lead_id,
                  crm_column: oportunidades[0].crm_column
                })
              }

              if (oportunidades.length === 0) {
                hasMorePages = false
                break
              }

              // Processar cada oportunidade
              for (const opp of oportunidades) {
                // Normalizar ID: garantir que seja sempre string (o campo no banco é varchar(50))
                // Definir antes do try para estar disponível no catch
                const oportunidadeId = opp.id ? String(opp.id) : 'sem-id'
                
                try {
                  if (!opp.id) {
                    console.error('    ❌ Oportunidade sem ID, pulando:', opp)
                    erros++
                    continue
                  }

                  // Mapear campos (API usa snake_case)
                  const title = opp.title || 'Sem título'
                  const value = typeof opp.value === 'string' ? parseFloat(opp.value || '0') : (opp.value || 0)
                  const crmColumn = opp.crm_column || null
                  const leadId = opp.lead_id || null
                  const sequence = opp.sequence !== undefined ? opp.sequence : null
                  const status = opp.status || null
                  // Extrair apenas o ID se loss_reason for um objeto, senão usar o valor direto
                  // Remover "Motivo " se estiver presente
                  let lossReason: string | number | null = null
                  if (opp.loss_reason) {
                    if (typeof opp.loss_reason === 'object' && opp.loss_reason.id) {
                      // Se for objeto, pegar apenas o ID
                      lossReason = String(opp.loss_reason.id)
                    } else if (typeof opp.loss_reason === 'string' || typeof opp.loss_reason === 'number') {
                      // Se for string ou número, remover "Motivo " se estiver presente
                      let value = String(opp.loss_reason).trim()
                      if (value.startsWith('Motivo ')) {
                        value = value.replace(/^Motivo\s+/, '')
                      }
                      // Garantir que seja apenas número
                      if (/^\d+$/.test(value)) {
                        lossReason = value
                      } else {
                        lossReason = null
                      }
                    }
                  }
                  const gainReason = opp.gain_reason || null
                  const expectedCloseDate = opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : null
                  const saleChannel = opp.sale_channel || null
                  const campaign = opp.campaign || null
                  const user = opp.user ? String(opp.user) : null
                  
                  // Converter datas ISO para formato MySQL
                  const lastColumnChange = convertToMySQLDateTime(opp.last_column_change)
                  const lastStatusChange = convertToMySQLDateTime(opp.last_status_change)
                  const gainDate = convertToMySQLDateTime(opp.gain_date)
                  const lostDate = convertToMySQLDateTime(opp.lost_date)
                  const reopenDate = convertToMySQLDateTime(opp.reopen_date)
                  const createDate = convertToMySQLDateTime(opp.createDate)
                  const updateDate = convertToMySQLDateTime(opp.updateDate)
                  
                  const awaitColumnApproved = opp.await_column_approved ? 1 : 0
                  const awaitColumnApprovedUser = opp.await_column_approved_user || null
                  const rejectAppro = opp.reject_appro ? 1 : 0
                  const rejectApproDesc = opp.reject_appro_desc || null
                  const confInstallment = opp.conf_installment ? JSON.stringify(opp.conf_installment) : null
                  const fields = opp.fields ? JSON.stringify(opp.fields) : null
                  const dataLead = opp.dataLead ? JSON.stringify(opp.dataLead) : null
                  const archived = opp.archived ? 1 : 0
                  const colunaFunilId = coluna.id

                  // Verificar se a oportunidade já existe
                  const existing = await executeQuery(
                    'SELECT id FROM oportunidades WHERE id = ?',
                    [oportunidadeId]
                  ) as any[]

                  if (existing.length > 0) {
                    // Atualizar oportunidade existente
                    await executeQuery(
                      `UPDATE oportunidades 
                       SET title = ?,
                           value = ?,
                           crm_column = ?,
                           lead_id = ?,
                           sequence = ?,
                           status = ?,
                           loss_reason = ?,
                           gain_reason = ?,
                           expectedCloseDate = ?,
                           sale_channel = ?,
                           campaign = ?,
                           user = ?,
                           last_column_change = ?,
                           last_status_change = ?,
                           gain_date = ?,
                           lost_date = ?,
                           reopen_date = ?,
                           await_column_approved = ?,
                           await_column_approved_user = ?,
                           reject_appro = ?,
                           reject_appro_desc = ?,
                           conf_installment = ?,
                           fields = ?,
                           dataLead = ?,
                           createDate = ?,
                           updateDate = ?,
                           archived = ?,
                           coluna_funil_id = ?
                       WHERE id = ?`,
                      [
                        title, value, crmColumn, leadId, sequence, status, lossReason, gainReason,
                        expectedCloseDate, saleChannel, campaign, user, lastColumnChange, lastStatusChange,
                        gainDate, lostDate, reopenDate, awaitColumnApproved, awaitColumnApprovedUser,
                        rejectAppro, rejectApproDesc, confInstallment, fields, dataLead, createDate, updateDate,
                        archived, colunaFunilId, oportunidadeId
                      ]
                    )
                    atualizados++
                  } else {
                    // Inserir nova oportunidade
                    await executeQuery(
                      `INSERT INTO oportunidades 
                       (id, title, value, crm_column, lead_id, sequence, status, loss_reason, gain_reason,
                        expectedCloseDate, sale_channel, campaign, user, last_column_change, last_status_change,
                        gain_date, lost_date, reopen_date, await_column_approved, await_column_approved_user,
                        reject_appro, reject_appro_desc, conf_installment, fields, dataLead, createDate, updateDate,
                        archived, coluna_funil_id, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                      [
                        oportunidadeId, title, value, crmColumn, leadId, sequence, status, lossReason, gainReason,
                        expectedCloseDate, saleChannel, campaign, user, lastColumnChange, lastStatusChange,
                        gainDate, lostDate, reopenDate, awaitColumnApproved, awaitColumnApprovedUser,
                        rejectAppro, rejectApproDesc, confInstallment, fields, dataLead, createDate, updateDate,
                        archived, colunaFunilId
                      ]
                    )
                    novos++
                  }

                  totalOportunidades++

                } catch (error) {
                  console.error(`    ❌ Erro ao sincronizar oportunidade ${oportunidadeId}:`, error)
                  erros++
                }
              }

              // Verificar se há mais páginas
              if (data.totalPages && page + 1 >= data.totalPages) {
                hasMorePages = false
              } else if (oportunidades.length < 100) {
                hasMorePages = false
              } else {
                page++
              }

              // Delay entre páginas para não sobrecarregar a API
              await new Promise(resolve => setTimeout(resolve, 100))
            }

            // Delay entre colunas
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (error) {
            console.error(`  ❌ Erro ao processar coluna ${coluna.id}:`, error)
            erros++
          }
        }

      } catch (error) {
        console.error(`❌ Erro ao processar funil ${funil.id}:`, error)
        erros++
      }
    }

    const endTime = Date.now()
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2)
    const rateLimiterStats = rateLimiter.getStats()
    
    const stats = {
      totalFunis: funis.length,
      totalColunas,
      totalOportunidades,
      novos,
      atualizados,
      erros
    }

    console.log(`\n✅ Sincronização de oportunidades concluída em ${durationSeconds}s:`, stats)
    console.log(`📊 Rate limiter stats:`, {
      totalRequests: rateLimiterStats.totalRequests,
      totalWaits: rateLimiterStats.totalWaits,
      avgRequestsPerMinute: Math.round((rateLimiterStats.totalRequests / parseFloat(durationSeconds)) * 60)
    })
    
    // Resetar contador do rate limiter para próxima execução
    rateLimiter.reset()

    // Registrar histórico de sincronização
    try {
      await executeQuery(
        `INSERT INTO cron_sync_history 
         (job_name, started_at, completed_at, status, type, records_inserted, records_updated, records_errors, duration_seconds, created_at)
         VALUES ('oportunidades-sync', FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'success', 'manual', ?, ?, ?, ?, FROM_UNIXTIME(?))`,
        [
          startTime / 1000,
          endTime / 1000,
          novos,
          atualizados,
          erros,
          parseFloat(durationSeconds),
          endTime / 1000
        ]
      )
    } catch (logError) {
      console.error('Erro ao registrar histórico:', logError)
    }

    return {
      success: true,
      message: `Sincronização concluída: ${totalOportunidades} oportunidades processadas`,
      stats
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const endTime = Date.now()
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2)
    
    console.error('❌ Erro na sincronização de oportunidades:', error)

    // Registrar erro no histórico
    try {
      await executeQuery(
        `INSERT INTO cron_sync_history 
         (job_name, started_at, completed_at, status, type, error_message, duration_seconds, created_at)
         VALUES ('oportunidades-sync', FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'error', 'manual', ?, ?, FROM_UNIXTIME(?))`,
        [
          startTime / 1000,
          endTime / 1000,
          errorMessage,
          parseFloat(durationSeconds),
          endTime / 1000
        ]
      )
    } catch (logError) {
      console.error('Erro ao registrar histórico:', logError)
    }

    return {
      success: false,
      message: `Erro na sincronização: ${errorMessage}`
    }
  }
}

