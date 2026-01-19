import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Parsear vendedores da unidade
function parseJSON(value: any): any[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

// GET - Buscar detalhes das oportunidades de uma coluna específica da unidade
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadeId = searchParams.get('unidade_id')
    const colunaFunilId = searchParams.get('coluna_funil_id') // Opcional
    const status = searchParams.get('status') || 'open'
    const comValor = searchParams.get('com_valor') === '1'
    const vendedorId = searchParams.get('vendedor_id') // Opcional: filtrar por vendedor específico

    if (!unidadeId) {
      return NextResponse.json(
        { success: false, message: 'unidade_id é obrigatório' },
        { status: 400 }
      )
    }

    const unidadeIdInt = parseInt(unidadeId)

    // Buscar unidade e seus vendedores
    const unidade = await executeQuery(`
      SELECT 
        u.id, 
        COALESCE(u.nome, u.name) as nome, 
        u.users
      FROM unidades u
      WHERE u.id = ? AND u.ativo = 1
    `, [unidadeIdInt]) as any[]

    if (!unidade || unidade.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const parsedUsers = parseJSON(unidade[0].users)
    const userIds = parsedUsers
      .map((u: any) => typeof u === 'object' ? u.id : u)
      .filter((id: any) => typeof id === 'number')

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Se vendedor_id foi fornecido, filtrar apenas esse vendedor (verificando se ele pertence à unidade)
    let vendedoresIds: number[] = []
    
    if (vendedorId) {
      const vendedorIdInt = parseInt(vendedorId)
      // Verificar se o vendedor pertence à unidade
      if (userIds.includes(vendedorIdInt)) {
        vendedoresIds = [vendedorIdInt]
      } else {
        return NextResponse.json({
          success: true,
          data: []
        })
      }
    } else {
      // Buscar vendedores ativos (opcional: pode remover para incluir todos)
      const todosVendedores = await executeQuery(`
        SELECT id FROM vendedores WHERE ativo = 1
      `) as any[]
      const vendedoresAtivosSet = new Set(todosVendedores.map(v => v.id))
      vendedoresIds = userIds.filter((id: number) => vendedoresAtivosSet.has(id))
    }

    if (vendedoresIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Construir query com filtro por vendedores
    const placeholders = vendedoresIds.map(() => '?').join(',')
    
    // Se status for 'lost' ou 'gain', filtrar por status e data do mês atual
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()
    
    let statusFilter = ''
    const params: any[] = [...vendedoresIds]
    
    if (status === 'lost' || status === 'loss' || status === 'perdido') {
      statusFilter = `AND o.status IN ('lost', 'loss', 'perdido') AND o.lost_date IS NOT NULL AND MONTH(o.lost_date) = ? AND YEAR(o.lost_date) = ?`
      params.push(mesAtual, anoAtual)
    } else if (status === 'gain' || status === 'won' || status === 'ganho') {
      statusFilter = `AND o.status IN ('gain', 'won', 'ganho') AND o.gain_date IS NOT NULL AND MONTH(o.gain_date) = ? AND YEAR(o.gain_date) = ?`
      params.push(mesAtual, anoAtual)
    } else {
      statusFilter = `AND o.status = ?`
      params.push(status)
    }
    
    let query = `
      SELECT 
        o.id,
        o.title,
        o.value,
        o.createDate,
        o.crm_column,
        o.status,
        o.user,
        o.lost_date,
        o.gain_date,
        DATEDIFF(NOW(), o.createDate) as dias_aberta,
        CONCAT(v.name, ' ', v.lastName) as vendedor_nome
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      WHERE o.archived = 0
        AND o.user IN (${placeholders})
        ${statusFilter}
    `

    // Se coluna_funil_id foi fornecida, adiciona ao filtro
    if (colunaFunilId) {
      query += ` AND o.coluna_funil_id = ?`
      params.push(colunaFunilId)
    }

    if (comValor) {
      query += ` AND o.value > 0`
    }

    // Ordenar por data apropriada conforme status
    if (status === 'lost' || status === 'loss' || status === 'perdido') {
      query += ` ORDER BY o.lost_date DESC`
    } else if (status === 'gain' || status === 'won' || status === 'ganho') {
      query += ` ORDER BY o.gain_date DESC`
    } else {
      query += ` ORDER BY o.createDate DESC`
    }

    const oportunidades = await executeQuery(query, params) as Array<{
      id: string | number
      title: string
      value: number
      createDate: string
      crm_column: string
      status: string
      vendedor_nome: string | null
      dias_aberta: number
    }>

    return NextResponse.json({
      success: true,
      data: oportunidades
    })

  } catch (error) {
    console.error('❌ Erro ao buscar detalhes das oportunidades:', error)
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
