import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Buscar oportunidades recentes (criadas, ganhas ou perdidas)
    // Ordenar por data mais recente (createDate para criadas, gain_date para ganhas, lost_date para perdidas)
    const oportunidades = await executeQuery(`
      SELECT 
        o.id,
        o.name,
        o.value,
        o.status,
        o.createDate,
        o.gain_date,
        o.lost_date,
        GREATEST(
          COALESCE(o.createDate, '1970-01-01'),
          COALESCE(o.gain_date, '1970-01-01'),
          COALESCE(o.lost_date, '1970-01-01')
        ) as data_recente,
        o.user as vendedor_id,
        v.name as vendedor_nome,
        v.lastName as vendedor_sobrenome,
        u.nome as unidade_nome,
        u.name as unidade_name
      FROM oportunidades o
      LEFT JOIN vendedores v ON o.user = v.id
      LEFT JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      LEFT JOIN unidades u ON vu.unidade_id = u.id
      WHERE o.createDate IS NOT NULL 
        OR o.gain_date IS NOT NULL 
        OR o.lost_date IS NOT NULL
      ORDER BY data_recente DESC
      LIMIT ?
    `, [limit]) as any[]

    // Formatar dados
    const oportunidadesFormatadas = oportunidades.map(op => {
      // Usar a data mais recente (criação, ganho ou perda)
      const dataRecente = op.data_recente || op.createDate || op.gain_date || op.lost_date
      
      return {
        id: op.id,
        nome: op.name || 'Sem nome',
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

