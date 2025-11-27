import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// ============================================
// INTERFACES E TIPOS
// ============================================

interface FilaV2Response {
  sucesso: boolean
  unidade?: {
    id: number
    nome: string
    dpto_gestao: number | null
  }
  vendedor_atribuido?: {
    vendedor_id: number
    nome: string
  } | null
  departamento?: number | null
  lead_id?: number
  lead_atualizado?: boolean
  lead_recuperado?: FilaV2LeadData
  antes?: {
    owner: number | null
    owner_nome: string | null
    userAccess: number[]
    departmentAccess: number[]
  }
  depois?: {
    owner: number
    owner_nome: string
    userAccess: number[]
    departmentAccess: number[]
  }
  resultado_put?: SprintHubResponse
  erro?: string
}

interface FilaV2VendedorFila {
  vendedor_id: number
  sequencia: number
}

interface FilaV2LeadData {
  id: number
  firstname?: string
  lastname?: string
  whatsapp?: string | null
  phone?: string | null
  mobile?: string | null
  filial?: string | null
  owner?: { id: number; name: string } | null
  userAccess?: number[]
  departmentAccess?: number[]
}

interface SprintHubResponse {
  success?: boolean
  data?: {
    lead?: FilaV2LeadData
    [key: string]: any
  }
  error?: string
  [key: string]: any
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const FILA_V2_CONFIG = {
  apiToken: process.env.APITOKEN || '',
  groupId: process.env.I || '',
  urlPatch: process.env.URLPATCH || ''
} as const

// ============================================
// NAMESPACE: FUNÇÕES AUXILIARES
// ============================================

namespace FilaV2Utils {
  /**
   * Parsear e processar fila de vendedores
   */
  export function processarFila(filaLeads: any): FilaV2VendedorFila[] | null {
    try {
      const parsed = typeof filaLeads === 'string' ? JSON.parse(filaLeads) : filaLeads
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return null
      }
      
      const filaAtiva = parsed
        .filter((item: any) => {
          // Aceitar tanto 'vendedor_id' quanto 'id' para compatibilidade
          const vendedorId = item?.vendedor_id || item?.id
          return vendedorId && !isNaN(Number(vendedorId))
        })
        .map((item: any) => ({
          vendedor_id: item.vendedor_id || item.id,
          sequencia: item.sequencia || 0
        }))
        .sort((a: any, b: any) => (a.sequencia || 0) - (b.sequencia || 0))
      
      return filaAtiva.length > 0 ? filaAtiva : null
    } catch {
      return null
    }
  }

  /**
   * Buscar próximo vendedor disponível (ativo e não ausente)
   */
  export async function buscarProximoVendedorDisponivel(
    filaAtiva: FilaV2VendedorFila[], 
    unidadeId: number
  ): Promise<{ vendedor_id: number; nome: string } | null> {
    if (!filaAtiva || filaAtiva.length === 0) {
      return null
    }

    const vendedorIds = filaAtiva.map(v => v.vendedor_id)
    const agora = new Date()
    const agoraISO = agora.toISOString().slice(0, 19).replace('T', ' ')
    
    // Buscar todos os vendedores ativos da fila de uma vez (otimização)
    const vendedoresResult = await executeQuery(
      `SELECT id, name FROM vendedores WHERE id IN (${vendedorIds.map(() => '?').join(',')}) AND ativo = 1`,
      vendedorIds
    ) as Array<{ id: number; name: string }>
    
    // Criar mapa de vendedores ativos
    const vendedoresAtivosMap = new Map(
      vendedoresResult.map(v => [v.id, v])
    )
    
    // Buscar ausências ativas de todos vendedores da fila de uma vez (otimização)
    const ausenciasResult = await executeQuery(
      `SELECT vendedor_id 
       FROM vendedores_ausencias 
       WHERE unidade_id = ? 
         AND vendedor_id IN (${vendedorIds.map(() => '?').join(',')})
         AND data_inicio <= ? 
         AND data_fim >= ?`,
      [unidadeId, ...vendedorIds, agoraISO, agoraISO]
    ) as Array<{ vendedor_id: number }>
    
    // Criar set de vendedores em ausência
    const vendedoresAusentesSet = new Set(
      ausenciasResult.map(a => a.vendedor_id)
    )
    
    // Procurar primeiro vendedor disponível (na ordem da fila)
    for (const item of filaAtiva) {
      const vendedorId = item.vendedor_id
      const vendedor = vendedoresAtivosMap.get(vendedorId)
      
      // Verificar se está ativo e não está ausente
      if (vendedor && !vendedoresAusentesSet.has(vendedorId)) {
        return {
          vendedor_id: vendedor.id,
          nome: vendedor.name
        }
      }
    }
    
    return null
  }

