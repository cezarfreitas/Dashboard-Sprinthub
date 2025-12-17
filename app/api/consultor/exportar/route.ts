import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

interface Oportunidade {
  id: number
  title: string
  value: number
  status: string
  createDate: string
  gain_date: string | null
  lost_date: string | null
  user: string
  vendedor_nome: string
  vendedor_sobrenome: string
  unidade_nome: string
  crm_column: string | null
  loss_reason: string | null
  gain_reason: string | null
  sale_channel: string | null
  campaign: string | null
  fields: string | object | null
  dataLead: string | object | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  try {
    const userId = searchParams.get('user_id')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const tipo = searchParams.get('tipo') || 'criadas' // 'criadas', 'ganhas', 'perdidas', 'abertas' ou 'todas'

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Parâmetro obrigatório: user_id' 
        },
        { status: 400 }
      )
    }

    // Para tipos que precisam de período (exceto abertas)
    if (tipo !== 'abertas' && (!dataInicio || !dataFim)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Parâmetros obrigatórios: dataInicio e dataFim (exceto para tipo "abertas")' 
        },
        { status: 400 }
      )
    }

    // Montar query baseado no tipo
    let query: string
    let params: any[]
    
    if (tipo === 'todas') {
      // Exportar todas: abertas + ganhas no período + perdidas no período
      query = `
        SELECT 
          o.id,
          o.title,
          o.value,
          o.status,
          o.createDate,
          o.gain_date,
          o.lost_date,
          o.user,
          v.name as vendedor_nome,
          v.lastName as vendedor_sobrenome,
          u.name as unidade_nome,
          COALESCE(cf.nome_coluna, o.crm_column) as crm_column,
          COALESCE(mp.motivo, o.loss_reason) as loss_reason,
          o.gain_reason,
          o.sale_channel,
          o.campaign,
          o.fields,
          o.dataLead
        FROM oportunidades o
        LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
        LEFT JOIN unidades u ON v.unidade_id = u.id
        LEFT JOIN colunas_funil cf ON (
          (o.coluna_funil_id IS NOT NULL AND o.coluna_funil_id = cf.id)
          OR
          (o.coluna_funil_id IS NULL AND o.crm_column IS NOT NULL AND CAST(o.crm_column AS UNSIGNED) = cf.id)
        )
        LEFT JOIN motivos_de_perda mp ON CAST(
          CASE 
            WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
            ELSE o.loss_reason
          END AS UNSIGNED
        ) = mp.id
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.archived = 0
          AND (
            o.status IN ('open', 'aberta', 'active')
            OR
            (o.status = 'gain' AND o.gain_date IS NOT NULL 
             AND o.gain_date >= ? AND o.gain_date <= ?)
            OR
            (o.status = 'lost' AND o.lost_date IS NOT NULL 
             AND o.lost_date >= ? AND o.lost_date <= ?)
          )
        ORDER BY 
          CASE 
            WHEN o.status IN ('open', 'aberta', 'active') THEN o.createDate
            WHEN o.status = 'gain' THEN o.gain_date
            WHEN o.status = 'lost' THEN o.lost_date
            ELSE o.createDate
          END DESC,
          o.id DESC
      `
      params = [
        parseInt(userId),
        dataInicio + ' 00:00:00',
        dataFim + ' 23:59:59',
        dataInicio + ' 00:00:00',
        dataFim + ' 23:59:59'
      ]
    } else if (tipo === 'ganhas') {
      // Apenas ganhas com gain_date no período
      query = `
        SELECT 
          o.id,
          o.title,
          o.value,
          o.status,
          o.createDate,
          o.gain_date,
          o.lost_date,
          o.user,
          v.name as vendedor_nome,
          v.lastName as vendedor_sobrenome,
          u.name as unidade_nome,
          COALESCE(cf.nome_coluna, o.crm_column) as crm_column,
          COALESCE(mp.motivo, o.loss_reason) as loss_reason,
          o.gain_reason,
          o.sale_channel,
          o.campaign,
          o.fields,
          o.dataLead
        FROM oportunidades o
        LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
        LEFT JOIN unidades u ON v.unidade_id = u.id
        LEFT JOIN colunas_funil cf ON (
          (o.coluna_funil_id IS NOT NULL AND o.coluna_funil_id = cf.id)
          OR
          (o.coluna_funil_id IS NULL AND o.crm_column IS NOT NULL AND CAST(o.crm_column AS UNSIGNED) = cf.id)
        )
        LEFT JOIN motivos_de_perda mp ON CAST(
          CASE 
            WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
            ELSE o.loss_reason
          END AS UNSIGNED
        ) = mp.id
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.archived = 0
          AND o.status = 'gain' 
          AND o.gain_date IS NOT NULL
          AND o.gain_date >= ? 
          AND o.gain_date <= ?
        ORDER BY o.gain_date DESC, o.id DESC
      `
      params = [parseInt(userId), dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
    } else if (tipo === 'perdidas') {
      // Apenas perdidas com lost_date no período
      query = `
        SELECT 
          o.id,
          o.title,
          o.value,
          o.status,
          o.createDate,
          o.gain_date,
          o.lost_date,
          o.user,
          v.name as vendedor_nome,
          v.lastName as vendedor_sobrenome,
          u.name as unidade_nome,
          COALESCE(cf.nome_coluna, o.crm_column) as crm_column,
          COALESCE(mp.motivo, o.loss_reason) as loss_reason,
          o.gain_reason,
          o.sale_channel,
          o.campaign,
          o.fields,
          o.dataLead
        FROM oportunidades o
        LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
        LEFT JOIN unidades u ON v.unidade_id = u.id
        LEFT JOIN colunas_funil cf ON (
          (o.coluna_funil_id IS NOT NULL AND o.coluna_funil_id = cf.id)
          OR
          (o.coluna_funil_id IS NULL AND o.crm_column IS NOT NULL AND CAST(o.crm_column AS UNSIGNED) = cf.id)
        )
        LEFT JOIN motivos_de_perda mp ON CAST(
          CASE 
            WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
            ELSE o.loss_reason
          END AS UNSIGNED
        ) = mp.id
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.archived = 0
          AND o.status = 'lost' 
          AND o.lost_date IS NOT NULL
          AND o.lost_date >= ? 
          AND o.lost_date <= ?
        ORDER BY o.lost_date DESC, o.id DESC
      `
      params = [parseInt(userId), dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
    } else if (tipo === 'abertas') {
      // Apenas abertas (todas, sem filtro de data)
      query = `
        SELECT 
          o.id,
          o.title,
          o.value,
          o.status,
          o.createDate,
          o.gain_date,
          o.lost_date,
          o.user,
          v.name as vendedor_nome,
          v.lastName as vendedor_sobrenome,
          u.name as unidade_nome,
          COALESCE(cf.nome_coluna, o.crm_column) as crm_column,
          COALESCE(mp.motivo, o.loss_reason) as loss_reason,
          o.gain_reason,
          o.sale_channel,
          o.campaign,
          o.fields,
          o.dataLead
        FROM oportunidades o
        LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
        LEFT JOIN unidades u ON v.unidade_id = u.id
        LEFT JOIN colunas_funil cf ON (
          (o.coluna_funil_id IS NOT NULL AND o.coluna_funil_id = cf.id)
          OR
          (o.coluna_funil_id IS NULL AND o.crm_column IS NOT NULL AND CAST(o.crm_column AS UNSIGNED) = cf.id)
        )
        LEFT JOIN motivos_de_perda mp ON CAST(
          CASE 
            WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
            ELSE o.loss_reason
          END AS UNSIGNED
        ) = mp.id
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.archived = 0
          AND o.status IN ('open', 'aberta', 'active')
        ORDER BY o.createDate DESC, o.id DESC
      `
      params = [parseInt(userId)]
    } else {
      // Criadas no período
      query = `
        SELECT 
          o.id,
          o.title,
          o.value,
          o.status,
          o.createDate,
          o.gain_date,
          o.lost_date,
          o.user,
          v.name as vendedor_nome,
          v.lastName as vendedor_sobrenome,
          u.name as unidade_nome,
          COALESCE(cf.nome_coluna, o.crm_column) as crm_column,
          COALESCE(mp.motivo, o.loss_reason) as loss_reason,
          o.gain_reason,
          o.sale_channel,
          o.campaign,
          o.fields,
          o.dataLead
        FROM oportunidades o
        LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
        LEFT JOIN unidades u ON v.unidade_id = u.id
        LEFT JOIN colunas_funil cf ON (
          (o.coluna_funil_id IS NOT NULL AND o.coluna_funil_id = cf.id)
          OR
          (o.coluna_funil_id IS NULL AND o.crm_column IS NOT NULL AND CAST(o.crm_column AS UNSIGNED) = cf.id)
        )
        LEFT JOIN motivos_de_perda mp ON CAST(
          CASE 
            WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
            ELSE o.loss_reason
          END AS UNSIGNED
        ) = mp.id
        WHERE CAST(o.user AS UNSIGNED) = ?
          AND o.archived = 0
          AND o.createDate >= ? 
          AND o.createDate <= ?
        ORDER BY o.createDate DESC, o.id DESC
      `
      params = [parseInt(userId), dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
    }

    const oportunidades = await executeQuery(query, params) as Oportunidade[]

    return NextResponse.json({
      success: true,
      data: oportunidades
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao exportar oportunidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}


