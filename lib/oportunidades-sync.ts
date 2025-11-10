import { executeQuery } from './database'

interface SprintHubOportunidade {
  id: number
  title: string
  value: number | string
  crmColumn?: string
  lead?: { id: number }
  sequence?: number
  status?: string
  lossReason?: string
  gainReason?: string
  expectedCloseDate?: string
  saleChannel?: string
  campaign?: string
  user?: string
  lastColumnChange?: string
  lastStatusChange?: string
  gainDate?: string
  lostDate?: string
  reopenDate?: string
  awaitColumnApproved?: boolean
  awaitColumnApprovedUser?: string
  rejectAppro?: boolean
  rejectApproDesc?: string
  confInstallment?: any
  fields?: any
  createDate?: string
  updateDate?: string
  archived?: boolean
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
                erros++
                break
              }

              const data = await response.json() as PaginatedResponse

              const oportunidades = data.data || []
              
              console.log(`    ✓ ${oportunidades.length} oportunidades recebidas`)

              if (oportunidades.length === 0) {
                hasMorePages = false
                break
              }

              // Processar cada oportunidade
              for (const opp of oportunidades) {
                try {
                  if (!opp.id) {
                    console.error('    ❌ Oportunidade sem ID, pulando:', opp)
                    erros++
                    continue
                  }

                  // Mapear campos
                  const title = opp.title || 'Sem título'
                  const value = typeof opp.value === 'string' ? parseFloat(opp.value || '0') : (opp.value || 0)
                  const crmColumn = opp.crmColumn || null
                  const leadId = opp.lead?.id || null
                  const sequence = opp.sequence !== undefined ? opp.sequence : null
                  const status = opp.status || null
                  const lossReason = opp.lossReason || null
                  const gainReason = opp.gainReason || null
                  const expectedCloseDate = opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : null
                  const saleChannel = opp.saleChannel || null
                  const campaign = opp.campaign || null
                  const user = opp.user || null
                  const lastColumnChange = opp.lastColumnChange || null
                  const lastStatusChange = opp.lastStatusChange || null
                  const gainDate = opp.gainDate || null
                  const lostDate = opp.lostDate || null
                  const reopenDate = opp.reopenDate || null
                  const awaitColumnApproved = opp.awaitColumnApproved ? 1 : 0
                  const awaitColumnApprovedUser = opp.awaitColumnApprovedUser || null
                  const rejectAppro = opp.rejectAppro ? 1 : 0
                  const rejectApproDesc = opp.rejectApproDesc || null
                  const confInstallment = opp.confInstallment ? JSON.stringify(opp.confInstallment) : null
                  const fields = opp.fields ? JSON.stringify(opp.fields) : null
                  const createDate = opp.createDate || null
                  const updateDate = opp.updateDate || null
                  const archived = opp.archived ? 1 : 0
                  const colunaFunilId = coluna.id

                  // Verificar se a oportunidade já existe
                  const existing = await executeQuery(
                    'SELECT id FROM oportunidades WHERE id = ?',
                    [opp.id]
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
                           createDate = ?,
                           updateDate = ?,
                           archived = ?,
                           coluna_funil_id = ?,
                           updated_at = NOW()
                       WHERE id = ?`,
                      [
                        title, value, crmColumn, leadId, sequence, status, lossReason, gainReason,
                        expectedCloseDate, saleChannel, campaign, user, lastColumnChange, lastStatusChange,
                        gainDate, lostDate, reopenDate, awaitColumnApproved, awaitColumnApprovedUser,
                        rejectAppro, rejectApproDesc, confInstallment, fields, createDate, updateDate,
                        archived, colunaFunilId, opp.id
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
                        reject_appro, reject_appro_desc, conf_installment, fields, createDate, updateDate,
                        archived, coluna_funil_id, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                      [
                        opp.id, title, value, crmColumn, leadId, sequence, status, lossReason, gainReason,
                        expectedCloseDate, saleChannel, campaign, user, lastColumnChange, lastStatusChange,
                        gainDate, lostDate, reopenDate, awaitColumnApproved, awaitColumnApprovedUser,
                        rejectAppro, rejectApproDesc, confInstallment, fields, createDate, updateDate,
                        archived, colunaFunilId
                      ]
                    )
                    novos++
                  }

                  totalOportunidades++

                } catch (error) {
                  console.error(`    ❌ Erro ao sincronizar oportunidade ${opp.id}:`, error)
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

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const stats = {
      totalFunis: funis.length,
      totalColunas,
      totalOportunidades,
      novos,
      atualizados,
      erros
    }

    console.log(`\n✅ Sincronização de oportunidades concluída em ${duration}s:`, stats)

    // Registrar histórico de sincronização
    await executeQuery(
      `INSERT INTO cron_sync_history (job_name, status, message, duration_ms, stats)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'oportunidades-sync',
        erros > 0 ? 'completed_with_errors' : 'success',
        `Sincronizados ${totalOportunidades} oportunidades (${novos} novos, ${atualizados} atualizados, ${erros} erros)`,
        Date.now() - startTime,
        JSON.stringify(stats)
      ]
    )

    return {
      success: true,
      message: `Sincronização concluída: ${totalOportunidades} oportunidades processadas`,
      stats
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro na sincronização de oportunidades:', error)

    // Registrar erro no histórico
    try {
      await executeQuery(
        `INSERT INTO cron_sync_history (job_name, status, message, error_details)
         VALUES (?, ?, ?, ?)`,
        [
          'oportunidades-sync',
          'error',
          'Erro na sincronização de oportunidades',
          errorMessage
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

