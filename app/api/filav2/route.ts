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

// Cache de variáveis de ambiente (carregadas uma vez)
const ENV_CONFIG = {
  apiToken: process.env.APITOKEN,
  groupId: process.env.I,
  urlPatch: process.env.URLPATCH
}

// Função auxiliar para parsear e processar fila
function processarFila(filaLeads: any) {
  try {
    const parsed = typeof filaLeads === 'string' ? JSON.parse(filaLeads) : filaLeads
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null
    }
    
    // Filtrar e ordenar em uma única operação
    const filaAtiva = parsed
      .filter((item: any) => item?.vendedor_id)
      .sort((a: any, b: any) => (a.sequencia || 0) - (b.sequencia || 0))
    
    return filaAtiva.length > 0 ? filaAtiva : null
  } catch (e) {
    console.error('[FilaV2] ⚠️ Erro ao processar fila:', e)
    return null
  }
}

// Função auxiliar para rodar a fila
async function rotacionarFila(unidadeId: number, filaAtiva: any[]) {
  if (filaAtiva.length <= 1) {
    return // Não há necessidade de rodar fila com 1 ou menos vendedores
  }
  
  try {
    const primeiroVendedor = filaAtiva[0]
    const novaFila = [...filaAtiva.slice(1), primeiroVendedor]
    
    // Reajustar sequências
    const filaReordenada = novaFila.map((item: any, index: number) => ({
      ...item,
      sequencia: index + 1
    }))
    
    console.log('[FilaV2] 🔄 Rotação:', primeiroVendedor.vendedor_id, 
      '(1 →', filaReordenada.length, ') | Próximo:', filaReordenada[0].vendedor_id,
      '| Ordem:', filaReordenada.map((v: any) => v.vendedor_id).join('→'))
    
    // Atualizar no banco
    await executeQuery(
      'UPDATE unidades SET fila_leads = ? WHERE id = ?',
      [JSON.stringify(filaReordenada), unidadeId]
    )
    
    console.log('[FilaV2] ✅ Fila persistida')
  } catch (error) {
    console.error('[FilaV2] ❌ Erro ao rodar fila:', error)
    throw error
  }
}

