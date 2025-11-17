import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

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
  lead_recuperado?: any
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
  resultado_put?: any
  erro?: string
}

interface VendedorFila {
  vendedor_id: number
  sequencia: number
}

interface LeadData {
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

// Cache de variáveis de ambiente (carregadas uma vez)
const ENV_CONFIG = {
  apiToken: process.env.APITOKEN,
  groupId: process.env.I,
  urlPatch: process.env.URLPATCH
}

// Função auxiliar para parsear e processar fila
function processarFila(filaLeads: any): VendedorFila[] | null {
  try {
    const parsed = typeof filaLeads === 'string' ? JSON.parse(filaLeads) : filaLeads
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null
    }
    
    const filaAtiva = parsed
      .filter((item: any) => item?.vendedor_id)
      .sort((a: any, b: any) => (a.sequencia || 0) - (b.sequencia || 0))
    
    return filaAtiva.length > 0 ? filaAtiva : null
  } catch {
    return null
  }
}

// Função auxiliar para rodar a fila
async function rotacionarFila(unidadeId: number, filaAtiva: VendedorFila[]): Promise<void> {
  if (filaAtiva.length <= 1) {
    return
  }
  
  try {
    const primeiroVendedor = filaAtiva[0]
    const novaFila = [...filaAtiva.slice(1), primeiroVendedor]
    
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

// Função auxiliar para consultar lead no SprintHub
async function consultarLeadSprintHub(leadId: string): Promise<any> {
  const { apiToken, groupId, urlPatch } = ENV_CONFIG
  
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
  
  return await response.json()
}

// Função auxiliar para registrar log
async function registrarLog(
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

// Função auxiliar para atualizar lead no SprintHub
async function atualizarLeadSprintHub(
  leadId: string,
  vendedorId: number,
  dptoGestao: number | null,
  leadDataAtual?: LeadData,
  filial?: string | null
): Promise<any> {
  const { apiToken, groupId, urlPatch } = ENV_CONFIG
  
  if (!apiToken || !groupId || !urlPatch) {
    throw new Error('Configuração da API não encontrada')
  }
  
  const lead = leadDataAtual || (await consultarLeadSprintHub(leadId))?.data?.lead as LeadData | undefined
  
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
  
  return await response.json()
}

// Função auxiliar para processar requisição (query params ou body JSON)
async function processarRequisicao(request: NextRequest): Promise<{ unidadeIdParam: string | null; leadId: string | null }> {
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

// Função auxiliar para validar e parsear IDs
function validarIds(unidadeIdParam: string | null, leadId: string | null): { unidadeId: number; leadIdNum: number } | null {
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

// Função principal para processar fila V2
async function processarFilaV2(request: NextRequest): Promise<NextResponse<FilaV2Response>> {
  const startTime = Date.now()
  
  const { unidadeIdParam, leadId } = await processarRequisicao(request)

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

  const ids = validarIds(unidadeIdParam, leadId)
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
    const filaAtiva = processarFila(unidade.fila_leads)
    
    if (!filaAtiva || filaAtiva.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum vendedor disponível na fila desta unidade' } as FilaV2Response,
        { status: 404 }
      )
    }

    const proximoVendedorId = filaAtiva[0].vendedor_id
    
    // Buscar informações do vendedor
    const vendedorResult = await executeQuery(
      'SELECT id, name FROM vendedores WHERE id = ? AND ativo = 1 LIMIT 1',
      [proximoVendedorId]
    ) as Array<{ id: number; name: string }>
    
    if (vendedorResult.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Vendedor da fila não encontrado ou inativo' } as FilaV2Response,
        { status: 404 }
      )
    }

    const vendedor = vendedorResult[0]
    const proximoFila = {
      vendedor_id: vendedor.id,
      nome: vendedor.name
    }

    // Consultar estado anterior do lead
    let dadosAntes: { owner: number | null; owner_nome: string | null; userAccess: number[]; departmentAccess: number[] } | null = null
    let leadAntes: LeadData | null = null
    
    try {
      const leadData = await consultarLeadSprintHub(String(leadIdNum))
      if (leadData?.data?.lead) {
        leadAntes = leadData.data.lead as LeadData
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
    let resultadoPut: any = null
    let dadosDepois: { owner: number; owner_nome: string; userAccess: number[]; departmentAccess: number[] } | null = null
    
    try {
      resultadoPut = await atualizarLeadSprintHub(
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
        
        await registrarLog(
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
        await rotacionarFila(unidadeId, filaAtiva)
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

// GET/POST - Distribuir lead automaticamente
export async function GET(request: NextRequest) {
  return await processarFilaV2(request)
}

export async function POST(request: NextRequest) {
  return await processarFilaV2(request)
}

// PUT - Método legado (mantido para compatibilidade)
export async function PUT(request: NextRequest) {
  const { unidadeIdParam, leadId } = await processarRequisicao(request)

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

  const ids = validarIds(unidadeIdParam, leadId)
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
    const filaAtiva = processarFila(unidade.fila_leads)

    if (!filaAtiva || filaAtiva.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum vendedor disponível na fila' } as FilaV2Response,
        { status: 404 }
      )
    }

    const proximoVendedorId = filaAtiva[0].vendedor_id
    
    // Buscar nome do vendedor
    const vendedorResult = await executeQuery(
      'SELECT id, name FROM vendedores WHERE id = ? AND ativo = 1 LIMIT 1',
      [proximoVendedorId]
    ) as Array<{ id: number; name: string }>
    
    const vendedorNome = vendedorResult.length > 0 ? vendedorResult[0].name : 'Desconhecido'
    
    const result = await atualizarLeadSprintHub(String(leadIdNum), proximoVendedorId, unidade.dpto_gestao, undefined, unidade.nome)

    return NextResponse.json({
      sucesso: true,
      lead_id: leadIdNum,
      vendedor_atribuido: {
        vendedor_id: proximoVendedorId,
        nome: vendedorNome
      },
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
