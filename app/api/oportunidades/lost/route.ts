import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para parsear JSON com segurança
function parseJSON(value: any): any[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

// Função para construir filtro de unidade
async function buildUnidadeFilter(unidadeIdsParam: string | null): Promise<number[]> {
  if (!unidadeIdsParam) return []

  const unidadeIds = unidadeIdsParam
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id) && id > 0)

  if (unidadeIds.length === 0) return []

  const placeholders = unidadeIds.map(() => '?').join(',')
  const unidades = await executeQuery(
    `SELECT id, COALESCE(nome, name) as nome, users FROM unidades WHERE id IN (${placeholders}) AND ativo = 1`,
    unidadeIds
  ) as any[]

  if (!unidades || unidades.length === 0) {
    return []
  }

  // Buscar todos os vendedores ativos
  const todosVendedoresAtivos = await executeQuery(
    'SELECT id FROM vendedores WHERE ativo = 1'
  ) as any[]
  const vendedoresAtivosSet = new Set(todosVendedoresAtivos.map(v => v.id))

  // Extrair IDs de vendedores das unidades e filtrar apenas os ativos
  const todosVendedoresIds = new Set<number>()
  unidades.forEach(unidade => {
    if (!unidade.users) {
      return
    }

    const parsedUsers = parseJSON(unidade.users)
    
    if (!Array.isArray(parsedUsers) || parsedUsers.length === 0) {
      return
    }

    parsedUsers.forEach((u: any) => {
      let id: any = null
      
      if (typeof u === 'object' && u !== null) {
        id = u.id || u.user_id || u.vendedor_id
      } else if (typeof u === 'number') {
        id = u
      } else if (typeof u === 'string') {
        const parsed = parseInt(u.trim())
        if (!isNaN(parsed)) id = parsed
      }
      
      if (id != null && !isNaN(Number(id))) {
        const userId = Number(id)
        if (vendedoresAtivosSet.has(userId)) {
          todosVendedoresIds.add(userId)
        }
      }
    })
  })

  return Array.from(todosVendedoresIds)
}

