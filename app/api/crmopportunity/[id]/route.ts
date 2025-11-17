import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidade por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validar autenticação
    const { searchParams } = new URL(request.url)
    const apitoken = searchParams.get('apitoken')
    const i = searchParams.get('i')

    if (!apitoken || !i) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Autenticação necessária',
          error: 'Parâmetros "apitoken" e "i" são obrigatórios'
        },
        { status: 401 }
      )
    }

    // Validar contra variáveis de ambiente
    if (apitoken !== process.env.APITOKEN || i !== process.env.I) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Credenciais inválidas',
          error: 'Token ou ID de grupo inválidos'
        },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'ID inválido',
          error: 'O ID deve ser um número inteiro positivo'
        },
        { status: 400 }
      )
    }

    // Buscar oportunidade com informações relacionadas
    const oportunidades = await executeQuery(`
      SELECT 
        o.id,
        o.title,
        o.value,
        o.crm_column,
        o.lead_id,
        o.sequence,
        o.status,
        o.loss_reason,
        o.gain_reason,
        o.expectedCloseDate,
        o.sale_channel,
        o.campaign,
        o.user,
        o.last_column_change,
        o.last_status_change,
        o.gain_date,
        o.lost_date,
        o.reopen_date,
        o.await_column_approved,
        o.await_column_approved_user,
        o.reject_appro,
        o.reject_appro_desc,
        o.conf_installment,
        o.fields,
        o.createDate,
        o.updateDate,
        o.archived,
        o.created_at,
        o.coluna_funil_id,
        cf.nome_coluna as coluna_nome,
        cf.id_funil,
        f.funil_nome,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        v.email as vendedor_email,
        v.telephone as vendedor_telefone
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      LEFT JOIN funis f ON cf.id_funil = f.id
      LEFT JOIN vendedores v ON o.user = v.id
      WHERE o.id = ?
    `, [id]) as any[]

    if (oportunidades.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Oportunidade não encontrada',
          error: `Nenhuma oportunidade encontrada com ID ${id}`
        },
        { status: 404 }
      )
    }

    const oportunidade = oportunidades[0]

    // Parse JSON fields
    let confInstallment = null
    let fields = null

    if (oportunidade.conf_installment) {
      try {
        confInstallment = typeof oportunidade.conf_installment === 'string' 
          ? JSON.parse(oportunidade.conf_installment) 
          : oportunidade.conf_installment
      } catch {
        confInstallment = null
      }
    }

    if (oportunidade.fields) {
      try {
        fields = typeof oportunidade.fields === 'string' 
          ? JSON.parse(oportunidade.fields) 
          : oportunidade.fields
      } catch {
        fields = null
      }
    }

    // Formatar resposta
    const response = {
      success: true,
      data: {
        id: oportunidade.id,
        title: oportunidade.title,
        value: parseFloat(oportunidade.value || 0),
        status: oportunidade.status,
        crm_column: oportunidade.crm_column,
        lead_id: oportunidade.lead_id,
        sequence: oportunidade.sequence,
        loss_reason: oportunidade.loss_reason,
        gain_reason: oportunidade.gain_reason,
        expectedCloseDate: oportunidade.expectedCloseDate,
        sale_channel: oportunidade.sale_channel,
        campaign: oportunidade.campaign,
        user: oportunidade.user,
        last_column_change: oportunidade.last_column_change,
        last_status_change: oportunidade.last_status_change,
        gain_date: oportunidade.gain_date,
        lost_date: oportunidade.lost_date,
        reopen_date: oportunidade.reopen_date,
        await_column_approved: Boolean(oportunidade.await_column_approved),
        await_column_approved_user: oportunidade.await_column_approved_user,
        reject_appro: Boolean(oportunidade.reject_appro),
        reject_appro_desc: oportunidade.reject_appro_desc,
        conf_installment: confInstallment,
        fields: fields,
        createDate: oportunidade.createDate,
        updateDate: oportunidade.updateDate,
        archived: Boolean(oportunidade.archived),
        coluna_funil_id: oportunidade.coluna_funil_id,
        coluna_nome: oportunidade.coluna_nome,
        funil_id: oportunidade.id_funil,
        funil_nome: oportunidade.funil_nome,
        vendedor: oportunidade.user ? {
          id: parseInt(oportunidade.user),
          nome: oportunidade.vendedor_nome,
          sobrenome: oportunidade.vendedor_sobrenome,
          email: oportunidade.vendedor_email,
          telefone: oportunidade.vendedor_telefone
        } : null
      }
    }

    return NextResponse.json(response)

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