// Função auxiliar para consultar lead no SprintHub
async function consultarLeadSprintHub(leadId: string) {
  const { apiToken, groupId, urlPatch } = ENV_CONFIG
  
  if (!apiToken || !groupId || !urlPatch) {
    throw new Error('Configuração da API não encontrada')
  }
  
  const url = `${urlPatch}/leads/${leadId}?query={lead{id,firstname,lastname,whatsapp,phone,mobile,userAccess,departmentAccess,owner{id,name}}}&apitoken=${apiToken}&i=${groupId}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CRM-by-INTELI/2.0'
    },
    cache: 'no-store'
  })
  
  if (!response.ok) {
    console.error('[FilaV2] ⚠️ Erro ao consultar lead:', response.status)
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
) {
  try {
    await executeQuery(
      `INSERT INTO fila_leads_log 
       (unidade_id, vendedor_id, lead_id, posicao_fila, total_fila, owner_anterior, user_access_anterior, department_access_anterior) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [unidadeId, vendedorId, leadId, 1, totalFila, ownerAnterior, userAccessAnterior, departmentAccessAnterior]
    )
    console.log('[FilaV2] 📝 Log: U', unidadeId, '| V', vendedorId, '| L', leadId, '| Owner:', ownerAnterior, '→', vendedorId)
  } catch (logError: any) {
    // Fallback: tentar sem as colunas novas se não existirem
    if (logError?.code === 'ER_BAD_FIELD_ERROR') {
      try {
        await executeQuery(
          'INSERT INTO fila_leads_log (unidade_id, vendedor_id, lead_id, posicao_fila, total_fila) VALUES (?, ?, ?, ?, ?)',
          [unidadeId, vendedorId, leadId, 1, totalFila]
        )
        console.log('[FilaV2] ⚠️ Log sem campos antes/depois (colunas não existem)')
      } catch (fallbackError: any) {
        // Último fallback sem lead_id
        await executeQuery(
          'INSERT INTO fila_leads_log (unidade_id, vendedor_id, posicao_fila, total_fila) VALUES (?, ?, ?, ?)',
          [unidadeId, vendedorId, 1, totalFila]
        )
        console.log('[FilaV2] ⚠️ Log básico (sem lead_id e campos extras)')
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
  leadDataAtual?: any
) {
  const { apiToken, groupId, urlPatch } = ENV_CONFIG
  
  if (!apiToken || !groupId || !urlPatch) {
    throw new Error('Configuração da API não encontrada')
  }
  
  // Buscar dados do lead se não foram fornecidos
  const lead = leadDataAtual || (await consultarLeadSprintHub(leadId))?.data?.lead
  
  // Determinar whatsapp (campo obrigatório): whatsapp > phone > mobile > ''
  const whatsapp = lead?.whatsapp || lead?.phone || lead?.mobile || ''
  
  // Preparar payload de atualização
  const updateData: any = {
    owner: vendedorId,
    userAccess: [vendedorId],
    departmentAccess: dptoGestao ? [dptoGestao] : [],
    whatsapp
  }
  
  // Preservar campos importantes se existirem
  if (lead?.firstname) updateData.firstname = lead.firstname
  if (lead?.lastname) updateData.lastname = lead.lastname
  
  console.log('[FilaV2] 📝 PUT Lead', leadId, '→ V', vendedorId, '| D', dptoGestao || 'N/A')
  console.log('[FilaV2] 📦 Payload:', JSON.stringify(updateData, null, 2))
  
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
  
  console.log('[FilaV2] 📊 Status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[FilaV2] ❌ Erro PUT:', errorText)
    throw new Error(`Erro ao atualizar lead: ${response.status}`)
  }
  
  return await response.json()
}

// GET - Distribuir lead automaticamente
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const unidadeIdParam = searchParams.get('unidade')
  const leadId = searchParams.get('idlead')

  // Validações
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

  const unidadeId = parseInt(unidadeIdParam)
  const leadIdNum = parseInt(leadId)
  
  if (isNaN(unidadeId) || unidadeId <= 0) {
    return NextResponse.json(
      { sucesso: false, erro: 'ID da unidade inválido' } as FilaV2Response,
      { status: 400 }
    )
  }
  
  if (isNaN(leadIdNum) || leadIdNum <= 0) {
    return NextResponse.json(
      { sucesso: false, erro: 'ID do lead inválido' } as FilaV2Response,
      { status: 400 }
    )
  }

  console.log('[FilaV2] 🚀 Iniciando | U', unidadeId, '| L', leadId)

  try {
    // 1. Buscar unidade e próximo vendedor em uma única query otimizada
    const unidadeResult = await executeQuery(`
      SELECT 
        u.id, 
        u.name as nome,
        u.dpto_gestao,
        u.fila_leads
      FROM unidades u
      WHERE u.id = ? AND u.ativo = 1
      LIMIT 1
    `, [unidadeId]) as any[]
    
    if (unidadeResult.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Unidade não encontrada ou inativa' } as FilaV2Response,
        { status: 404 }
      )
    }

    const unidade = unidadeResult[0]
    console.log('[FilaV2] ✅ Unidade:', unidade.nome)

    // 2. Processar fila
    const filaAtiva = processarFila(unidade.fila_leads)
    
    if (!filaAtiva || filaAtiva.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum vendedor disponível na fila desta unidade' } as FilaV2Response,
        { status: 404 }
      )
    }

    const proximoVendedorId = filaAtiva[0].vendedor_id
    
    // 3. Buscar informações do vendedor
    const vendedorResult = await executeQuery(
      'SELECT id, name FROM vendedores WHERE id = ? AND ativo = 1 LIMIT 1',
      [proximoVendedorId]
    ) as any[]
    
    if (vendedorResult.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Vendedor da fila não encontrado ou inativo' } as FilaV2Response,
        { status: 404 }
      )
    }

    const vendedor = vendedorResult[0]
    console.log('[FilaV2] 👤 Próximo:', vendedor.name, '(', vendedor.id, ')')

    const proximoFila = {
      vendedor_id: vendedor.id,
      nome: vendedor.name
    }

    // 4. Consultar estado anterior do lead
    let dadosAntes = null
    let leadAntes = null
    
    try {
      const leadData = await consultarLeadSprintHub(leadId)
      if (leadData?.data?.lead) {
        leadAntes = leadData.data.lead
        dadosAntes = {
          owner: leadAntes.owner?.id || null,
          owner_nome: leadAntes.owner?.name || null,
          userAccess: Array.isArray(leadAntes.userAccess) ? leadAntes.userAccess : [],
          departmentAccess: Array.isArray(leadAntes.departmentAccess) ? leadAntes.departmentAccess : []
        }
        console.log('[FilaV2] 📋 Antes | Owner:', dadosAntes.owner, '(', dadosAntes.owner_nome, ') | UA:', dadosAntes.userAccess, '| DA:', dadosAntes.departmentAccess)
      }
    } catch (consultaError) {
      console.error('[FilaV2] ⚠️ Erro ao consultar lead antes:', consultaError)
      // Continua mesmo se não conseguir consultar
    }

    // 5. Atualizar lead no SprintHub
    let leadAtualizado = false
    let resultadoPut = null
    let dadosDepois = null
    
    try {
      // Passar dados do lead se já foram consultados
      resultadoPut = await atualizarLeadSprintHub(
        leadId, 
        proximoFila.vendedor_id, 
        unidade.dpto_gestao,
        leadAntes // Passar dados do lead já consultados
      )
      leadAtualizado = true
      
      dadosDepois = {
        owner: proximoFila.vendedor_id,
        owner_nome: proximoFila.nome,
        userAccess: [proximoFila.vendedor_id],
        departmentAccess: unidade.dpto_gestao ? [unidade.dpto_gestao] : []
      }
      
      console.log('[FilaV2] ✅ Lead atualizado:', leadId, '→', proximoFila.nome)
      console.log('[FilaV2] 📋 Depois | Owner:', dadosDepois.owner, '(', dadosDepois.owner_nome, ') | UA:', dadosDepois.userAccess, '| DA:', dadosDepois.departmentAccess)
      
      // 6. Registrar log com dados antes/depois
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
      } catch (logError) {
        console.error('[FilaV2] ❌ Erro ao registrar log:', logError)
        // Não impede o fluxo
      }
      
      // 7. Rodar a fila (não-bloqueante)
      try {
        await rotacionarFila(unidadeId, filaAtiva)
      } catch (filaError) {
        console.error('[FilaV2] ❌ Erro ao rodar fila:', filaError)
        // Não impede o fluxo
      }
      
    } catch (updateError: any) {
      console.error('[FilaV2] ❌ Erro ao atualizar lead:', updateError.message)
    }

    // 8. Preparar resposta
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

    // Adicionar JSON completo do lead recuperado
    if (leadAntes) {
      response.lead_recuperado = leadAntes
    }

    // Adicionar dados antes/depois se disponíveis
    if (dadosAntes) {
      response.antes = dadosAntes
    }
    
    if (dadosDepois) {
      response.depois = dadosDepois
    }

    if (resultadoPut) {
      response.resultado_put = resultadoPut
    }

    const execTime = Date.now() - startTime
    console.log('[FilaV2] ⏱️ Concluído em', execTime, 'ms')

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[FilaV2] ❌ Erro fatal:', error)
    
    return NextResponse.json(
      { sucesso: false, erro: 'Erro interno do servidor' } as FilaV2Response,
      { status: 500 }
    )
  }
}

