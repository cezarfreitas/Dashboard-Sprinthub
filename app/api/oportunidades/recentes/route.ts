import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Buscar oportunidades recentes (criadas, ganhas ou perdidas)
    // Ordenar por data mais recente usando updateDate
    const oportunidades = await executeQuery(`
      SELECT 
        o.id,
        o.title,
        o.value,
        o.status,
        o.createDate,
        o.gain_date,
        o.lost_date,
        o.updateDate,
        o.user as vendedor_id,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        u.nome as unidade_nome,
        u.name as unidade_name
      FROM oportunidades o
      LEFT JOIN vendedores v ON o.user = v.id
      LEFT JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      LEFT JOIN unidades u ON vu.unidade_id = u.id
      WHERE (o.createDate IS NOT NULL 
        OR o.gain_date IS NOT NULL 
        OR o.lost_date IS NOT NULL)
      ORDER BY 
        CASE 
          WHEN o.updateDate IS NOT NULL THEN o.updateDate
          WHEN o.createDate IS NOT NULL THEN o.createDate
          ELSE '1970-01-01'
        END DESC
      LIMIT ?
    `, [limit]) as any[]

    // Formatar dados
    const oportunidadesFormatadas = oportunidades.map(op => {
      // Determinar a data mais recente
      let dataRecente = op.updateDate || op.createDate
      
      // Se tiver data de ganho ou perda mais recente, usar essa
      if (op.gain_date && (!dataRecente || new Date(op.gain_date) > new Date(dataRecente))) {
        dataRecente = op.gain_date
      }
      if (op.lost_date && (!dataRecente || new Date(op.lost_date) > new Date(dataRecente))) {
        dataRecente = op.lost_date
      }
      
      return {
        id: op.id,
        nome: op.title || 'Sem nome',
        valor: op.value || 0,
        status: op.status || 'open',
        dataCriacao: dataRecente,
        vendedor: op.vendedor_nome 
          ? `${op.vendedor_nome} ${op.vendedor_sobrenome || ''}`.trim()
          : 'Sem vendedor',
        unidade: op.unidade_nome || op.unidade_name || 'Sem unidade'
      }
    })

    return NextResponse.json({
      success: true,
      oportunidades: oportunidadesFormatadas
    })

  } catch (error) {
    console.error('Erro ao buscar oportunidades recentes:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar oportunidades recentes',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

