import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar dados brutos das oportunidades para criar gráficos customizados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodoInicio = searchParams.get('data_inicio')
    const periodoFim = searchParams.get('data_fim')
    const limit = parseInt(searchParams.get('limit') || '1000')

    // Construir filtro de data
    let filtroData = ''
    const params: any[] = []
    
    if (periodoInicio && periodoFim) {
      filtroData = `AND DATE(o.createDate) BETWEEN ? AND ?`
      params.push(periodoInicio, periodoFim)
    }

    // Buscar dados brutos das oportunidades com JOIN em vendedores
    const query = `
      SELECT 
        o.id,
        o.title,
        o.value,
        o.status,
        o.crm_column,
        o.sale_channel,
        o.campaign,
        o.user as vendedor_id,
        COALESCE(
          CONCAT(v.name, ' ', v.lastName),
          v.name,
          v.username,
          o.user,
          'Não informado'
        ) as vendedor,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        v.username as vendedor_username,
        o.loss_reason,
        o.gain_reason,
        DATE(o.createDate) as data_criacao,
        DATE(o.gain_date) as data_ganho,
        DATE(o.lost_date) as data_perda,
        DATE(o.expectedCloseDate) as data_fechamento_esperada,
        DATE_FORMAT(o.createDate, '%Y-%m') as mes_criacao,
        DATE_FORMAT(o.createDate, '%Y') as ano_criacao,
        DATE_FORMAT(o.createDate, '%m') as mes_numero,
        DAY(o.createDate) as dia_criacao,
        DAYNAME(o.createDate) as dia_semana,
        CASE 
          WHEN o.status = 'won' THEN 'Ganha'
          WHEN o.status = 'lost' THEN 'Perdida'
          WHEN o.status = 'open' THEN 'Aberta'
          ELSE 'Outro'
        END as status_pt,
        o.fields,
        o.dataLead
      FROM oportunidades o
      LEFT JOIN vendedores v ON o.user = v.id
      WHERE o.archived = 0
        ${filtroData}
      ORDER BY o.createDate DESC
      LIMIT ?
    `
    
    params.push(limit)
    const oportunidades = await executeQuery(query, params) as any[]

    // Função para extrair campos do JSON
    const parseJsonFields = (jsonData: any) => {
      if (!jsonData) return {}
      try {
        const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
        return parsed || {}
      } catch {
        return {}
      }
    }

    // Retornar dados formatados com campos expandidos
    return NextResponse.json({
      success: true,
      data: oportunidades.map(op => {
        // Parsear fields e dataLead
        const fields = parseJsonFields(op.fields)
        const dataLead = parseJsonFields(op.dataLead)

        // Extrair campos comuns do dataLead
        const leadData = {
          lead_nome: dataLead.name || dataLead.nome || null,
          lead_email: dataLead.email || null,
          lead_telefone: dataLead.phone || dataLead.telefone || dataLead.celular || null,
          lead_cidade: dataLead.city || dataLead.cidade || null,
          lead_estado: dataLead.state || dataLead.estado || dataLead.uf || null,
          lead_origem: dataLead.source || dataLead.origem || null,
          lead_interesse: dataLead.interest || dataLead.interesse || null,
        }

        return {
          id: op.id,
          title: op.title || '',
          value: Number(op.value || 0),
          status: op.status || 'unknown',
          status_pt: op.status_pt || 'Outro',
          crm_column: op.crm_column || 'Não informado',
          sale_channel: op.sale_channel || 'Não informado',
          campaign: op.campaign || 'Não informado',
          vendedor: op.vendedor || 'Não informado',
          vendedor_id: op.vendedor_id || null,
          vendedor_nome: op.vendedor_nome || null,
          vendedor_sobrenome: op.vendedor_sobrenome || null,
          vendedor_username: op.vendedor_username || null,
          loss_reason: op.loss_reason || null,
          gain_reason: op.gain_reason || null,
          data_criacao: op.data_criacao || null,
          data_ganho: op.data_ganho || null,
          data_perda: op.data_perda || null,
          data_fechamento_esperada: op.data_fechamento_esperada || null,
          mes_criacao: op.mes_criacao || null,
          ano_criacao: op.ano_criacao || null,
          mes_numero: op.mes_numero || null,
          dia_criacao: op.dia_criacao || null,
          dia_semana: op.dia_semana || null,
          // Campos extraídos do dataLead
          ...leadData
        }
      }),
      total: oportunidades.length
    })

  } catch (error) {
    console.error('Erro ao buscar dados brutos:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar dados',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