// GET - Buscar resumo de oportunidades perdidas agrupadas por motivo de perda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const unidadeIdParam = searchParams.get('unidade_id')
    const userIdParam = searchParams.get('user_id') || searchParams.get('vendedor_id')
    const lostDateStart = searchParams.get('lost_date_start') || searchParams.get('data_inicio')
    const lostDateEnd = searchParams.get('lost_date_end') || searchParams.get('data_fim')
    const allParam = searchParams.get('all') === '1'
    
    // Validar e corrigir datas
    let dataInicioValida: string | null = null
    let dataFimValida: string | null = null

    if (lostDateStart) {
      try {
        const dataInicio = new Date(lostDateStart + 'T00:00:00')
        if (!isNaN(dataInicio.getTime())) {
          dataInicioValida = lostDateStart
        } else {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Data de início inválida. Use o formato YYYY-MM-DD' 
            },
            { status: 400 }
          )
        }
      } catch (error) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Data de início inválida. Use o formato YYYY-MM-DD' 
          },
          { status: 400 }
        )
      }
    }

    if (lostDateEnd) {
      try {
        // Tentar criar a data
        let dataFim = new Date(lostDateEnd + 'T00:00:00')
        
        // Se a data for inválida, pode ser porque o dia não existe no mês
        // Tentar ajustar para o último dia válido do mês
        if (isNaN(dataFim.getTime())) {
          const partes = lostDateEnd.split('-')
          if (partes.length === 3) {
            const ano = parseInt(partes[0])
            const mes = parseInt(partes[1])
            const dia = parseInt(partes[2])
            
            // Criar data no primeiro dia do mês seguinte e subtrair 1 dia
            const ultimoDiaMes = new Date(ano, mes, 0) // Dia 0 = último dia do mês anterior
            dataFim = new Date(ano, mes - 1, ultimoDiaMes.getDate())
            dataFimValida = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDiaMes.getDate()).padStart(2, '0')}`
          } else {
            return NextResponse.json(
              { 
                success: false, 
                message: 'Data de fim inválida. Use o formato YYYY-MM-DD' 
              },
              { status: 400 }
            )
          }
        } else {
          dataFimValida = lostDateEnd
        }
      } catch (error) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Data de fim inválida. Use o formato YYYY-MM-DD' 
          },
          { status: 400 }
        )
      }
    }
    
    // Construir filtros
    const whereClauses: string[] = [
      'o.archived = 0',
      'o.lost_date IS NOT NULL',
      'o.status = ?'
    ]
    const queryParams: any[] = ['lost']

    // Filtro de período (lost_date)
    if (dataInicioValida) {
      whereClauses.push('o.lost_date >= ?')
      queryParams.push(dataInicioValida + ' 00:00:00')
    }

    if (dataFimValida) {
      whereClauses.push('o.lost_date <= ?')
      queryParams.push(dataFimValida + ' 23:59:59')
    }

    // Filtro de vendedor/unidade
    let userIds: number[] = []
    
    if (userIdParam) {
      const userIdsFromParam = userIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)
      userIds.push(...userIdsFromParam)
    }

    if (unidadeIdParam) {
      const unidadeUserIds = await buildUnidadeFilter(unidadeIdParam)
      userIds.push(...unidadeUserIds)
    }

    // Remover duplicatas
    userIds = Array.from(new Set(userIds))

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',')
      whereClauses.push(`CAST(o.user AS UNSIGNED) IN (${placeholders})`)
      queryParams.push(...userIds)
    }

    // Query para agrupar por motivo de perda
    const query = `
      SELECT 
        COALESCE(mp.motivo, o.loss_reason, 'Sem motivo informado') as motivo_perda,
        COALESCE(mp.id, NULL) as motivo_id,
        COALESCE(o.loss_reason, NULL) as motivo_raw,
        COUNT(*) as total_oportunidades,
        COALESCE(SUM(o.value), 0) as valor_total,
        COALESCE(AVG(
          CASE 
            WHEN o.createDate IS NOT NULL AND o.lost_date IS NOT NULL 
            THEN DATEDIFF(o.lost_date, o.createDate)
            ELSE NULL
          END
        ), 0) as lost_time_medio
      FROM oportunidades o
      LEFT JOIN motivos_de_perda mp ON CAST(
        CASE 
          WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
          WHEN o.loss_reason REGEXP '^[0-9]+$' THEN o.loss_reason
          ELSE NULL
        END AS UNSIGNED
      ) = mp.id
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY mp.id, mp.motivo, o.loss_reason
      ORDER BY total_oportunidades DESC, valor_total DESC
    `

    const resultados = await executeQuery(query, queryParams) as Array<{
      motivo_perda: string
      motivo_id: number | null
      motivo_raw: string | null
      total_oportunidades: number
      valor_total: number
      lost_time_medio: number
    }>

    // Calcular totais
    const totalOportunidades = resultados.reduce((sum, item) => sum + Number(item.total_oportunidades || 0), 0)
    const valorTotal = resultados.reduce((sum, item) => sum + Number(item.valor_total || 0), 0)

    // Se all=1, buscar resumo por vendedor
    let resumoPorVendedor: any[] = []
    if (allParam && userIds.length > 0) {
      const queryVendedores = `
        SELECT 
          CAST(o.user AS UNSIGNED) as vendedor_id,
          v.name as vendedor_nome,
          v.lastName as vendedor_sobrenome,
          u.id as unidade_id,
          COALESCE(u.nome, u.name) as unidade_nome,
          COALESCE(mp.motivo, o.loss_reason, 'Sem motivo informado') as motivo_perda,
          COALESCE(mp.id, NULL) as motivo_id,
          COUNT(*) as total_oportunidades,
          COALESCE(SUM(o.value), 0) as valor_total,
          COALESCE(AVG(
            CASE 
              WHEN o.createDate IS NOT NULL AND o.lost_date IS NOT NULL 
              THEN DATEDIFF(o.lost_date, o.createDate)
              ELSE NULL
            END
          ), 0) as lost_time_medio
        FROM oportunidades o
        LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
        LEFT JOIN unidades u ON v.unidade_id = u.id
        LEFT JOIN motivos_de_perda mp ON CAST(
          CASE 
            WHEN o.loss_reason LIKE 'Motivo %' THEN TRIM(REPLACE(o.loss_reason, 'Motivo ', ''))
            WHEN o.loss_reason REGEXP '^[0-9]+$' THEN o.loss_reason
            ELSE NULL
          END AS UNSIGNED
        ) = mp.id
        WHERE ${whereClauses.join(' AND ')}
        GROUP BY vendedor_id, vendedor_nome, vendedor_sobrenome, unidade_id, unidade_nome, mp.id, mp.motivo, o.loss_reason
        ORDER BY unidade_nome, vendedor_nome, vendedor_sobrenome, total_oportunidades DESC
      `

      const resultadosVendedores = await executeQuery(queryVendedores, queryParams) as Array<{
        vendedor_id: number
        vendedor_nome: string
        vendedor_sobrenome: string
        unidade_id: number
        unidade_nome: string
        motivo_perda: string
        motivo_id: number | null
        total_oportunidades: number
        valor_total: number
        lost_time_medio: number
      }>

      // Agrupar por unidade e vendedor
      const resumoPorUnidade: Record<number, {
        unidade_id: number
        unidade_nome: string
        vendedores: Record<number, {
          vendedor_id: number
          vendedor_nome: string
          vendedor_sobrenome: string
          total_oportunidades: number
          valor_total: number
          motivos: Array<{
            motivo_id: number | null
            motivo: string
            total_oportunidades: number
            valor_total: number
            lost_time: number
          }>
        }>
      }> = {}

      resultadosVendedores.forEach(item => {
        const unidadeId = item.unidade_id || 0
        const vendedorId = item.vendedor_id

        if (!resumoPorUnidade[unidadeId]) {
          resumoPorUnidade[unidadeId] = {
            unidade_id: unidadeId,
            unidade_nome: item.unidade_nome || 'Sem unidade',
            vendedores: {}
          }
        }

        if (!resumoPorUnidade[unidadeId].vendedores[vendedorId]) {
          resumoPorUnidade[unidadeId].vendedores[vendedorId] = {
            vendedor_id: vendedorId,
            vendedor_nome: item.vendedor_nome || 'Desconhecido',
            vendedor_sobrenome: item.vendedor_sobrenome || '',
            total_oportunidades: 0,
            valor_total: 0,
            motivos: []
          }
        }

        const vendedor = resumoPorUnidade[unidadeId].vendedores[vendedorId]
        vendedor.total_oportunidades += Number(item.total_oportunidades || 0)
        vendedor.valor_total += Number(item.valor_total || 0)

        vendedor.motivos.push({
          motivo_id: item.motivo_id,
          motivo: (item.motivo_perda || '').trim().replace(/\n/g, ' ').replace(/\s+/g, ' '),
          total_oportunidades: Number(item.total_oportunidades || 0),
          valor_total: Number(item.valor_total || 0),
          lost_time: Math.round(Number(item.lost_time_medio || 0))
        })
      })

      // Converter para array
      resumoPorVendedor = Object.values(resumoPorUnidade).map(unidade => ({
        unidade_id: unidade.unidade_id,
        unidade_nome: unidade.unidade_nome,
        vendedores: Object.values(unidade.vendedores).map(vendedor => ({
          vendedor_id: vendedor.vendedor_id,
          vendedor_nome: `${vendedor.vendedor_nome} ${vendedor.vendedor_sobrenome}`.trim(),
          total_oportunidades: vendedor.total_oportunidades,
          valor_total: vendedor.valor_total,
          motivos: vendedor.motivos
        }))
      }))
    }

    // Buscar informações das unidades (se filtrado por unidade)
    let unidadesInfo: Array<{ id: number; nome: string }> = []
    if (unidadeIdParam) {
      const unidadeIds = unidadeIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)
      
      if (unidadeIds.length > 0) {
        const placeholders = unidadeIds.map(() => '?').join(',')
        const unidades = await executeQuery(
          `SELECT id, COALESCE(nome, name) as nome FROM unidades WHERE id IN (${placeholders}) AND ativo = 1`,
          unidadeIds
        ) as Array<{ id: number; nome: string }>
        
        unidadesInfo = unidades.map(u => ({
          id: u.id,
          nome: u.nome || 'Sem nome'
        }))
      }
    }

    // Buscar informações dos vendedores (se filtrado por vendedor)
    let vendedoresInfo: Array<{ id: number; nome: string }> = []
    if (userIdParam && userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',')
      const vendedores = await executeQuery(
        `SELECT id, CONCAT(name, ' ', lastName) as nome FROM vendedores WHERE id IN (${placeholders}) AND ativo = 1`,
        userIds
      ) as Array<{ id: number; nome: string }>
      
      vendedoresInfo = vendedores.map(v => ({
        id: v.id,
        nome: v.nome || 'Sem nome'
      }))
    }

    const responseData: any = {
      motivos_perda: resultados.map(item => ({
        motivo_id: item.motivo_id,
        motivo: (item.motivo_perda || '').trim().replace(/\n/g, ' ').replace(/\s+/g, ' '),
        total_oportunidades: Number(item.total_oportunidades || 0),
        valor_total: Number(item.valor_total || 0),
        lost_time: Math.round(Number(item.lost_time_medio || 0)),
        percentual: totalOportunidades > 0 
          ? ((Number(item.total_oportunidades || 0) / totalOportunidades) * 100).toFixed(2)
          : '0.00'
      })),
      totais: {
        total_oportunidades: totalOportunidades,
        valor_total: valorTotal,
        total_motivos: resultados.length
      }
    }

    // Adicionar resumo por vendedor se all=1
    if (allParam && resumoPorVendedor.length > 0) {
      responseData.resumo_por_vendedor = resumoPorVendedor
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      filters: {
        unidade_id: unidadeIdParam || null,
        user_id: userIdParam || null,
        lost_date_start: dataInicioValida || null,
        lost_date_end: dataFimValida || null
      },
      ...(unidadesInfo.length > 0 ? { unidade_info: unidadesInfo } : {}),
      ...(vendedoresInfo.length > 0 ? { vendedor_info: vendedoresInfo } : {})
    })

  } catch (error) {
    console.error('❌ Erro ao buscar oportunidades perdidas:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades perdidas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

