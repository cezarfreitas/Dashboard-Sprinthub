import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar oportunidades criadas por vendedor e dia do mês
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes') ? parseInt(searchParams.get('mes')!) : null
    const ano = searchParams.get('ano') ? parseInt(searchParams.get('ano')!) : null
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const unidade_id = searchParams.get('unidade_id')
    const tipo = searchParams.get('tipo') || 'criadas' // 'criadas', 'ganhas' ou 'perdidas'

    if (!unidade_id) {
      return NextResponse.json(
        { success: false, message: 'unidade_id é obrigatório' },
        { status: 400 }
      )
    }

    // Determinar mes/ano para compatibilidade
    let mesFinal = mes
    let anoFinal = ano
    if (!mesFinal || !anoFinal) {
      if (dataInicio) {
        const dataInicioObj = new Date(dataInicio + ' 00:00:00')
        mesFinal = dataInicioObj.getMonth() + 1
        anoFinal = dataInicioObj.getFullYear()
      } else {
        const hoje = new Date()
        mesFinal = hoje.getMonth() + 1
        anoFinal = hoje.getFullYear()
      }
    }

    // Buscar vendedores da unidade através do campo users (JSON)
    const unidade = await executeQuery(`
      SELECT users FROM unidades WHERE id = ?
    `, [parseInt(unidade_id)]) as any[]

    if (!unidade || unidade.length === 0) {
      return NextResponse.json({
        success: true,
        dados: [],
        vendedores: []
      })
    }

    // Parsear lista de vendedores do JSON
    let userIds: number[] = []
    try {
      const usersData = unidade[0].users
      const parsedUsers = typeof usersData === 'string' 
        ? JSON.parse(usersData) 
        : usersData
      
      if (Array.isArray(parsedUsers)) {
        userIds = parsedUsers
          .map((u: any) => typeof u === 'object' ? u.id : u)
          .filter((id: any) => typeof id === 'number' || !isNaN(Number(id)))
          .map((id: any) => Number(id))
      }
    } catch (e) {
      // Erro silencioso
    }

    // Se não houver vendedores na unidade, retornar vazio
    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        dados: [],
        vendedores: []
      })
    }

    const placeholders = userIds.map(() => '?').join(',')
    let query = ''
    let params: any[] = []
    
    // Definir campo de data e condição baseado no tipo
    const campoData = 
      tipo === 'ganhas' ? 'o.gain_date' :
      tipo === 'perdidas' ? 'o.lost_date' :
      'o.createDate'
    
    const condicaoStatus = 
      tipo === 'ganhas' ? "AND o.status = 'gain'" :
      tipo === 'perdidas' ? "AND o.status = 'lost'" :
      ''
    
    // Adicionar soma de valor se for ganhas
    const campoValor = tipo === 'ganhas' ? ', COALESCE(SUM(o.value), 0) as valor_total' : ''
    
    if (dataInicio && dataFim) {
      query = `
        SELECT 
          CAST(o.user AS UNSIGNED) as vendedor_id,
          DATE(${campoData}) as data,
          DAY(${campoData}) as dia,
          COUNT(*) as total_criadas
          ${campoValor}
        FROM oportunidades o
        WHERE CAST(o.user AS UNSIGNED) IN (${placeholders})
          AND ${campoData} >= ? AND ${campoData} <= ?
          AND o.archived = 0
          ${condicaoStatus}
        GROUP BY CAST(o.user AS UNSIGNED), DATE(${campoData}), DAY(${campoData})
        ORDER BY CAST(o.user AS UNSIGNED), data
      `
      params = [...userIds, dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
    } else {
      query = `
        SELECT 
          CAST(o.user AS UNSIGNED) as vendedor_id,
          DATE(${campoData}) as data,
          DAY(${campoData}) as dia,
          COUNT(*) as total_criadas
          ${campoValor}
        FROM oportunidades o
        WHERE CAST(o.user AS UNSIGNED) IN (${placeholders})
          AND MONTH(${campoData}) = ?
          AND YEAR(${campoData}) = ?
          AND o.archived = 0
          ${condicaoStatus}
        GROUP BY CAST(o.user AS UNSIGNED), DATE(${campoData}), DAY(${campoData})
        ORDER BY CAST(o.user AS UNSIGNED), data
      `
      params = [...userIds, mesFinal, anoFinal]
    }

    const resultados = await executeQuery(query, params) as Array<{
      vendedor_id: number | string
      data?: string
      dia: number
      total_criadas: number
      valor_total?: number
    }>

    // Converter vendedor_id para número e garantir que os dados estejam corretos
    const dadosFormatados = resultados.map(item => ({
      ...item,
      vendedor_id: Number(item.vendedor_id),
      total_criadas: Number(item.total_criadas) || 0,
      valor_total: item.valor_total ? Number(item.valor_total) : undefined
    }))

    // Buscar informações dos vendedores que aparecem nas oportunidades
    const vendedorIdsUnicos = Array.from(new Set(dadosFormatados.map(d => d.vendedor_id)))
    
    let vendedoresInfo: Array<{ id: number; name: string; lastName: string }> = []
    
    if (vendedorIdsUnicos.length > 0) {
      const vendedoresPlaceholders = vendedorIdsUnicos.map(() => '?').join(',')
      const vendedoresQuery = `
        SELECT 
          id,
          name,
          lastName
        FROM vendedores
        WHERE id IN (${vendedoresPlaceholders})
      `
      vendedoresInfo = await executeQuery(vendedoresQuery, vendedorIdsUnicos) as Array<{
        id: number
        name: string
        lastName: string
      }>
    }
    
    return NextResponse.json({
      success: true,
      dados: dadosFormatados,
      vendedores: vendedoresInfo
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

