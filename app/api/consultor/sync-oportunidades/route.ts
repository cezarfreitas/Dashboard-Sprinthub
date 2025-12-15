import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos

// Rate limiter - 50 req/min = 1 req a cada 1.2 segundos
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class RateLimiter {
  private requests: number[] = []
  private maxRequests = 50
  private timeWindow = 60000 // 1 minuto em ms

  async waitIfNeeded() {
    const now = Date.now()
    
    // Remover requisições antigas (fora da janela de 1 minuto)
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    // Se atingiu o limite, aguardar
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.timeWindow - (now - oldestRequest) + 100 // +100ms de segurança
      console.log(`      ⏳ Rate limit: aguardando ${Math.round(waitTime / 1000)}s...`)
      await sleep(waitTime)
      this.requests = [] // Limpar após esperar
    }
    
    // Registrar esta requisição
    this.requests.push(Date.now())
  }
}

// Converter data ISO para formato MySQL
const convertToMySQLDateTime = (isoDate: string | null | undefined): string | null => {
  if (!isoDate) return null
  try {
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 19).replace('T', ' ')
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    console.log(`🔄 Iniciando sincronização de oportunidades para o usuário ${userId}...`)

    // Buscar variáveis de ambiente
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      const missingVars = []
      if (!apiToken) missingVars.push('APITOKEN')
      if (!groupId) missingVars.push('I')
      if (!urlPatch) missingVars.push('URLPATCH')
      
      throw new Error(`Variáveis de ambiente faltando: ${missingVars.join(', ')}. Configure no arquivo .env`)
    }

    // Primeiro, buscar todos os funis e suas colunas
    const { executeQuery } = await import('@/lib/database')
    
    const funis = await executeQuery('SELECT id FROM funis ORDER BY id') as any[]
    
    if (funis.length === 0) {
      throw new Error('Nenhum funil encontrado. Execute a sincronização de funis primeiro.')
    }

    console.log(`📊 ${funis.length} funis encontrados para sincronização`)
    
    const rateLimiter = new RateLimiter()
    let todasOportunidades: any[] = []

    // Buscar oportunidades de cada funil (por colunas) com paginação
    for (const funil of funis) {
      const startFunil = Date.now()
      console.log(`📡 Processando funil ${funil.id}...`)
      
      // Buscar colunas deste funil
      const colunas = await executeQuery(
        'SELECT id, nome_coluna FROM colunas_funil WHERE id_funil = ? ORDER BY sequencia',
        [funil.id]
      ) as any[]
      
      if (colunas.length === 0) {
        console.log(`  ⚠️ Nenhuma coluna encontrada no funil ${funil.id}`)
        continue
      }
      
      console.log(`  📋 ${colunas.length} colunas encontradas`)
      
      // Processar cada coluna
      for (const coluna of colunas) {
        
        let page = 0
        let hasMorePages = true

        while (hasMorePages) {
          const apiUrl = `${urlPatch}/crm/opportunities/${funil.id}?apitoken=${apiToken}&i=${groupId}`
          
          const payload = {
            filterByUsers: [parseInt(userId.toString())],
            filterByStatus: ['open', 'gain', 'lost'],
            filters: [],
            search: '',
            page: page,
            limit: 100,
            columnId: coluna.id,
            onlyArchived: false,
            searchBy: 'opportunity'
          }

          // Rate limiting: aguardar se necessário (50 req/min)
          await rateLimiter.waitIfNeeded()

          let response
          let retries = 3
          let lastError

          // Tentar até 3 vezes em caso de erro de rede
          while (retries > 0) {
            try {
              response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'CRM-by-INTELI/1.0',
                  'i': groupId,
                  'api': apiToken
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(30000) // Timeout de 30 segundos
              })
              break // Sucesso, sair do loop
            } catch (error: any) {
              lastError = error
              retries--
              if (retries > 0) {
                console.log(`      ⚠️ Erro de rede, tentando novamente (${3 - retries}/3)...`)
                await sleep(2000) // Aguardar 2 segundos antes de retry
              }
            }
          }

          if (!response) {
            console.error(`      ❌ Falha após 3 tentativas:`, lastError.message)
            break
          }

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`      ❌ Erro ${response.status}: ${errorText.substring(0, 200)}`)
            break
          }

          const colunaData = await response.json()
          const oportunidades = colunaData.opportunities || colunaData || []
          
          if (oportunidades.length > 0) {
            console.log(`      ✅ ${oportunidades.length} oportunidades`)
          }
          
          if (oportunidades.length === 0) {
            hasMorePages = false
          } else {
            todasOportunidades = todasOportunidades.concat(oportunidades)
            page++
            
            if (oportunidades.length < 100) {
              hasMorePages = false
            }
          }
        }
      }
    }

    console.log(`📦 Total de ${todasOportunidades.length} oportunidades encontradas para o usuário ${userId}`)

    let criadas = 0
    let atualizadas = 0
    let erros = 0

    for (const opp of todasOportunidades) {
      try {
        // Verificar se já existe
        const existing = await executeQuery(
          'SELECT id FROM oportunidades WHERE id = ?',
          [opp.id]
        ) as any[]

        const oppData = {
          id: opp.id,
          title: opp.title || 'Sem título',
          value: typeof opp.value === 'string' ? parseFloat(opp.value || '0') : (opp.value || 0),
          crm_column: opp.crm_column || null,
          lead_id: opp.lead_id || null,
          sequence: opp.sequence !== undefined ? opp.sequence : null,
          status: opp.status || null,
          loss_reason: opp.loss_reason ? 
            (typeof opp.loss_reason === 'object' && opp.loss_reason.id ? 
              String(opp.loss_reason.id) : 
              String(opp.loss_reason)) : null,
          gain_reason: opp.gain_reason || null,
          expectedCloseDate: convertToMySQLDateTime(opp.expectedCloseDate),
          sale_channel: opp.sale_channel || null,
          campaign: opp.campaign || null,
          user: opp.user ? String(opp.user) : null,
          last_column_change: convertToMySQLDateTime(opp.last_column_change),
          last_status_change: convertToMySQLDateTime(opp.last_status_change),
          gain_date: convertToMySQLDateTime(opp.gain_date),
          lost_date: convertToMySQLDateTime(opp.lost_date),
          reopen_date: convertToMySQLDateTime(opp.reopen_date),
          await_column_approved: opp.await_column_approved ? 1 : 0,
          await_column_approved_user: opp.await_column_approved_user || null,
          reject_appro: opp.reject_appro ? 1 : 0,
          reject_appro_desc: opp.reject_appro_desc || null,
          conf_installment: opp.conf_installment ? JSON.stringify(opp.conf_installment) : null,
          fields: opp.fields ? JSON.stringify(opp.fields) : null,
          dataLead: opp.dataLead ? JSON.stringify(opp.dataLead) : null,
          createDate: convertToMySQLDateTime(opp.createDate),
          updateDate: convertToMySQLDateTime(opp.updateDate),
          archived: opp.archived ? 1 : 0
        }

        // O crm_column já é o ID da coluna
        const colunaFunilId = opp.crm_column || null

        if (existing.length > 0) {
          // Atualizar
          const result = await executeQuery(
            `UPDATE oportunidades SET
              title = ?, value = ?, crm_column = ?, lead_id = ?, sequence = ?,
              status = ?, loss_reason = ?, gain_reason = ?, expectedCloseDate = ?,
              sale_channel = ?, campaign = ?, user = ?, last_column_change = ?,
              last_status_change = ?, gain_date = ?, lost_date = ?, reopen_date = ?,
              await_column_approved = ?, await_column_approved_user = ?, reject_appro = ?,
              reject_appro_desc = ?, conf_installment = ?, fields = ?, dataLead = ?,
              createDate = ?, updateDate = ?, archived = ?, coluna_funil_id = ?
            WHERE id = ?`,
            [
              oppData.title, oppData.value, oppData.crm_column, oppData.lead_id, oppData.sequence,
              oppData.status, oppData.loss_reason, oppData.gain_reason, oppData.expectedCloseDate,
              oppData.sale_channel, oppData.campaign, oppData.user, oppData.last_column_change,
              oppData.last_status_change, oppData.gain_date, oppData.lost_date, oppData.reopen_date,
              oppData.await_column_approved, oppData.await_column_approved_user, oppData.reject_appro,
              oppData.reject_appro_desc, oppData.conf_installment, oppData.fields, oppData.dataLead,
              oppData.createDate, oppData.updateDate, oppData.archived, colunaFunilId,
              oppData.id
            ]
          ) as any
          atualizadas++
        } else {
          // Criar
          await executeQuery(
            `INSERT INTO oportunidades (
              id, title, value, crm_column, lead_id, sequence, status, loss_reason,
              gain_reason, expectedCloseDate, sale_channel, campaign, user,
              last_column_change, last_status_change, gain_date, lost_date, reopen_date,
              await_column_approved, await_column_approved_user, reject_appro, reject_appro_desc,
              conf_installment, fields, dataLead, createDate, updateDate, archived, coluna_funil_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              oppData.id, oppData.title, oppData.value, oppData.crm_column, oppData.lead_id,
              oppData.sequence, oppData.status, oppData.loss_reason, oppData.gain_reason,
              oppData.expectedCloseDate, oppData.sale_channel, oppData.campaign, oppData.user,
              oppData.last_column_change, oppData.last_status_change, oppData.gain_date,
              oppData.lost_date, oppData.reopen_date, oppData.await_column_approved,
              oppData.await_column_approved_user, oppData.reject_appro, oppData.reject_appro_desc,
              oppData.conf_installment, oppData.fields, oppData.dataLead, oppData.createDate,
              oppData.updateDate, oppData.archived, colunaFunilId
            ]
          )
          criadas++
        }
      } catch (error) {
        console.error(`Erro ao processar oportunidade ${opp.id}:`, error)
        erros++
      }
    }

    console.log(`\n📊 RESUMO DA SINCRONIZAÇÃO:`)
    console.log(`   Total de oportunidades encontradas: ${todasOportunidades.length}`)
    console.log(`   ➕ Criadas: ${criadas}`)
    console.log(`   ✏️  Atualizadas: ${atualizadas}`)
    console.log(`   ❌ Erros: ${erros}`)
    console.log(`✅ Sincronização concluída!\n`)

    return NextResponse.json({
      success: true,
      message: `${criadas} criadas, ${atualizadas} atualizadas de ${todasOportunidades.length} oportunidades`,
      stats: {
        total: todasOportunidades.length,
        criadas,
        atualizadas,
        erros
      }
    })

  } catch (error) {
    console.error('Erro ao sincronizar oportunidades do usuário:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao sincronizar oportunidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

