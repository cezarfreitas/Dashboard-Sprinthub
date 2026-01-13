import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface UnidadeData {
  id: number
  nome: string
  responsavel: string
  users: string | number[] | null
  grupo_id: number | null
}

interface OportunidadeAgregada {
  user_id: number
  total_oportunidades: number
  total_realizado: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'mensal'
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))
    
    // Filtros avançados
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const unidadesParam = searchParams.get('unidades')
    const funilId = searchParams.get('funil')
    const grupoId = searchParams.get('grupo')
    const gainDateInicio = searchParams.get('gainDateInicio')
    const gainDateFim = searchParams.get('gainDateFim')

    // Parsear unidades selecionadas
    const unidadesSelecionadas: number[] = unidadesParam
      ? unidadesParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
      : []

    // Buscar todas as unidades primeiro
    let unidadesQuery = `
      SELECT 
        u.id,
        COALESCE(NULLIF(u.nome, ''), u.name, 'Sem Nome') as nome,
        COALESCE(
          NULLIF(u.responsavel, ''),
          v.name,
          'Não informado'
        ) as responsavel,
        u.users,
        u.grupo_id
      FROM unidades u
      LEFT JOIN vendedores v ON v.id = (
        CASE 
          WHEN JSON_VALID(u.user_gestao) 
          THEN JSON_EXTRACT(u.user_gestao, '$[0]')
          ELSE u.user_gestao
        END
      )
      WHERE u.ativo = 1
    `
    const unidadesParams: (number | string)[] = []

    // Filtrar por unidades específicas
    if (unidadesSelecionadas.length > 0) {
      unidadesQuery += ` AND u.id IN (${unidadesSelecionadas.map(() => '?').join(',')})`
      unidadesParams.push(...unidadesSelecionadas)
    }

    // Filtrar por grupo
    if (grupoId && grupoId !== 'todos') {
      unidadesQuery += ` AND u.grupo_id = ?`
      unidadesParams.push(parseInt(grupoId))
    }

    unidadesQuery += ` ORDER BY COALESCE(NULLIF(u.nome, ''), u.name)`

    const unidades = await executeQuery(unidadesQuery, unidadesParams) as UnidadeData[]

    // Extrair todos os vendedores de todas as unidades
    const vendedorUnidadeMap = new Map<number, number[]>() // vendedor_id -> unidade_ids[]
    const unidadeVendedoresMap = new Map<number, number[]>() // unidade_id -> vendedor_ids[]
    const todosVendedorIds: number[] = []

    unidades.forEach((unidade) => {
      let vendedorIds: number[] = []
      
      if (unidade.users) {
        try {
          const users = typeof unidade.users === 'string' ? JSON.parse(unidade.users) : unidade.users
          if (Array.isArray(users)) {
            vendedorIds = users.map((u: unknown) => {
              // Pode ser número direto, string, ou objeto {id: number}
              if (typeof u === 'number') return u
              if (typeof u === 'string') {
                const parsed = parseInt(u.trim())
                return isNaN(parsed) ? null : parsed
              }
              if (typeof u === 'object' && u !== null) {
                const obj = u as Record<string, unknown>
                const id = obj.id || obj.user_id || obj.vendedor_id
                if (typeof id === 'number') return id
                if (typeof id === 'string') {
                  const parsed = parseInt(id.trim())
                  return isNaN(parsed) ? null : parsed
                }
              }
              return null
            }).filter((id): id is number => id !== null && !isNaN(id))
          }
        } catch {
          // Silently ignore parse errors
        }
      }

      unidadeVendedoresMap.set(unidade.id, vendedorIds)
      
      vendedorIds.forEach(vendedorId => {
        if (!todosVendedorIds.includes(vendedorId)) {
          todosVendedorIds.push(vendedorId)
        }
        
        const unidadesDoVendedor = vendedorUnidadeMap.get(vendedorId) || []
        unidadesDoVendedor.push(unidade.id)
        vendedorUnidadeMap.set(vendedorId, unidadesDoVendedor)
      })
    })

    // Se não há vendedores, retornar ranking vazio
    if (todosVendedorIds.length === 0) {
      return NextResponse.json({
        success: true,
        ranking: [],
        filtros: { tipo, mes: tipo === 'mensal' ? mes : null, ano, dataInicio, dataFim, unidades: unidadesSelecionadas, funil: funilId, grupo: grupoId, gainDateInicio, gainDateFim }
      })
    }

    // OTIMIZAÇÃO: Buscar todas as oportunidades de todos os vendedores em UMA ÚNICA QUERY
    // IMPORTANTE: o.user é VARCHAR(100), então precisamos converter os IDs para string
    let oportunidadesQuery = `
      SELECT 
        CAST(o.user AS UNSIGNED) as user_id,
        COUNT(DISTINCT o.id) as total_oportunidades,
        COALESCE(SUM(o.value), 0) as total_realizado
      FROM oportunidades o
    `
    
    // JOIN com colunas_funil se filtro de funil estiver ativo
    if (funilId && funilId !== 'todos') {
      oportunidadesQuery += ` INNER JOIN colunas_funil cf ON o.coluna_funil_id = cf.id AND cf.id_funil = ?`
    }
    
    // o.user é VARCHAR, então usamos CAST para comparar com números
    oportunidadesQuery += ` WHERE CAST(o.user AS UNSIGNED) IN (${todosVendedorIds.map(() => '?').join(',')})`

    const oportunidadesParams: (number | string)[] = []
    
    if (funilId && funilId !== 'todos') {
      oportunidadesParams.push(parseInt(funilId))
    }
    
    oportunidadesParams.push(...todosVendedorIds)

    // Filtrar por status gain
    oportunidadesQuery += ` AND o.status = 'gain' AND o.gain_date IS NOT NULL`

    // Aplicar filtros de data
    if (tipo === 'personalizado' && dataInicio && dataFim) {
      oportunidadesQuery += ` AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) >= ? AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) <= ?`
      oportunidadesParams.push(dataInicio, dataFim)
    } else if (tipo === 'mensal') {
      oportunidadesQuery += ` AND MONTH(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`
      oportunidadesParams.push(mes, ano)
    } else if (tipo === 'anual') {
      oportunidadesQuery += ` AND YEAR(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) = ?`
      oportunidadesParams.push(ano)
    }

    // Filtro adicional de data de ganho
    if (gainDateInicio) {
      oportunidadesQuery += ` AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) >= ?`
      oportunidadesParams.push(gainDateInicio)
    }
    if (gainDateFim) {
      oportunidadesQuery += ` AND DATE(CONVERT_TZ(o.gain_date, '+00:00', '-03:00')) <= ?`
      oportunidadesParams.push(gainDateFim)
    }

    oportunidadesQuery += ` GROUP BY CAST(o.user AS UNSIGNED)`

    const oportunidadesPorVendedor = await executeQuery(oportunidadesQuery, oportunidadesParams) as OportunidadeAgregada[]

    // Criar mapa de vendedor -> oportunidades
    const vendedorOportunidadesMap = new Map<number, { total_oportunidades: number; total_realizado: number }>()
    oportunidadesPorVendedor.forEach(item => {
      vendedorOportunidadesMap.set(item.user_id, {
        total_oportunidades: parseInt(String(item.total_oportunidades)) || 0,
        total_realizado: parseFloat(String(item.total_realizado)) || 0
      })
    })

    // Agregar por unidade
    const ranking = unidades.map((unidade) => {
      const vendedorIds = unidadeVendedoresMap.get(unidade.id) || []
      
      let totalOportunidades = 0
      let totalRealizado = 0
      
      vendedorIds.forEach(vendedorId => {
        const dados = vendedorOportunidadesMap.get(vendedorId)
        if (dados) {
          totalOportunidades += dados.total_oportunidades
          totalRealizado += dados.total_realizado
        }
      })

      return {
        unidade_id: unidade.id,
        unidade_nome: unidade.nome,
        unidade_responsavel: unidade.responsavel,
        total_oportunidades: totalOportunidades,
        total_realizado: totalRealizado,
        total_vendedores: vendedorIds.length
      }
    })

    // Filtrar unidades com vendas e ordenar
    const rankingFiltrado = ranking
      .filter(item => item.total_realizado > 0)
      .sort((a, b) => b.total_realizado - a.total_realizado)

    // Adicionar posição e medalha
    const rankingComPosicao = rankingFiltrado.map((item, index) => ({
      ...item,
      posicao: index + 1,
      medalha: index === 0 ? 'ouro' : index === 1 ? 'prata' : index === 2 ? 'bronze' : null
    }))

    return NextResponse.json({
      success: true,
      ranking: rankingComPosicao,
      filtros: {
        tipo,
        mes: tipo === 'mensal' ? mes : null,
        ano,
        dataInicio,
        dataFim,
        unidades: unidadesSelecionadas,
        funil: funilId,
        grupo: grupoId,
        gainDateInicio,
        gainDateFim
      }
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar ranking de unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
