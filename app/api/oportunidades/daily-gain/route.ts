import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidades ganhas por dia do mês atual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes') || new Date().getMonth() + 1
    const ano = searchParams.get('ano') || new Date().getFullYear()
    const vendedor_id = searchParams.get('vendedor_id')
    const unidade_id = searchParams.get('unidade_id')

    // Query para buscar oportunidades ganhas agrupadas por dia
    let query = `
      SELECT 
        DAY(o.gain_date) as dia,
        DATE(o.gain_date) as data,
        COUNT(*) as total_oportunidades,
        SUM(o.value) as valor_total
      FROM oportunidades o
    `
    
    // JOIN com vendedores se necessário filtrar por unidade
    if (unidade_id) {
      query += `
        INNER JOIN vendedores v ON o.user = v.id
      `
    }
    
    query += `
      WHERE o.status = 'gain' 
        AND MONTH(o.gain_date) = ? 
        AND YEAR(o.gain_date) = ?
    `
    
    const params: any[] = [mes, ano]
    
    // Filtrar por vendedor
    if (vendedor_id) {
      query += ' AND o.user = ?'
      params.push(parseInt(vendedor_id))
    }
    
    // Filtrar por unidade
    if (unidade_id) {
      query += ' AND v.unidade_id = ?'
      params.push(parseInt(unidade_id))
    }
    
    query += `
      GROUP BY DATE(o.gain_date), DAY(o.gain_date)
      ORDER BY DATE(o.gain_date) ASC
    `

    const resultados = await executeQuery(query, params) as Array<{
      dia: number
      data: string
      total_oportunidades: number
      valor_total: number
    }>

    // Preencher dias sem dados com zero
    const diasNoMes = new Date(Number(ano), Number(mes), 0).getDate()
    const dadosCompletos = []

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const registro = resultados.find(r => r.dia === dia)
      
      if (registro) {
        dadosCompletos.push({
          dia,
          data: registro.data,
          total_oportunidades: registro.total_oportunidades,
          valor_total: Math.round(Number(registro.valor_total))
        })
      } else {
        // Preencher com zero para dias sem dados
        const dataFormatada = new Date(Number(ano), Number(mes) - 1, dia).toISOString().split('T')[0]
        dadosCompletos.push({
          dia,
          data: dataFormatada,
          total_oportunidades: 0,
          valor_total: 0
        })
      }
    }

    // Buscar meta total do mês (soma de todas as metas de vendedores ativos)
    let metaTotalMes = 0
    try {
      let metasQuery = `
        SELECT COALESCE(SUM(meta_valor), 0) as meta_total
        FROM metas_mensais
        WHERE mes = ? AND ano = ? AND status = 'ativa'
      `
      const metasParams: any[] = [mes, ano]
      
      // Filtrar metas por vendedor
      if (vendedor_id) {
        metasQuery += ' AND vendedor_id = ?'
        metasParams.push(parseInt(vendedor_id))
      }
      
      // Filtrar metas por unidade
      if (unidade_id) {
        metasQuery += ' AND unidade_id = ?'
        metasParams.push(parseInt(unidade_id))
      }
      
      const metasResult = await executeQuery(metasQuery, metasParams) as Array<{ meta_total: number }>
      metaTotalMes = Math.round(Number(metasResult[0]?.meta_total || 0))
    } catch (error) {
      console.warn('Aviso: Não foi possível buscar metas:', error)
      // Continua sem meta se houver erro
    }

    return NextResponse.json({
      success: true,
      mes: Number(mes),
      ano: Number(ano),
      dados: dadosCompletos,
      total_mes: dadosCompletos.reduce((sum, d) => sum + d.total_oportunidades, 0),
      valor_total_mes: dadosCompletos.reduce((sum, d) => sum + d.valor_total, 0),
      meta_total: metaTotalMes
    })

  } catch (error) {
    console.error('Erro ao buscar oportunidades diárias:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades diárias',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

