import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidades criadas por dia do mês atual
export async function GET(request: NextRequest) {
  try {
    // Verificar se coluna createDate existe na tabela oportunidades
    const checkCreateDateColumn = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'oportunidades' 
      AND COLUMN_NAME = 'createDate'
    `) as any[]

    if (checkCreateDateColumn.length === 0) {
      await executeQuery(`
        ALTER TABLE oportunidades 
        ADD COLUMN createDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        ADD INDEX idx_createDate (createDate)
      `)
    }

    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes') || (new Date().getMonth() + 1).toString()
    const ano = searchParams.get('ano') || new Date().getFullYear().toString()
    const vendedor_id = searchParams.get('vendedor_id')
    const unidade_id = searchParams.get('unidade_id')

    // Calcular mês anterior
    const mesAtual = parseInt(mes.toString())
    const anoAtual = parseInt(ano.toString())
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual

    // Query para buscar oportunidades criadas agrupadas por dia (mês atual e anterior)
    let query = `
      SELECT 
        DAY(o.createDate) as dia,
        DATE(o.createDate) as data,
        COUNT(*) as total_criadas,
        CASE 
          WHEN MONTH(o.createDate) = ? AND YEAR(o.createDate) = ? THEN 'atual'
          WHEN MONTH(o.createDate) = ? AND YEAR(o.createDate) = ? THEN 'anterior'
        END as periodo
      FROM oportunidades o
    `
    
    // JOIN com vendedores se necessário filtrar por unidade
    if (unidade_id) {
      query += `
        INNER JOIN vendedores v ON o.user = v.id
      `
    }
    
    query += `
      WHERE (
        (MONTH(o.createDate) = ? AND YEAR(o.createDate) = ?) OR
        (MONTH(o.createDate) = ? AND YEAR(o.createDate) = ?)
      )
    `
    
    const params: any[] = [mesAtual, anoAtual, mesAnterior, anoAnterior, mesAtual, anoAtual, mesAnterior, anoAnterior]
    
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
      GROUP BY DATE(o.createDate), DAY(o.createDate), periodo
      ORDER BY DATE(o.createDate) ASC
    `

    const resultados = await executeQuery(query, params) as Array<{
      dia: number
      data: string
      total_criadas: number
      periodo: string
    }>


    // Separar resultados por período
    const resultadosAtual = resultados.filter(r => r.periodo === 'atual')
    const resultadosAnterior = resultados.filter(r => r.periodo === 'anterior')

    // Preencher dias sem dados com zero
    const diasNoMes = new Date(Number(ano), Number(mes), 0).getDate()
    const dadosCompletos = []

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const resultadoAtual = resultadosAtual.find(r => r.dia === dia)
      const resultadoAnterior = resultadosAnterior.find(r => r.dia === dia)
      
      dadosCompletos.push({
        dia,
        data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        total_criadas: resultadoAtual?.total_criadas || 0,
        total_criadas_anterior: resultadoAnterior?.total_criadas || 0
      })
    }


    return NextResponse.json({
      success: true,
      mes: Number(mes),
      ano: Number(ano),
      mes_anterior: mesAnterior,
      ano_anterior: anoAnterior,
      dados: dadosCompletos,
      total_mes: dadosCompletos.reduce((sum, d) => sum + d.total_criadas, 0),
      total_mes_anterior: dadosCompletos.reduce((sum, d) => sum + d.total_criadas_anterior, 0)
    })

  } catch (error) {
    console.error('Erro ao buscar oportunidades criadas diárias:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades criadas diárias',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
