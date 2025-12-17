import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const unidadeId = searchParams.get('unidade_id')
    const vendedorId = searchParams.get('vendedor_id')
    const data = searchParams.get('data')
    const tipo = searchParams.get('tipo') || 'criadas'

    if (!unidadeId || !vendedorId || !data) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      )
    }

    let query = `
      SELECT 
        o.id,
        o.title,
        o.value,
        o.crm_column,
        o.lead_id,
        o.\`sequence\`,
        o.status,
        o.loss_reason,
        o.gain_reason,
        o.expectedCloseDate,
        o.sale_channel,
        o.campaign,
        o.\`user\`,
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
        o.dataLead,
        o.createDate,
        o.updateDate,
        o.archived,
        o.created_at,
        o.coluna_funil_id,
        CONCAT(v.name, ' ', v.lastName) as vendedor_nome
      FROM oportunidades o
      LEFT JOIN vendedores v ON o.\`user\` = v.id
      WHERE o.\`user\` = ?
        AND (v.unidade_id = ? OR v.unidade_id IS NULL)
    `

    const params: any[] = [parseInt(vendedorId), parseInt(unidadeId)]

    if (tipo === 'criadas') {
      query += ` AND DATE(o.createDate) = ?`
      params.push(data)
    } else if (tipo === 'perdidas') {
      query += ` AND DATE(o.lost_date) = ?`
      params.push(data)
    } else if (tipo === 'ganhas') {
      query += ` AND DATE(o.gain_date) = ?`
      params.push(data)
    }

    query += ` ORDER BY o.createDate DESC`

    const result = await executeQuery(query, params)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar oportunidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

