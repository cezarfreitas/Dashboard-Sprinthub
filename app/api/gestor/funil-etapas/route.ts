import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const unidadeId = searchParams.get('unidade_id')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const funilId = searchParams.get('funil_id')

    if (!unidadeId || !dataInicio || !dataFim) {
      return NextResponse.json(
        { success: false, message: 'Parâmetros obrigatórios ausentes' },
        { status: 400 }
      )
    }

    let query = `
      SELECT
        e.id AS etapa_id,
        e.name AS etapa_nome,
        COUNT(o.id) AS quantidade,
        COALESCE(SUM(o.value), 0) AS valor_total
      FROM etapas e
      LEFT JOIN oportunidades o ON o.stage_id = e.id
        AND o.unidade_id = ?
        AND o.create_date >= ?
        AND o.create_date <= ?
        AND o.deleted = 0
        ${funilId ? 'AND o.funil_id = ?' : ''}
      WHERE e.deleted = 0
      GROUP BY e.id, e.name, e.sequence
      HAVING quantidade > 0
      ORDER BY e.sequence ASC
    `

    const params: any[] = [unidadeId, dataInicio, dataFim]
    if (funilId) {
      params.push(funilId)
    }

    const [rows] = await pool.query(query, params)
    const etapas = rows as any[]

    // Calcular total para percentuais
    const totalOportunidades = etapas.reduce((sum, etapa) => sum + Number(etapa.quantidade), 0)

    // Adicionar percentual
    const etapasComPercentual = etapas.map(etapa => ({
      etapa_id: etapa.etapa_id,
      etapa_nome: etapa.etapa_nome,
      quantidade: Number(etapa.quantidade),
      valor_total: Number(etapa.valor_total),
      percentual: totalOportunidades > 0 ? (Number(etapa.quantidade) / totalOportunidades) * 100 : 0
    }))

    return NextResponse.json({
      success: true,
      etapas: etapasComPercentual
    })
  } catch (error) {
    console.error('Erro ao buscar etapas do funil:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar etapas do funil' },
      { status: 500 }
    )
  }
}