// PATCH - Atualizar oportunidade
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validar autenticação
    const { searchParams } = new URL(request.url)
    const apitoken = searchParams.get('apitoken')
    const i = searchParams.get('i')

    if (!apitoken || !i) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Autenticação necessária',
          error: 'Parâmetros "apitoken" e "i" são obrigatórios'
        },
        { status: 401 }
      )
    }

    // Validar contra variáveis de ambiente
    if (apitoken !== process.env.APITOKEN || i !== process.env.I) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Credenciais inválidas',
          error: 'Token ou ID de grupo inválidos'
        },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'ID inválido',
          error: 'O ID deve ser um número inteiro positivo'
        },
        { status: 400 }
      )
    }

    // Verificar se a oportunidade existe
    const existingOpp = await executeQuery(
      'SELECT id FROM oportunidades WHERE id = ?',
      [id]
    ) as any[]

    if (existingOpp.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Oportunidade não encontrada',
          error: `Nenhuma oportunidade encontrada com ID ${id}`
        },
        { status: 404 }
      )
    }

    // Obter dados do body
    const body = await request.json()

    // Campos permitidos para atualização
    const allowedFields = [
      'title',
      'value',
      'crm_column',
      'lead_id',
      'sequence',
      'status',
      'loss_reason',
      'gain_reason',
      'expectedCloseDate',
      'sale_channel',
      'campaign',
      'user',
      'last_column_change',
      'last_status_change',
      'gain_date',
      'lost_date',
      'reopen_date',
      'await_column_approved',
      'await_column_approved_user',
      'reject_appro',
      'reject_appro_desc',
      'conf_installment',
      'fields',
      'archived',
      'coluna_funil_id'
    ]

    // Construir query de update dinamicamente
    const updates: string[] = []
    const values: any[] = []

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`)
        
        // Tratar campos JSON
        if (key === 'conf_installment' || key === 'fields') {
          values.push(value !== null && value !== undefined ? JSON.stringify(value) : null)
        } 
        // Tratar campos boolean
        else if (key === 'await_column_approved' || key === 'reject_appro' || key === 'archived') {
          values.push(value ? 1 : 0)
        }
        // Tratar campos numéricos
        else if (key === 'value' || key === 'lead_id' || key === 'sequence' || key === 'coluna_funil_id') {
          if (value !== null && value !== undefined) {
            // Se já for número, usar diretamente; senão converter para string e depois parsear
            const numValue = typeof value === 'number' ? value : parseFloat(String(value))
            values.push(isNaN(numValue) ? null : numValue)
          } else {
            values.push(null)
          }
        }
        // Processar loss_reason: extrair apenas o ID se for objeto, remover "Motivo " se presente
        else if (key === 'loss_reason') {
          if (value && typeof value === 'object' && !Array.isArray(value) && 'id' in value) {
            // Se for objeto, pegar apenas o ID
            values.push(String((value as { id: any }).id))
          } else if (value !== null && value !== undefined) {
            // Se for string ou número, remover "Motivo " se estiver presente
            let strValue = String(value).trim()
            if (strValue.startsWith('Motivo ')) {
              strValue = strValue.replace(/^Motivo\s+/, '')
            }
            // Garantir que seja apenas número
            if (/^\d+$/.test(strValue)) {
              values.push(strValue)
            } else {
              values.push(null)
            }
          } else {
            values.push(null)
          }
        }
        // Outros campos
        else {
          values.push(value)
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Nenhum campo válido para atualizar',
          error: 'O body deve conter pelo menos um campo válido'
        },
        { status: 400 }
      )
    }

    // Adicionar updateDate
    updates.push('updateDate = NOW()')

    // Executar update
    await executeQuery(
      `UPDATE oportunidades SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id]
    )

    // Buscar oportunidade atualizada
    const updatedOpp = await executeQuery(`
      SELECT 
        o.*,
        cf.nome_coluna as coluna_nome,
        cf.id_funil,
        f.funil_nome,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        v.email as vendedor_email,
        v.telephone as vendedor_telefone
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      LEFT JOIN funis f ON cf.id_funil = f.id
      LEFT JOIN vendedores v ON o.user = v.id
      WHERE o.id = ?
    `, [id]) as any[]

    const oportunidade = updatedOpp[0]

    // Parse JSON fields
    let confInstallment = null
    let fields = null

    if (oportunidade.conf_installment) {
      try {
        confInstallment = typeof oportunidade.conf_installment === 'string' 
          ? JSON.parse(oportunidade.conf_installment) 
          : oportunidade.conf_installment
      } catch {
        confInstallment = null
      }
    }

    if (oportunidade.fields) {
      try {
        fields = typeof oportunidade.fields === 'string' 
          ? JSON.parse(oportunidade.fields) 
          : oportunidade.fields
      } catch {
        fields = null
      }
    }

    // Retornar dados atualizados
    const response = {
      success: true,
      message: 'Oportunidade atualizada com sucesso',
      data: {
        id: oportunidade.id,
        title: oportunidade.title,
        value: parseFloat(oportunidade.value || 0),
        status: oportunidade.status,
        crm_column: oportunidade.crm_column,
        lead_id: oportunidade.lead_id,
        sequence: oportunidade.sequence,
        loss_reason: oportunidade.loss_reason,
        gain_reason: oportunidade.gain_reason,
        expectedCloseDate: oportunidade.expectedCloseDate,
        sale_channel: oportunidade.sale_channel,
        campaign: oportunidade.campaign,
        user: oportunidade.user,
        last_column_change: oportunidade.last_column_change,
        last_status_change: oportunidade.last_status_change,
        gain_date: oportunidade.gain_date,
        lost_date: oportunidade.lost_date,
        reopen_date: oportunidade.reopen_date,
        await_column_approved: Boolean(oportunidade.await_column_approved),
        await_column_approved_user: oportunidade.await_column_approved_user,
        reject_appro: Boolean(oportunidade.reject_appro),
        reject_appro_desc: oportunidade.reject_appro_desc,
        conf_installment: confInstallment,
        fields: fields,
        createDate: oportunidade.createDate,
        updateDate: oportunidade.updateDate,
        archived: Boolean(oportunidade.archived),
        coluna_funil_id: oportunidade.coluna_funil_id,
        coluna_nome: oportunidade.coluna_nome,
        funil_id: oportunidade.id_funil,
        funil_nome: oportunidade.funil_nome,
        vendedor: oportunidade.user ? {
          id: parseInt(oportunidade.user),
          nome: oportunidade.vendedor_nome,
          sobrenome: oportunidade.vendedor_sobrenome,
          email: oportunidade.vendedor_email,
          telefone: oportunidade.vendedor_telefone
        } : null
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao atualizar oportunidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