  /**
   * Rotacionar fila (move vendedor atribuído para o final)
   */
  export async function rotacionarFila(
    unidadeId: number, 
    filaAtiva: FilaV2VendedorFila[], 
    vendedorAtribuidoId: number
  ): Promise<void> {
    if (filaAtiva.length <= 1) {
      return
    }
    
    try {
      const indexVendedorAtribuido = filaAtiva.findIndex(v => v.vendedor_id === vendedorAtribuidoId)
      
      if (indexVendedorAtribuido === -1) {
        return
      }
      
      const vendedorAtribuido = filaAtiva[indexVendedorAtribuido]
      const novaFila = [
        ...filaAtiva.slice(0, indexVendedorAtribuido),
        ...filaAtiva.slice(indexVendedorAtribuido + 1),
        vendedorAtribuido
      ]
      
      const filaReordenada = novaFila.map((item, index) => ({
        ...item,
        sequencia: index + 1
      }))
      
      await executeQuery(
        'UPDATE unidades SET fila_leads = ? WHERE id = ?',
        [JSON.stringify(filaReordenada), unidadeId]
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * Consultar lead no SprintHub
   */
  export async function consultarLeadSprintHub(leadId: string): Promise<SprintHubResponse | null> {
    const { apiToken, groupId, urlPatch } = FILA_V2_CONFIG
    
    if (!apiToken || !groupId || !urlPatch) {
      throw new Error('Configuração da API não encontrada')
    }
    
    const url = `${urlPatch}/leads/${leadId}?allFields=1&apitoken=${apiToken}&i=${groupId}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/2.0'
      },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return null
    }
    
    return await response.json() as SprintHubResponse
  }

  /**
   * Registrar log de distribuição
   */
  export async function registrarLog(
    unidadeId: number, 
    vendedorId: number, 
    leadId: number, 
    totalFila: number,
    ownerAnterior: number | null,
    userAccessAnterior: string,
    departmentAccessAnterior: string
  ): Promise<void> {
    try {
      await executeQuery(
        `INSERT INTO fila_leads_log 
         (unidade_id, vendedor_id, lead_id, posicao_fila, total_fila, owner_anterior, user_access_anterior, department_access_anterior) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [unidadeId, vendedorId, leadId, 1, totalFila, ownerAnterior, userAccessAnterior, departmentAccessAnterior]
      )
    } catch (logError: any) {
      if (logError?.code === 'ER_BAD_FIELD_ERROR') {
        try {
          await executeQuery(
            'INSERT INTO fila_leads_log (unidade_id, vendedor_id, lead_id, posicao_fila, total_fila) VALUES (?, ?, ?, ?, ?)',
            [unidadeId, vendedorId, leadId, 1, totalFila]
          )
        } catch {
          await executeQuery(
            'INSERT INTO fila_leads_log (unidade_id, vendedor_id, posicao_fila, total_fila) VALUES (?, ?, ?, ?)',
            [unidadeId, vendedorId, 1, totalFila]
          )
        }
      } else {
        throw logError
      }
    }
  }

  /**
   * Atualizar lead no SprintHub
   */
  export async function atualizarLeadSprintHub(
    leadId: string,
    vendedorId: number,
    dptoGestao: number | null,
    leadDataAtual?: FilaV2LeadData,
    filial?: string | null
  ): Promise<SprintHubResponse> {
    const { apiToken, groupId, urlPatch } = FILA_V2_CONFIG
    
    if (!apiToken || !groupId || !urlPatch) {
      throw new Error('Configuração da API não encontrada')
    }
    
    const leadResponse = leadDataAtual ? null : await consultarLeadSprintHub(leadId)
    const lead = leadDataAtual || leadResponse?.data?.lead
    
    const whatsapp = lead?.whatsapp || lead?.phone || lead?.mobile || ''
    
    const updateData: Record<string, any> = {
      owner: vendedorId,
      userAccess: [vendedorId],
      departmentAccess: dptoGestao ? [dptoGestao] : [],
      whatsapp
    }
    
    if (lead?.firstname) updateData.firstname = lead.firstname
    if (lead?.lastname) updateData.lastname = lead.lastname
    if (filial) updateData.filial = filial
    
    const url = `${urlPatch}/leads/${leadId}?apitoken=${apiToken}&i=${groupId}`
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/2.0'
      },
      body: JSON.stringify(updateData),
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro ao atualizar lead: ${response.status} - ${errorText}`)
    }
    
    return await response.json() as SprintHubResponse
  }

  /**
   * Processar requisição (query params ou body JSON)
   */
  export async function processarRequisicao(request: NextRequest): Promise<{ unidadeIdParam: string | null; leadId: string | null }> {
    let unidadeIdParam: string | null = null
    let leadId: string | null = null

    try {
      const contentType = request.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const body = await request.json() as { unidade?: string; unidadeId?: string; idlead?: string; leadId?: string }
        unidadeIdParam = body.unidade || body.unidadeId || null
        leadId = body.idlead || body.leadId || null
      }
    } catch {
      // Continuar com query params se body não for válido
    }

    if (!unidadeIdParam || !leadId) {
      const { searchParams } = new URL(request.url)
      unidadeIdParam = unidadeIdParam || searchParams.get('unidade')
      leadId = leadId || searchParams.get('idlead')
    }

    return { unidadeIdParam, leadId }
  }

  /**
   * Validar e parsear IDs
   */
  export function validarIds(unidadeIdParam: string | null, leadId: string | null): { unidadeId: number; leadIdNum: number } | null {
    if (!unidadeIdParam || !leadId) {
      return null
    }

    const leadIdLimpo = leadId.replace(/\{contactfield=id\}/gi, '').trim()
    const unidadeId = parseInt(unidadeIdParam, 10)
    const leadIdNum = parseInt(leadIdLimpo, 10)
    
    if (isNaN(unidadeId) || unidadeId <= 0 || isNaN(leadIdNum) || leadIdNum <= 0) {
      return null
    }

    return { unidadeId, leadIdNum }
  }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function processarFilaV2(request: NextRequest): Promise<NextResponse<FilaV2Response>> {
  const startTime = Date.now()
  
  const { unidadeIdParam, leadId } = await FilaV2Utils.processarRequisicao(request)

  if (!unidadeIdParam) {
    return NextResponse.json(
      { sucesso: false, erro: 'Parâmetro "unidade" é obrigatório' } as FilaV2Response,
      { status: 400 }
    )
  }

  if (!leadId) {
    return NextResponse.json(
      { sucesso: false, erro: 'Parâmetro "idlead" é obrigatório' } as FilaV2Response,
      { status: 400 }
    )
  }

  const ids = FilaV2Utils.validarIds(unidadeIdParam, leadId)
  if (!ids) {
    return NextResponse.json(
      { sucesso: false, erro: 'IDs inválidos' } as FilaV2Response,
      { status: 400 }
    )
  }

  const { unidadeId, leadIdNum } = ids

  try {
    // Buscar unidade e próximo vendedor
    const unidadeResult = await executeQuery(`
      SELECT 
        u.id, 
        u.name as nome,
        u.dpto_gestao,
        u.fila_leads
      FROM unidades u
      WHERE u.id = ? AND u.ativo = 1
      LIMIT 1
    `, [unidadeId]) as Array<{ id: number; nome: string; dpto_gestao: number | null; fila_leads: any }>
    
    if (unidadeResult.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Unidade não encontrada ou inativa' } as FilaV2Response,
        { status: 404 }
      )
    }

    const unidade = unidadeResult[0]
    const filaAtiva = FilaV2Utils.processarFila(unidade.fila_leads)
    
    if (!filaAtiva || filaAtiva.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum vendedor disponível na fila desta unidade' } as FilaV2Response,
        { status: 404 }
      )
    }

    // Buscar próximo vendedor disponível (ativo e não ausente)
    const proximoFila = await FilaV2Utils.buscarProximoVendedorDisponivel(filaAtiva, unidadeId)
    
    if (!proximoFila) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum vendedor disponível na fila desta unidade (todos inativos ou ausentes)' } as FilaV2Response,
        { status: 404 }
      )
    }

    // Consultar estado anterior do lead
    let dadosAntes: { owner: number | null; owner_nome: string | null; userAccess: number[]; departmentAccess: number[] } | null = null
    let leadAntes: FilaV2LeadData | null = null
    
    try {
      const leadData = await FilaV2Utils.consultarLeadSprintHub(String(leadIdNum))
      if (leadData?.data?.lead) {
        leadAntes = leadData.data.lead
        dadosAntes = {
          owner: leadAntes.owner?.id || null,
          owner_nome: leadAntes.owner?.name || null,
          userAccess: Array.isArray(leadAntes.userAccess) ? leadAntes.userAccess : [],
          departmentAccess: Array.isArray(leadAntes.departmentAccess) ? leadAntes.departmentAccess : []
        }
      }
    } catch {
      // Continua mesmo se não conseguir consultar
    }

    // Atualizar lead no SprintHub
    let leadAtualizado = false
    let resultadoPut: SprintHubResponse | null = null
    let dadosDepois: { owner: number; owner_nome: string; userAccess: number[]; departmentAccess: number[] } | null = null
    
    try {
      resultadoPut = await FilaV2Utils.atualizarLeadSprintHub(
        String(leadIdNum), 
        proximoFila.vendedor_id, 
        unidade.dpto_gestao,
        leadAntes || undefined,
        unidade.nome
      )
      leadAtualizado = true
      
      dadosDepois = {
        owner: proximoFila.vendedor_id,
        owner_nome: proximoFila.nome,
        userAccess: [proximoFila.vendedor_id],
        departmentAccess: unidade.dpto_gestao ? [unidade.dpto_gestao] : []
      }
      
      // Registrar log
      try {
        const ownerAnterior = dadosAntes?.owner || null
        const userAccessAnterior = JSON.stringify(dadosAntes?.userAccess || [])
        const departmentAccessAnterior = JSON.stringify(dadosAntes?.departmentAccess || [])
        
        await FilaV2Utils.registrarLog(
          unidadeId, 
          proximoFila.vendedor_id, 
          leadIdNum, 
          filaAtiva.length,
          ownerAnterior,
          userAccessAnterior,
          departmentAccessAnterior
        )
      } catch {
        // Não impede o fluxo
      }
      
      // Rodar a fila (não-bloqueante)
      try {
        await FilaV2Utils.rotacionarFila(unidadeId, filaAtiva, proximoFila.vendedor_id)
      } catch {
        // Não impede o fluxo
      }
      
    } catch (updateError: unknown) {
      const errorMessage = updateError instanceof Error ? updateError.message : 'Erro desconhecido'
      return NextResponse.json(
        { 
          sucesso: false, 
          erro: `Erro ao atualizar lead: ${errorMessage}` 
        } as FilaV2Response,
        { status: 500 }
      )
    }

    // Preparar resposta
    const response: FilaV2Response = {
      sucesso: true,
      unidade: {
        id: unidade.id,
        nome: unidade.nome,
        dpto_gestao: unidade.dpto_gestao
      },
      lead_id: leadIdNum,
      vendedor_atribuido: proximoFila,
      departamento: unidade.dpto_gestao,
      lead_atualizado: leadAtualizado
    }

    if (leadAntes) {
      response.lead_recuperado = leadAntes
    }

    if (dadosAntes) {
      response.antes = dadosAntes
    }
    
    if (dadosDepois) {
      response.depois = dadosDepois
    }

    if (resultadoPut) {
      response.resultado_put = resultadoPut
    }

    return NextResponse.json(response)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { sucesso: false, erro: `Erro interno do servidor: ${errorMessage}` } as FilaV2Response,
      { status: 500 }
    )
  }
}

// ============================================
// ROUTE HANDLERS
// ============================================

// GET/POST - Distribuir lead automaticamente
export async function GET(request: NextRequest) {
  return await processarFilaV2(request)
}

export async function POST(request: NextRequest) {
  return await processarFilaV2(request)
}

// PUT - Método legado (mantido para compatibilidade)
export async function PUT(request: NextRequest) {
  const { unidadeIdParam, leadId } = await FilaV2Utils.processarRequisicao(request)

  if (!unidadeIdParam) {
    return NextResponse.json(
      { sucesso: false, erro: 'Parâmetro "unidade" é obrigatório' } as FilaV2Response,
      { status: 400 }
    )
  }

  if (!leadId) {
    return NextResponse.json(
      { sucesso: false, erro: 'Parâmetro "idlead" é obrigatório' } as FilaV2Response,
      { status: 400 }
    )
  }

  const ids = FilaV2Utils.validarIds(unidadeIdParam, leadId)
  if (!ids) {
    return NextResponse.json(
      { sucesso: false, erro: 'IDs inválidos' } as FilaV2Response,
      { status: 400 }
    )
  }

  const { unidadeId, leadIdNum } = ids

  try {
    const unidadeResult = await executeQuery(
      'SELECT id, name as nome, dpto_gestao, fila_leads FROM unidades WHERE id = ? AND ativo = 1 LIMIT 1',
      [unidadeId]
    ) as Array<{ id: number; nome: string; dpto_gestao: number | null; fila_leads: any }>

    if (unidadeResult.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Unidade não encontrada ou inativa' } as FilaV2Response,
        { status: 404 }
      )
    }

    const unidade = unidadeResult[0]
    const filaAtiva = FilaV2Utils.processarFila(unidade.fila_leads)

    if (!filaAtiva || filaAtiva.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum vendedor disponível na fila' } as FilaV2Response,
        { status: 404 }
      )
    }

    // Buscar próximo vendedor disponível (ativo e não ausente)
    const proximoFila = await FilaV2Utils.buscarProximoVendedorDisponivel(filaAtiva, unidadeId)
    
    if (!proximoFila) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum vendedor disponível na fila (todos inativos ou ausentes)' } as FilaV2Response,
        { status: 404 }
      )
    }
    
    const result = await FilaV2Utils.atualizarLeadSprintHub(String(leadIdNum), proximoFila.vendedor_id, unidade.dpto_gestao, undefined, unidade.nome)

    return NextResponse.json({
      sucesso: true,
      lead_id: leadIdNum,
      vendedor_atribuido: proximoFila,
      departamento: unidade.dpto_gestao,
      resultado_put: result
    } as FilaV2Response)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { sucesso: false, erro: `Erro interno do servidor: ${errorMessage}` } as FilaV2Response,
      { status: 500 }
    )
  }
}
