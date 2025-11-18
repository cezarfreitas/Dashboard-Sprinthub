import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { broadcastEvent } from '@/lib/sse'

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

// Função para salvar ou atualizar oportunidade no banco
async function saveOrUpdateOportunidade(opp: any): Promise<'inserted' | 'updated' | 'error'> {
  try {
    if (!opp.id) {
      return 'error'
    }

    // Mapear campos da API do SprintHub
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
    
    // Buscar coluna_funil_id baseado no crm_column se disponível
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
          archived, colunaFunilId, opp.id
        ]
      )
      return 'updated'
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
          opp.id, title, value, crmColumn, leadId, sequence, status, lossReason, gainReason,
          expectedCloseDate, saleChannel, campaign, user, lastColumnChange, lastStatusChange,
          gainDate, lostDate, reopenDate, awaitColumnApproved, awaitColumnApprovedUser,
          rejectAppro, rejectApproDesc, confInstallment, fields, dataLead, createDate, updateDate,
          archived, colunaFunilId
        ]
      )
      return 'inserted'
    }
  } catch (error) {
    return 'error'
  }
}

// GET - Buscar oportunidade da API SprintHub por ID e salvar/atualizar no banco
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const msgParam = searchParams.get('msg') // Parâmetro opcional de mensagem/status para exibir no badge
    // Pegar cor da URL (pode vir como #ff9900 ou ff9900)
    let corParam = searchParams.get('cor')
    // Se não encontrou, tentar pegar do hash da URL (caso venha como #cor=ff9900)
    if (!corParam) {
      const urlHash = new URL(request.url).hash
      if (urlHash) {
        const hashParams = new URLSearchParams(urlHash.substring(1))
        corParam = hashParams.get('cor')
      }
    }

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'ID da oportunidade é obrigatório',
          error: 'Parâmetro "id" não fornecido'
        },
        { status: 400 }
      )
    }

    const oportunidadeId = parseInt(id)
    if (isNaN(oportunidadeId) || oportunidadeId <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'ID inválido',
          error: 'O ID deve ser um número inteiro positivo'
        },
        { status: 400 }
      )
    }

    // Obter variáveis de ambiente
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Configuração da API não encontrada',
          error: 'Verifique as variáveis de ambiente APITOKEN, I e URLPATCH'
        },
        { status: 500 }
      )
    }

    // Buscar oportunidade na API do SprintHub
    const sprintHubUrl = `${urlPatch}/crmopportunity/${oportunidadeId}?i=${groupId}&apitoken=${apiToken}`
    
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Oportunidade não encontrada',
            error: `Nenhuma oportunidade encontrada com ID ${oportunidadeId} na API SprintHub`
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { 
          success: false, 
          message: `Erro na API SprintHub: ${response.status} ${response.statusText}`,
          error: 'Falha ao buscar oportunidade na API externa'
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Salvar ou atualizar no banco de dados
    const dbResult = await saveOrUpdateOportunidade(data)

    // Buscar informações do vendedor e unidade através do campo user
    let vendedorNome = 'Sem vendedor'
    let unidadeNome = 'Sem unidade'
    
    // Tentar extrair Filial do fields se disponível
    let filialFromFields: string | null = null
    if (data.fields) {
      try {
        const fields = typeof data.fields === 'string' ? JSON.parse(data.fields) : data.fields
        if (fields && typeof fields === 'object') {
          filialFromFields = fields.Filial || fields.filial || null
        }
      } catch {
        // Ignorar erro ao parsear fields
      }
    }
    
    if (data.user) {
      try {
        // Converter user para número se necessário
        const userId = typeof data.user === 'string' ? parseInt(data.user) : data.user
        
        if (!isNaN(userId) && userId > 0) {
          // Buscar vendedor e unidade relacionada através do user (vendedor_id)
          // Relacionamento: user (vendedor.id) -> vendedores.unidade_id -> unidades.id
          const vendedorResult = await executeQuery(
            `SELECT 
              v.id as vendedor_id,
              v.name, 
              v.lastName,
              v.unidade_id,
              COALESCE(u.nome, u.name) as unidade_nome,
              u.id as unidade_id
             FROM vendedores v
             LEFT JOIN unidades u ON v.unidade_id = u.id
             WHERE v.id = ?
             LIMIT 1`,
            [userId]
          ) as any[]
        
          if (vendedorResult.length > 0) {
            const v = vendedorResult[0]
            vendedorNome = v.name && v.lastName 
              ? `${v.name} ${v.lastName}`.trim()
              : v.name || 'Sem vendedor'
            
            // Se não houver unidade, tentar usar Filial do fields
            if (v.unidade_nome) {
              unidadeNome = v.unidade_nome
            } else if (filialFromFields) {
              // Usar Filial do fields quando não houver unidade
              unidadeNome = filialFromFields
            } else {
              // Fallback: mostrar nome do vendedor
              unidadeNome = vendedorNome
            }
          }
        }
      } catch {
        // Ignorar erro ao buscar vendedor/unidade
      }
    } else if (filialFromFields) {
      // Se não houver user, mas houver Filial no fields, usar Filial
      unidadeNome = filialFromFields
    }

    // Salvar no histórico de consultas
    try {
      // Se msgParam foi fornecido, usar ele no badge; senão mapear o status da oportunidade
      let statusParaBadge = 'open'
      
      if (msgParam) {
        // Se foi passado msg, usar diretamente (será exibido no badge)
        statusParaBadge = msgParam
      } else {
        // Se não foi passado msg, mapear o status da oportunidade
        const statusLower = String(data.status || '').toLowerCase()
        
        if (statusLower === 'gain' || statusLower === 'won' || statusLower === 'ganha' || statusLower === 'ganho') {
          statusParaBadge = 'gain'
        } else if (statusLower === 'lost' || statusLower === 'lose' || statusLower === 'perdida' || statusLower === 'perdido') {
          statusParaBadge = 'lost'
        } else if (statusLower === 'open' || statusLower === 'opened' || statusLower === 'aberta' || statusLower === 'criada') {
          statusParaBadge = 'open'
        }
      }

      // Validar e normalizar cor
      let corNormalizada = null
      if (corParam) {
        // Decodificar URL encoding se necessário (trata %23 como #)
        let cor = decodeURIComponent(String(corParam).trim())
        
        // Remover espaços
        cor = cor.replace(/\s+/g, '')
        
        // Se não começar com #, adicionar
        if (!cor.startsWith('#')) {
          cor = `#${cor}`
        }
        
        // Validar formato hex (3 ou 6 dígitos)
        // Aceita: #fff, #ffffff, #FF9900, etc.
        if (/^#[0-9A-F]{3}$/i.test(cor)) {
          // Expandir formato curto (#fff -> #ffffff)
          corNormalizada = `#${cor[1]}${cor[1]}${cor[2]}${cor[2]}${cor[3]}${cor[3]}`.toUpperCase()
        } else if (/^#[0-9A-F]{6}$/i.test(cor)) {
          corNormalizada = cor.toUpperCase()
        } else {
          // Se não for válido, descartar (não usar cor nomeada)
          corNormalizada = null
        }
      }

      // Converter data_criacao para formato MySQL
      const dataCriacaoMySQL = convertToMySQLDateTime(data.createDate || data.updateDate) || new Date().toISOString().slice(0, 19).replace('T', ' ')

      // Inserir na tabela de notificações
      await executeQuery(`
        INSERT INTO notificacao_oportunidades 
        (oportunidade_id, nome, valor, status, data_criacao, vendedor, unidade, cor, consultado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        data.id,
        data.title || 'Sem nome',
        typeof data.value === 'string' ? parseFloat(data.value || '0') : (data.value || 0),
        statusParaBadge,
        dataCriacaoMySQL,
        vendedorNome,
        unidadeNome,
        corNormalizada
      ])

      // Enviar evento SSE para atualizar o painel em tempo real
      broadcastEvent({
        type: 'nova_notificacao',
        data: {
          oportunidadeId: data.id,
          nome: data.title || 'Sem nome',
          valor: typeof data.value === 'string' ? parseFloat(data.value || '0') : (data.value || 0),
          status: statusParaBadge,
          vendedor: vendedorNome,
          unidade: unidadeNome,
          cor: corNormalizada
        }
      })
    } catch (historyError) {
      // Ignorar erro ao salvar histórico - não é crítico
    }

    // Retornar dados da API SprintHub com informação de sincronização
    return NextResponse.json({
      success: true,
      data: data,
      sync: {
        status: dbResult,
        message: dbResult === 'inserted' 
          ? 'Oportunidade inserida no banco de dados' 
          : dbResult === 'updated' 
          ? 'Oportunidade atualizada no banco de dados'
          : 'Erro ao salvar no banco de dados'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar oportunidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
