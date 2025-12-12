import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para converter data ISO para formato MySQL
function convertToMySQLDateTime(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null
  try {
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 19).replace('T', ' ')
  } catch {
    return null
  }
}

/**
 * GET /api/oportunidades/[id]
 * 
 * Consulta uma oportunidade específica na API do SprintHub
 * e retorna o JSON completo da resposta.
 * 
 * @param id - ID da oportunidade no CRM (ex: 47854, 13312)
 * 
 * @example
 * GET /api/oportunidades/47854
 * GET /api/oportunidades/13312
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguardar params (Next.js 15+)
    const { id } = await params

    // Validar ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID da oportunidade inválido',
          error: 'O ID deve ser um número válido'
        },
        { status: 400 }
      )
    }

    // Configurações da API SprintHub
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      return NextResponse.json(
        {
          success: false,
          message: 'Configuração da API não encontrada',
          error: 'Variáveis de ambiente APITOKEN, I ou URLPATCH não configuradas'
        },
        { status: 500 }
      )
    }

    // Construir URL da API externa
    // Formato: {{urlpatch}}/crmopportunity/{{id}}?i={{i}}&apitoken={{apitoken}}
    const sprintHubUrl = `${urlPatch}/crmopportunity/${id}?i=${groupId}&apitoken=${apiToken}`

    console.log(`🔍 Consultando oportunidade ${id}...`)
    console.log(`🌐 URL: ${sprintHubUrl.replace(apiToken, '***')}`)

    // Fazer requisição à API do SprintHub
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      }
    })

    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erro na API SprintHub: ${response.status} ${response.statusText}`)
      console.error(`📄 Resposta:`, errorText.substring(0, 500))

      return NextResponse.json(
        {
          success: false,
          message: `Erro ao consultar oportunidade ${id}`,
          error: `API SprintHub retornou status ${response.status}: ${response.statusText}`,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      )
    }

    // Obter JSON da resposta
    const data = await response.json()

    console.log(`✅ Oportunidade ${id} consultada com sucesso`)
    console.log(`📦 Dados recebidos:`, JSON.stringify(data).substring(0, 200))

    // Verificar se existe no banco de dados local
    const existingInDb = await executeQuery(
      'SELECT id, title, value, status, created_at FROM oportunidades WHERE id = ? LIMIT 1',
      [id]
    ) as any[]

    const existsInDatabase = existingInDb.length > 0
    const databaseStatus = existsInDatabase ? 'exists' : 'not_found'

    if (existsInDatabase) {
      console.log(`💾 Oportunidade ${id} encontrada no banco local`)
    } else {
      console.log(`⚠️ Oportunidade ${id} NÃO encontrada no banco local`)
    }

    // Retornar o JSON completo da API + status do banco
    return NextResponse.json({
      success: true,
      message: `Oportunidade ${id} consultada com sucesso`,
      data: data,
      database: {
        status: databaseStatus,
        exists: existsInDatabase,
        record: existingInDb[0] || null
      }
    })

  } catch (error) {
    console.error('❌ Erro ao consultar oportunidade:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao consultar oportunidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/oportunidades/[id]
 * 
 * Consulta uma oportunidade na API do SprintHub e insere/atualiza
 * no banco de dados local seguindo o padrão da tabela oportunidades.
 * 
 * @param id - ID da oportunidade no CRM (ex: 47854, 13312)
 * 
 * @example
 * POST /api/oportunidades/47854
 * POST /api/oportunidades/13312
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguardar params (Next.js 15+)
    const { id } = await params

    // Validar ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID da oportunidade inválido',
          error: 'O ID deve ser um número válido'
        },
        { status: 400 }
      )
    }

    // Configurações da API SprintHub
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      return NextResponse.json(
        {
          success: false,
          message: 'Configuração da API não encontrada',
          error: 'Variáveis de ambiente APITOKEN, I ou URLPATCH não configuradas'
        },
        { status: 500 }
      )
    }

    // Construir URL da API externa
    const sprintHubUrl = `${urlPatch}/crmopportunity/${id}?i=${groupId}&apitoken=${apiToken}`

    console.log(`🔍 Consultando oportunidade ${id} para inserir/atualizar...`)
    console.log(`🌐 URL: ${sprintHubUrl.replace(apiToken, '***')}`)

    // Fazer requisição à API do SprintHub
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      }
    })

    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erro na API SprintHub: ${response.status} ${response.statusText}`)
      console.error(`📄 Resposta:`, errorText.substring(0, 500))

      return NextResponse.json(
        {
          success: false,
          message: `Erro ao consultar oportunidade ${id}`,
          error: `API SprintHub retornou status ${response.status}: ${response.statusText}`,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      )
    }

    // Obter JSON da resposta
    const opp = await response.json()

    console.log(`✅ Oportunidade ${id} consultada com sucesso`)
    console.log(`📦 Dados recebidos:`, JSON.stringify(opp).substring(0, 200))

    // Mapear campos da API para o formato do banco de dados
    const title = opp.title || 'Sem título'
    const value = typeof opp.value === 'string' ? parseFloat(opp.value || '0') : (opp.value || 0)
    const crmColumn = opp.crm_column || null
    const leadId = opp.lead_id || null
    const sequence = opp.sequence !== undefined ? opp.sequence : null
    const status = opp.status || null
    
    // Extrair apenas o ID se loss_reason for um objeto, senão usar o valor direto
    let lossReason: string | number | null = null
    if (opp.loss_reason) {
      if (typeof opp.loss_reason === 'object' && opp.loss_reason.id) {
        lossReason = String(opp.loss_reason.id)
      } else if (typeof opp.loss_reason === 'string' || typeof opp.loss_reason === 'number') {
        let value = String(opp.loss_reason).trim()
        if (value.startsWith('Motivo ')) {
          value = value.replace(/^Motivo\s+/, '')
        }
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
    
    // Determinar coluna_funil_id baseado no crm_column
    let colunaFunilId = null
    if (crmColumn) {
      const colunaResult = await executeQuery(
        'SELECT id FROM colunas_funil WHERE id = ? LIMIT 1',
        [crmColumn]
      ) as any[]
      
      if (colunaResult.length > 0) {
        colunaFunilId = colunaResult[0].id
      }
    }

    // Verificar se a oportunidade já existe no banco
    const existing = await executeQuery(
      'SELECT id FROM oportunidades WHERE id = ?',
      [id]
    ) as any[]

    let operation = ''

    if (existing.length > 0) {
      // Atualizar oportunidade existente
      console.log(`🔄 Atualizando oportunidade ${id} no banco...`)
      
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
          archived, colunaFunilId, id
        ]
      )
      
      operation = 'updated'
      console.log(`✅ Oportunidade ${id} atualizada com sucesso`)
      
    } else {
      // Inserir nova oportunidade
      console.log(`➕ Inserindo nova oportunidade ${id} no banco...`)
      
      await executeQuery(
        `INSERT INTO oportunidades 
         (id, title, value, crm_column, lead_id, sequence, status, loss_reason, gain_reason,
          expectedCloseDate, sale_channel, campaign, user, last_column_change, last_status_change,
          gain_date, lost_date, reopen_date, await_column_approved, await_column_approved_user,
          reject_appro, reject_appro_desc, conf_installment, fields, dataLead, createDate, updateDate,
          archived, coluna_funil_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id, title, value, crmColumn, leadId, sequence, status, lossReason, gainReason,
          expectedCloseDate, saleChannel, campaign, user, lastColumnChange, lastStatusChange,
          gainDate, lostDate, reopenDate, awaitColumnApproved, awaitColumnApprovedUser,
          rejectAppro, rejectApproDesc, confInstallment, fields, dataLead, createDate, updateDate,
          archived, colunaFunilId
        ]
      )
      
      operation = 'inserted'
      console.log(`✅ Oportunidade ${id} inserida com sucesso`)
    }

    // Buscar dados atualizados do banco para confirmar
    const savedData = await executeQuery(
      'SELECT * FROM oportunidades WHERE id = ? LIMIT 1',
      [id]
    ) as any[]

    return NextResponse.json({
      success: true,
      message: `Oportunidade ${id} ${operation === 'inserted' ? 'inserida' : 'atualizada'} com sucesso`,
      operation: operation,
      data: {
        api: opp,
        database: savedData[0] || null
      }
    })

  } catch (error) {
    console.error('❌ Erro ao inserir/atualizar oportunidade:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao inserir/atualizar oportunidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