// PUT - Método legado (mantido para compatibilidade)
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const unidadeIdParam = searchParams.get('unidade')
  const leadId = searchParams.get('idlead')

  // Validar parâmetros
  if (!unidadeIdParam) {
    return NextResponse.json(
      { sucesso: false, erro: 'Parâmetro "unidade" é obrigatório' },
      { status: 400 }
    )
  }

  if (!leadId) {
    return NextResponse.json(
      { sucesso: false, erro: 'Parâmetro "idlead" é obrigatório' },
      { status: 400 }
    )
  }

  const unidadeId = parseInt(unidadeIdParam)
  const leadIdNum = parseInt(leadId)
  
  if (isNaN(unidadeId) || unidadeId <= 0 || isNaN(leadIdNum) || leadIdNum <= 0) {
    return NextResponse.json(
      { sucesso: false, erro: 'IDs inválidos' },
      { status: 400 }
    )
  }

  try {
    // Buscar unidade
    const unidadeResult = await executeQuery(
      'SELECT id, name as nome, dpto_gestao, fila_leads FROM unidades WHERE id = ? AND ativo = 1 LIMIT 1',
      [unidadeId]
    ) as any[]

    if (unidadeResult.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Unidade não encontrada ou inativa' },
        { status: 404 }
      )
    }

    const unidade = unidadeResult[0]
    const filaAtiva = processarFila(unidade.fila_leads)

    if (!filaAtiva || filaAtiva.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Nenhum vendedor disponível na fila' },
        { status: 404 }
      )
    }

    const proximoVendedorId = filaAtiva[0].vendedor_id

    // Atualizar lead (buscar dados primeiro se necessário)
    const result = await atualizarLeadSprintHub(leadId, proximoVendedorId, unidade.dpto_gestao)

    return NextResponse.json({
      sucesso: true,
      lead_id: leadIdNum,
      vendedor_atribuido: proximoVendedorId,
      departamento: unidade.dpto_gestao,
      resultado: result
    })

  } catch (error: any) {
    console.error('[FilaV2] ❌ Erro ao atribuir lead:', error)
    
    return NextResponse.json(
      { sucesso: false, erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
