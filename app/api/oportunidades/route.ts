import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface Oportunidade {
  id: number
  user: string // ID do vendedor
  value: number
  gain_date: string
  status?: string
  created_at?: string
  updated_at?: string
}

// GET - Buscar oportunidades por período
export async function GET(request: NextRequest) {
  try {
    // Verificar se coluna status existe na tabela oportunidades
    const checkColumn = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'oportunidades' 
      AND COLUMN_NAME = 'status'
    `) as any[]

    if (checkColumn.length === 0) {
      await executeQuery(`
        ALTER TABLE oportunidades 
        ADD COLUMN status VARCHAR(50) DEFAULT 'open',
        ADD INDEX idx_status (status)
      `)
    }

    // Verificar se coluna lost_date existe na tabela oportunidades
    const checkLostDateColumn = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'oportunidades' 
      AND COLUMN_NAME = 'lost_date'
    `) as any[]

    if (checkLostDateColumn.length === 0) {
      await executeQuery(`
        ALTER TABLE oportunidades 
        ADD COLUMN lost_date DATETIME NULL,
        ADD INDEX idx_lost_date (lost_date)
      `)
    }

    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const user = searchParams.get('user')
    const status = searchParams.get('status')
    const dateField = searchParams.get('dateField') || 'gain_date'

    let query = 'SELECT * FROM oportunidades WHERE 1=1'
    const params: any[] = []

    // Se parâmetro debug=status, retornar valores únicos de status
    if (searchParams.get('debug') === 'status') {
      const statusQuery = 'SELECT DISTINCT status, COUNT(*) as count FROM oportunidades GROUP BY status'
      const statusResults = await executeQuery(statusQuery) as Array<{status: string, count: number}>
      
      return NextResponse.json({
        success: true,
        debug: 'status_values',
        status_values: statusResults
      })
    }

    // Filtrar por status se fornecido
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    // Filtrar por mês/ano se fornecido
    if (mes && ano) {
      query += ` AND MONTH(${dateField}) = ? AND YEAR(${dateField}) = ?`
      params.push(parseInt(mes), parseInt(ano))
    } else if (ano) {
      query += ` AND YEAR(${dateField}) = ?`
      params.push(parseInt(ano))
    }

    // Filtrar por usuário se fornecido
    if (user) {
      query += ' AND user = ?'
      params.push(user)
    }

    query += ` ORDER BY ${dateField} DESC`

    const oportunidades = await executeQuery(query, params) as Oportunidade[]

    return NextResponse.json({
      success: true,
      oportunidades,
      total: oportunidades.length
    })

  } catch (error) {
    console.error('Erro ao buscar oportunidades:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST para ranking - endpoint específico para calcular ranking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo = 'mensal', mes, ano, agruparPor = 'vendedor' } = body

    const anoAtual = ano || new Date().getFullYear()
    const mesAtual = mes || new Date().getMonth() + 1

    let query: string
    const params: any[] = []

    if (agruparPor === 'unidade') {
      // Ranking por unidade - precisa fazer JOIN com vendedores_unidades
      if (tipo === 'mensal') {
        query = `
          SELECT 
            vu.unidade_id,
            SUM(o.value) as total_realizado,
            COUNT(o.id) as total_oportunidades
          FROM oportunidades o
          INNER JOIN vendedores v ON o.user = v.id
          INNER JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
          WHERE MONTH(o.gain_date) = ? AND YEAR(o.gain_date) = ?
          GROUP BY vu.unidade_id
          ORDER BY total_realizado DESC
        `
        params.push(mesAtual, anoAtual)
      } else {
        query = `
          SELECT 
            vu.unidade_id,
            SUM(o.value) as total_realizado,
            COUNT(o.id) as total_oportunidades
          FROM oportunidades o
          INNER JOIN vendedores v ON o.user = v.id
          INNER JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
          WHERE YEAR(o.gain_date) = ? AND MONTH(o.gain_date) <= ?
          GROUP BY vu.unidade_id
          ORDER BY total_realizado DESC
        `
        params.push(anoAtual, mesAtual)
      }
    } else {
      // Ranking por vendedor (comportamento original)
      if (tipo === 'mensal') {
        query = `
          SELECT 
            user,
            SUM(value) as total_realizado,
            COUNT(*) as total_oportunidades
          FROM oportunidades 
          WHERE MONTH(gain_date) = ? AND YEAR(gain_date) = ?
          GROUP BY user
          ORDER BY total_realizado DESC
        `
        params.push(mesAtual, anoAtual)
      } else {
        query = `
          SELECT 
            user,
            SUM(value) as total_realizado,
            COUNT(*) as total_oportunidades
          FROM oportunidades 
          WHERE YEAR(gain_date) = ? AND MONTH(gain_date) <= ?
          GROUP BY user
          ORDER BY total_realizado DESC
        `
        params.push(anoAtual, mesAtual)
      }
    }

    const resultados = await executeQuery(query, params)

    return NextResponse.json({
      success: true,
      tipo,
      agruparPor,
      periodo: tipo === 'mensal' ? `${mesAtual}/${anoAtual}` : `Acumulado até ${mesAtual}/${anoAtual}`,
      ranking: resultados
    })

  } catch (error) {
    console.error('Erro ao calcular ranking:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao calcular ranking',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
