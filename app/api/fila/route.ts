import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface FilaResponse {
  sucesso: boolean
  vendedor?: {
    id: number
    nome: string
    email: string
    telefone: string | null
    username: string
    posicao_fila: number
  }
  lead?: {
    data: {
      lead: {
        id: number
        firstname: string
        lastname: string
        email: string | null
        mobile: string | null
        userAccess: number[]
      }
    }
  } | null
  lead_update_payload?: {
    leadIds: number[]
    data: {
      userAccess: number[]
      departmentAccess: any[]
      ignoreSubDepartments: boolean
    }
  } | null
  opportunity_payload?: {
    crm_column: number
    lead_id: number
    status: string
    title: string
    value: number
    user: number
    sequence: string
  } | null
  unidade?: {
    id: number
    nome: string
    nome_com_id: string
    department_id: number | null
    branches: any[]
  }
  total_distribuicoes: number
  total_fila: number
  mensagem?: string
  erro?: string
}

// GET - Retornar próximo vendedor da fila (com ou sem dados do lead)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const unidadeIdParam = searchParams.get('unidade')
  const leadId = searchParams.get('idlead')

  // Validar unidade
  if (!unidadeIdParam) {
    return NextResponse.json(
      { 
        sucesso: false, 
        erro: 'Parâmetro "unidade" é obrigatório',
        total_distribuicoes: 0,
        total_fila: 0
      } as FilaResponse,
      { status: 400 }
    )
  }

  const unidadeId = parseInt(unidadeIdParam)
  if (isNaN(unidadeId)) {
    return NextResponse.json(
      { 
        sucesso: false, 
        erro: 'ID da unidade inválido',
        total_distribuicoes: 0,
        total_fila: 0
      } as FilaResponse,
      { status: 400 }
    )
  }

  try {
    // 1. Buscar informações da unidade
    const unidadeResult = await executeQuery(`
      SELECT 
        id, 
        name as nome,
        department_id,
        fila_leads,
        branches,
        dpto_gestao,
        user_gestao
      FROM unidades 
      WHERE id = ? AND ativo = 1
    `, [unidadeId]) as any[]

    if (unidadeResult.length === 0) {
      return NextResponse.json(
        { 
          sucesso: false, 
          erro: 'Unidade não encontrada ou inativa',
          total_distribuicoes: 0,
          total_fila: 0
        } as FilaResponse,
        { status: 404 }
      )
    }

    const unidade = unidadeResult[0]

    // 2. Parsear fila de leads
    let filaLeads: any[] = []
    if (unidade.fila_leads) {
      try {
        const parsed = typeof unidade.fila_leads === 'string' 
          ? JSON.parse(unidade.fila_leads) 
          : unidade.fila_leads
        
        if (Array.isArray(parsed)) {
          filaLeads = parsed
            .filter((item: any) => item.vendedor_id)
            .sort((a: any, b: any) => (a.sequencia || 0) - (b.sequencia || 0))
        }
      } catch (e) {
        console.warn(`Erro ao parsear fila_leads da unidade ${unidadeId}:`, e)
      }
    }

    if (filaLeads.length === 0) {
      return NextResponse.json(
        { 
          sucesso: false, 
          erro: 'Nenhum vendedor configurado na fila desta unidade',
          total_distribuicoes: 0,
          total_fila: 0
        } as FilaResponse,
        { status: 404 }
      )
    }

    // 3. Buscar última distribuição desta unidade
    const ultimaDistribuicaoResult = await executeQuery(`
      SELECT vendedor_id 
      FROM fila_leads_log 
      WHERE unidade_id = ?
      ORDER BY distribuido_em DESC, id DESC
      LIMIT 1
    `, [unidadeId]) as any[]

    let proximoIndex = 0
    
    if (ultimaDistribuicaoResult.length > 0) {
      const ultimoVendedorId = ultimaDistribuicaoResult[0].vendedor_id
      const ultimoIndex = filaLeads.findIndex(v => v.vendedor_id === ultimoVendedorId)
      
      if (ultimoIndex !== -1) {
        proximoIndex = (ultimoIndex + 1) % filaLeads.length
      } else {
        proximoIndex = 0
      }
    }

    // 4. Pegar vendedor da posição calculada
    const vendedorFila = filaLeads[proximoIndex]

    // 5. Buscar informações do vendedor
    const vendedorResult = await executeQuery(`
      SELECT 
        id,
        name,
        lastName,
        email,
        username,
        telephone
      FROM vendedores 
      WHERE id = ? AND ativo = 1
    `, [vendedorFila.vendedor_id]) as any[]

    if (vendedorResult.length === 0) {
      return NextResponse.json(
        { 
          sucesso: false, 
          erro: 'Vendedor não encontrado ou inativo',
          total_distribuicoes: 0,
          total_fila: filaLeads.length
        } as FilaResponse,
        { status: 404 }
      )
    }

    const vendedor = vendedorResult[0]

    // 6. Consultar dados do lead na API do SprintHub (se leadId fornecido)
    let leadData = null
    if (leadId) {
      console.log('🔍 Buscando lead:', leadId)
      const apiToken = process.env.APITOKEN
      const groupId = process.env.I
      const urlPatch = process.env.URLPATCH

      if (apiToken && groupId && urlPatch) {
        console.log('✅ Token configurado')
        try {
          const url = `${urlPatch}/leads/${leadId}?query={lead{id,firstname,lastname,userAccess,departmentAccess}}&apitoken=${apiToken}&i=${groupId}`
          console.log('📡 URL:', url)
          
          const leadResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'CRM-by-INTELI/1.0'
            },
            cache: 'no-store'
          })

          console.log('📊 Status da resposta:', leadResponse.status)
          
          if (leadResponse.ok) {
            const leadJson = await leadResponse.json()
            console.log('📦 Resposta completa:', JSON.stringify(leadJson, null, 2))
            
            // API retorna: { data: { lead: {...} } }
            // Retornar a estrutura completa com data
            leadData = leadJson || null
            console.log('✅ Lead extraído:', JSON.stringify(leadData))
          } else {
            const errorText = await leadResponse.text()
            console.error(`❌ Erro ao consultar lead ${leadId}:`, leadResponse.status, errorText)
          }
        } catch (leadError) {
          console.error('❌ Erro ao consultar API do SprintHub:', leadError)
          // Continua mesmo sem os dados do lead
        }
      } else {
        console.error('❌ APITOKEN, I ou URLPATCH não configurado no .env')
      }
    } else {
      console.log('ℹ️ Nenhum leadId fornecido')
    }

    // 7. Atualizar lead no SprintHub (adicionar vendedor ao userAccess)
    let updatePayload = null
    let opportunityPayload = null
    if (leadId && leadData) {
      const apiToken = process.env.APITOKEN
      const groupId = process.env.I
      const urlPatch = process.env.URLPATCH

      if (apiToken && groupId && urlPatch) {
        try {
          console.log('🔄 Atualizando lead no SprintHub...')
          
          // Obter userAccess atual do lead
          const currentUserAccess = leadData?.data?.lead?.userAccess || []
          console.log('👥 UserAccess atual:', currentUserAccess)
          
          // Adicionar o novo vendedor se ainda não estiver no array
          const updatedUserAccess = [...currentUserAccess]
          if (!updatedUserAccess.includes(vendedor.id)) {
            updatedUserAccess.push(vendedor.id)
          }
          console.log('👥 UserAccess atualizado:', updatedUserAccess)
          
          // Preparar departmentAccess com dpto_gestao se existir
          const departmentAccess = unidade.dpto_gestao ? [unidade.dpto_gestao] : []
          console.log('🏢 Departamento de Gestão:', unidade.dpto_gestao || 'Não definido')
          console.log('📋 DepartmentAccess:', departmentAccess)
          
          updatePayload = {
            leadIds: [parseInt(leadId)],
            data: {
              userAccess: updatedUserAccess,
              departmentAccess: departmentAccess,
              ignoreSubDepartments: true
            }
          }

          console.log('📤 Payload:', JSON.stringify(updatePayload, null, 2))

          const updateResponse = await fetch(
            `${urlPatch}/leads/batchupdate?apitoken=${apiToken}&i=${groupId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CRM-by-INTELI/1.0'
              },
              body: JSON.stringify(updatePayload),
              cache: 'no-store'
            }
          )

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json()
            console.log('✅ Lead atualizado no SprintHub:', updateResult)
          } else {
            const errorText = await updateResponse.text()
            console.error('❌ Erro ao atualizar lead no SprintHub:', updateResponse.status, errorText)
          }

          // 7.1. Criar oportunidade no CRM
          try {
            console.log('🎯 Criando oportunidade no CRM...')
            
            const leadName = `${leadData?.data?.lead?.firstname || ''} ${leadData?.data?.lead?.lastname || ''}`.trim()
            
            opportunityPayload = {
              crm_column: 8,
              lead_id: parseInt(leadId),
              status: "open",
              title: leadName || `Lead #${leadId}`,
              value: 0,
              user: vendedor.id,
              sequence: ""
            }

            console.log('📤 Payload oportunidade:', JSON.stringify(opportunityPayload, null, 2))

            const opportunityResponse = await fetch(
              `${urlPatch}/crmopportunity?id=4&apitoken=${apiToken}&i=${groupId}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'CRM-by-INTELI/1.0'
                },
                body: JSON.stringify(opportunityPayload),
                cache: 'no-store'
              }
            )

            if (opportunityResponse.ok) {
              const opportunityResult = await opportunityResponse.json()
              console.log('✅ Oportunidade criada no CRM:', opportunityResult)
            } else {
              const errorText = await opportunityResponse.text()
              console.error('❌ Erro ao criar oportunidade no CRM:', opportunityResponse.status, errorText)
            }
          } catch (opportunityError) {
            console.error('❌ Erro ao conectar com SprintHub para criar oportunidade:', opportunityError)
          }

        } catch (updateError) {
          console.error('❌ Erro ao conectar com SprintHub para atualizar lead:', updateError)
        }
      }
    }

    // 8. Registrar log da distribuição
    try {
      await executeQuery(`
        INSERT INTO fila_leads_log (
          unidade_id, 
          vendedor_id, 
          posicao_fila,
          total_fila
        )
        VALUES (?, ?, ?, ?)
      `, [unidadeId, vendedor.id, proximoIndex + 1, filaLeads.length])
    } catch (logError) {
      console.warn('Erro ao registrar log da fila:', logError)
    }

    // 9. Contar total de distribuições
    const totalDistResult = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM fila_leads_log 
      WHERE unidade_id = ?
    `, [unidadeId]) as any[]
    
    const totalDistribuicoes = totalDistResult[0]?.total || 0

    // 11. Parsear branches se existir
    let branchesArray: any[] = []
    if (unidade.branches) {
      try {
        branchesArray = typeof unidade.branches === 'string' 
          ? JSON.parse(unidade.branches) 
          : unidade.branches
      } catch (e) {
        console.warn(`Erro ao parsear branches da unidade ${unidadeId}:`, e)
      }
    }

    // 12. Retornar resposta
    const nomeComId = unidade.id 
      ? `${unidade.nome} #${unidade.id}`
      : unidade.nome
    
    const response: FilaResponse = {
      sucesso: true,
      vendedor: {
        id: vendedor.id,
        nome: `${vendedor.name} ${vendedor.lastName}`,
        email: vendedor.email,
        telefone: vendedor.telephone,
        username: vendedor.username,
        posicao_fila: proximoIndex + 1
      },
      lead: leadData,
      lead_update_payload: updatePayload,
      opportunity_payload: opportunityPayload,
      unidade: {
        id: unidade.id,
        nome: unidade.nome,
        nome_com_id: nomeComId,
        department_id: unidade.department_id,
        branches: branchesArray
      },
      total_distribuicoes: totalDistribuicoes,
      total_fila: filaLeads.length
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Erro ao processar fila de leads:', error)
    
    return NextResponse.json(
      { 
        sucesso: false, 
        erro: 'Erro interno do servidor',
        total_distribuicoes: 0,
        total_fila: 0
      } as FilaResponse,
      { status: 500 }
    )
  }
}

