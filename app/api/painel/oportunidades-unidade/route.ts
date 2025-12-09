import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Parsear vendedores da unidade
function parseJSON(value: any): any[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadeId = searchParams.get('unidadeId')
    const periodoInicio = searchParams.get('periodoInicio')
    const periodoFim = searchParams.get('periodoFim')

    console.log('[API] Exportar oportunidades - Parâmetros:', { unidadeId, periodoInicio, periodoFim })

    if (!unidadeId || isNaN(parseInt(unidadeId))) {
      return NextResponse.json(
        { success: false, message: 'ID de unidade inválido' },
        { status: 400 }
      )
    }

    const unidadeIdInt = parseInt(unidadeId)

    // Buscar unidade e seus vendedores
    const unidade = await executeQuery(`
      SELECT 
        u.id, 
        COALESCE(u.nome, u.name) as nome, 
        u.users
      FROM unidades u
      WHERE u.id = ? AND u.ativo = 1
    `, [unidadeIdInt]) as any[]

    if (!unidade || unidade.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    const parsedUsers = parseJSON(unidade[0].users)
    const userIds = parsedUsers
      .map((u: any) => typeof u === 'object' ? u.id : u)
      .filter((id: any) => typeof id === 'number')

    if (userIds.length === 0) {
      console.log('[API] Nenhum vendedor encontrado na unidade')
      return NextResponse.json({
        success: true,
        oportunidades: [],
        message: 'Nenhum vendedor na unidade'
      })
    }

    // Buscar vendedores ativos
    const todosVendedores = await executeQuery(`
      SELECT id FROM vendedores WHERE ativo = 1
    `) as any[]
    const vendedoresAtivosSet = new Set(todosVendedores.map(v => v.id))
    const vendedoresIds = userIds.filter((id: number) => vendedoresAtivosSet.has(id))

    console.log('[API] Vendedores ativos da unidade:', vendedoresIds)

    if (vendedoresIds.length === 0) {
      console.log('[API] Nenhum vendedor ativo encontrado')
      return NextResponse.json({
        success: true,
        oportunidades: [],
        message: 'Nenhum vendedor ativo na unidade'
      })
    }

    // Construir filtros
    const placeholders = vendedoresIds.map(() => '?').join(',')
    const filtros: string[] = []
    const queryParams: any[] = []

    // Filtrar por vendedores
    filtros.push(`o.user IN (${placeholders})`)
    queryParams.push(...vendedoresIds)

    // Filtro de período:
    // - Abertas: TODAS (sem filtro de período, pois queremos ver todas as oportunidades abertas)
    // - Ganhas: filtrar por gain_date no período
    // - Perdidas: filtrar por lost_date no período
    if (periodoInicio && periodoFim) {
      filtros.push(`
        (
          o.status IN ('open', 'aberta', 'active')
          OR
          (o.status IN ('ganho', 'ganhos', 'won', 'gain') AND o.gain_date >= ? AND o.gain_date <= ?)
          OR
          (o.status IN ('perdido', 'perdidos', 'lost', 'loss') AND o.lost_date >= ? AND o.lost_date <= ?)
        )
      `)
      queryParams.push(
        periodoInicio, periodoFim, // Ganhas
        periodoInicio, periodoFim  // Perdidas
      )
    } else {
      // Se não houver período, buscar TODAS as oportunidades (abertas, ganhas e perdidas)
      // Sem filtro adicional de status
    }

    // Buscar todas as oportunidades com TODAS as colunas
    const oportunidades = await executeQuery(`
      SELECT 
        o.*
      FROM oportunidades o
      WHERE ${filtros.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN o.status IN ('ganho', 'ganhos', 'won', 'gain') THEN o.gain_date
          WHEN o.status IN ('perdido', 'perdidos', 'lost', 'loss') THEN o.lost_date
          ELSE o.createDate
        END DESC
    `, queryParams) as any[]

    // Buscar nomes dos vendedores
    const vendedoresIdsUnicos = Array.from(new Set(oportunidades.map(op => op.vendedor_id).filter(Boolean)))
    let vendedoresMap = new Map<number | string, string>()
    
    if (vendedoresIdsUnicos.length > 0) {
      const vendedoresPlaceholders = vendedoresIdsUnicos.map(() => '?').join(',')
      const vendedores = await executeQuery(`
        SELECT id, CONCAT(name, ' ', lastName) as nome_completo
        FROM vendedores
        WHERE id IN (${vendedoresPlaceholders})
      `, vendedoresIdsUnicos) as any[]
      
      vendedores.forEach(v => {
        vendedoresMap.set(v.id, v.nome_completo)
      })
    }

    // Buscar motivos de perda
    const motivosPerda = await executeQuery(`
      SELECT id, motivo FROM motivos_de_perda
    `) as any[]
    const motivosMap = new Map(motivosPerda.map(m => [m.id, m.motivo]))

    console.log('[API] Total de oportunidades encontradas:', oportunidades.length)

    // Função para expandir campos JSON
    const expandJSON = (jsonString: any, prefix: string = '') => {
      if (!jsonString) return {}
      try {
        const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
        if (typeof parsed !== 'object' || parsed === null) return {}
        
        const expanded: any = {}
        for (const [key, value] of Object.entries(parsed)) {
          const fieldName = prefix ? `${prefix}_${key}` : key
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Se for objeto, expandir recursivamente
            Object.assign(expanded, expandJSON(value, fieldName))
          } else {
            // Se for primitivo ou array, adicionar como string
            expanded[fieldName] = value === null || value === undefined 
              ? '' 
              : Array.isArray(value) 
                ? JSON.stringify(value) 
                : String(value)
          }
        }
        return expanded
      } catch {
        return {}
      }
    }

    return NextResponse.json({
      success: true,
      unidade: {
        id: unidade[0].id,
        nome: unidade[0].nome
      },
      oportunidades: oportunidades.map(op => {
        const vendedorId = op.user
        const vendedorNome = vendedorId 
          ? (vendedoresMap.get(Number(vendedorId)) || vendedoresMap.get(String(vendedorId)) || 'Sem vendedor')
          : 'Sem vendedor'
        
        // Determinar status em português
        let statusFormatado = 'Aberta'
        let dataRelevante = op.createDate
        
        if (['ganho', 'ganhos', 'won', 'gain'].includes(op.status?.toLowerCase())) {
          statusFormatado = 'Ganha'
          dataRelevante = op.gain_date || op.updateDate
        } else if (['perdido', 'perdidos', 'lost', 'loss'].includes(op.status?.toLowerCase())) {
          statusFormatado = 'Perdida'
          dataRelevante = op.lost_date || op.updateDate
        }

        // Buscar nome do motivo de perda
        let motivoPerda = null
        if (op.loss_reason) {
          try {
            const lossReasonParsed = typeof op.loss_reason === 'string' ? JSON.parse(op.loss_reason) : op.loss_reason
            const motivoId = lossReasonParsed?.id || lossReasonParsed
            if (motivoId) {
              motivoPerda = motivosMap.get(Number(motivoId)) || null
            }
          } catch {
            motivoPerda = null
          }
        }

        // Expandir campos JSON
        const fieldsExpanded = expandJSON(op.fields, 'field')
        const dataLeadExpanded = expandJSON(op.dataLead, 'dataLead')
        const confInstallmentExpanded = expandJSON(op.conf_installment, 'conf_installment')
        
        return {
          // Campos principais
          id: op.id,
          title: op.title,
          value: Number(op.value) || 0,
          status: statusFormatado,
          status_original: op.status,
          
          // Datas
          createDate: op.createDate,
          updateDate: op.updateDate,
          gain_date: op.gain_date,
          lost_date: op.lost_date,
          last_column_change: op.last_column_change,
          last_status_change: op.last_status_change,
          expectedCloseDate: op.expectedCloseDate,
          reopen_date: op.reopen_date,
          
          // Vendedor
          vendedor_id: vendedorId,
          vendedor_nome: vendedorNome,
          
          // Funil e Lead
          crm_column: op.crm_column,
          coluna_funil_id: op.coluna_funil_id,
          lead_id: op.lead_id,
          sequence: op.sequence,
          
          // Motivos e razões
          loss_reason: op.loss_reason,
          loss_reason_nome: motivoPerda,
          gain_reason: op.gain_reason,
          
          // Canais
          sale_channel: op.sale_channel,
          campaign: op.campaign,
          
          // Aprovações
          await_column_approved: op.await_column_approved,
          await_column_approved_user: op.await_column_approved_user,
          reject_appro: op.reject_appro,
          reject_appro_desc: op.reject_appro_desc,
          
          // Outros
          archived: op.archived,
          
          // JSON original (para referência)
          fields_json: op.fields,
          dataLead_json: op.dataLead,
          conf_installment_json: op.conf_installment,
          
          // Campos JSON expandidos
          ...fieldsExpanded,
          ...dataLeadExpanded,
          ...confInstallmentExpanded
        }
      })
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('[API] Erro ao buscar oportunidades:', errorMessage)
    console.error('[API] Stack:', errorStack)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades da unidade',
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}

