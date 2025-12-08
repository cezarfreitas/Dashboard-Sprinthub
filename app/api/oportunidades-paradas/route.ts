import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

interface OportunidadeParada {
  id: number
  title: string
  value: number
  user: string
  crm_column: string
  dias_parada: number
  ultima_atualizacao: string
  unidade_nome: string
}

interface DistribuicaoFaixa {
  faixa: string
  quantidade: number
  valor_total: number
  percentual: number
}

interface AlertaVendedor {
  vendedor: string
  nome: string
  unidade: string
  total_paradas: number
  valor_em_risco: number
  media_dias_parados: number
  pior_caso_dias: number
}

interface HeatmapItem {
  vendedor: string
  unidade: string
  quantidade: number
  valor: number
  media_dias: number
  nivel_alerta: 'baixo' | 'medio' | 'alto' | 'critico'
}

export async function GET(request: NextRequest) {
  try {
    // TODO: REMOVER EM PRODUÇÃO - Autenticação desabilitada para testes
    // Verificar autenticação via JWT
    // const token = request.cookies.get('auth-token')?.value
    
    // if (!token) {
    //   return NextResponse.json(
    //     { success: false, message: 'Não autenticado - Token não fornecido' },
    //     { status: 401 }
    //   )
    // }

    // Verificar se o token é válido
    // try {
    //   const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')
    //   await jwtVerify(token, secret)
    // } catch (error) {
    //   return NextResponse.json(
    //     { success: false, message: 'Token inválido ou expirado' },
    //     { status: 401 }
    //   )
    // }

    // Obter parâmetros
    const { searchParams } = new URL(request.url)
    const diasMinimo = parseInt(searchParams.get('dias') || '7')
    const unidadeId = searchParams.get('unidade_id')
    const vendedorNome = searchParams.get('vendedor')
    const funilId = searchParams.get('funil_id')
    
    console.log('🔍 Parâmetros recebidos:', {
      diasMinimo,
      unidadeId,
      vendedorNome,
      funilId
    })

    // Se tiver unidade_id, buscar os IDs dos vendedores da unidade primeiro
    let vendedoresIdsDaUnidade: number[] = []
    if (unidadeId && !isNaN(parseInt(unidadeId))) {
      const vendedoresResult = await executeQuery(`
        SELECT id
        FROM vendedores
        WHERE unidade_id = ? AND ativo = 1
      `, [parseInt(unidadeId)]) as Array<{ id: number }>
      
      vendedoresIdsDaUnidade = vendedoresResult.map(v => v.id)
      console.log(`🔍 IDs dos Vendedores da unidade ${unidadeId}:`, vendedoresIdsDaUnidade)
      
      // Se não houver vendedores na unidade, retornar resultado vazio
      if (vendedoresIdsDaUnidade.length === 0) {
        return NextResponse.json({
          success: true,
          filtros: { dias_minimo: diasMinimo, unidade_id: unidadeId },
          resumo: {
            total_oportunidades: 0,
            valor_total: 0,
            valor_medio: 0,
            media_dias_parados: 0,
            max_dias_parados: 0
          },
          estatisticas: {
            total_vendedores_com_paradas: 0,
            total_unidades_afetadas: 0,
            oportunidades_criticas: 0,
            taxa_criticidade: 0
          },
          oportunidades: [],
          distribuicao: [],
          alertas_vendedor: [],
          heatmap: []
        })
      }
    }

    // Query base para oportunidades paradas (status 'open' e sem atualização há X dias)
    let whereConditions = [
      "o.status = 'open'",
      "o.archived = 0",
      `DATEDIFF(NOW(), o.updateDate) >= ${diasMinimo}`
    ]

    // SEMPRE filtrar por vendedores da unidade (OBRIGATÓRIO se tiver unidade_id)
    if (vendedoresIdsDaUnidade.length > 0) {
      const idsString = vendedoresIdsDaUnidade.join(',')
      whereConditions.push(`CAST(o.user AS UNSIGNED) IN (${idsString})`)
    } else if (unidadeId) {
      // Se foi passado unidade_id mas não tem vendedores, não retornar nada
      whereConditions.push('1 = 0')
    }

    // Validar e adicionar filtro de vendedor específico (apenas se não for 'all')
    if (vendedorNome && vendedorNome !== 'all') {
      whereConditions.push(`o.user LIKE '%${vendedorNome}%'`)
    }

    // Validar e adicionar filtro de funil (apenas se for um número válido)
    if (funilId && !isNaN(parseInt(funilId))) {
      whereConditions.push(`cf.id_funil = ${parseInt(funilId)}`)
    }

    const whereClause = whereConditions.join(' AND ')

    // 1. LISTA DE OPORTUNIDADES PARADAS
    const oportunidades = await executeQuery(`
      SELECT 
        o.id,
        o.title,
        o.value,
        o.user,
        o.crm_column,
        o.updateDate as ultima_atualizacao,
        DATEDIFF(NOW(), o.updateDate) as dias_parada,
        COALESCE(u.nome, u.name, 'Sem unidade') as unidade_nome
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE ${whereClause}
      ORDER BY dias_parada DESC
      LIMIT 100
    `) as OportunidadeParada[]

    // 2. DISTRIBUIÇÃO POR FAIXA DE DIAS
    const distribuicaoRaw = await executeQuery(`
      SELECT 
        CASE 
          WHEN DATEDIFF(NOW(), o.updateDate) BETWEEN ${diasMinimo} AND 7 THEN '0-7'
          WHEN DATEDIFF(NOW(), o.updateDate) BETWEEN 8 AND 15 THEN '8-15'
          WHEN DATEDIFF(NOW(), o.updateDate) BETWEEN 16 AND 30 THEN '16-30'
          ELSE '30+'
        END as faixa,
        COUNT(*) as quantidade,
        SUM(o.value) as valor_total
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      WHERE ${whereClause}
      GROUP BY faixa
      ORDER BY 
        CASE faixa
          WHEN '0-7' THEN 1
          WHEN '8-15' THEN 2
          WHEN '16-30' THEN 3
          WHEN '30+' THEN 4
        END
    `) as Array<{ faixa: string; quantidade: number; valor_total: number }>

    const totalOportunidades = distribuicaoRaw.reduce((sum, item) => sum + item.quantidade, 0)
    
    const distribuicao: DistribuicaoFaixa[] = distribuicaoRaw.map(item => ({
      faixa: item.faixa,
      quantidade: item.quantidade,
      valor_total: parseFloat(item.valor_total?.toString() || '0'),
      percentual: totalOportunidades > 0 
        ? Math.round((item.quantidade / totalOportunidades) * 100) 
        : 0
    }))

    // 3. VALOR EM RISCO (Total de oportunidades paradas)
    const valorEmRiscoRaw = await executeQuery(`
      SELECT 
        COUNT(*) as total_oportunidades,
        SUM(o.value) as valor_total,
        AVG(o.value) as valor_medio,
        AVG(DATEDIFF(NOW(), o.updateDate)) as media_dias_parados,
        MAX(DATEDIFF(NOW(), o.updateDate)) as max_dias_parados
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      WHERE ${whereClause}
    `) as Array<{
      total_oportunidades: number
      valor_total: number
      valor_medio: number
      media_dias_parados: number
      max_dias_parados: number
    }>

    const valorEmRisco = {
      total_oportunidades: valorEmRiscoRaw[0]?.total_oportunidades || 0,
      valor_total: parseFloat(valorEmRiscoRaw[0]?.valor_total?.toString() || '0'),
      valor_medio: parseFloat(valorEmRiscoRaw[0]?.valor_medio?.toString() || '0'),
      media_dias_parados: Math.round(valorEmRiscoRaw[0]?.media_dias_parados || 0),
      max_dias_parados: valorEmRiscoRaw[0]?.max_dias_parados || 0
    }

    // 4. ALERTAS POR VENDEDOR
    const alertasVendedorRaw = await executeQuery(`
      SELECT 
        o.user as vendedor_id,
        v.name as nome,
        v.lastName as sobrenome,
        COALESCE(u.nome, u.name, 'Sem unidade') as unidade,
        COUNT(*) as total_paradas,
        SUM(o.value) as valor_em_risco,
        AVG(DATEDIFF(NOW(), o.updateDate)) as media_dias_parados,
        MAX(DATEDIFF(NOW(), o.updateDate)) as pior_caso_dias
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE ${whereClause}
      GROUP BY o.user, v.name, v.lastName, u.nome, u.name
      HAVING total_paradas >= 3
      ORDER BY total_paradas DESC, valor_em_risco DESC
      LIMIT 20
    `) as Array<{
      vendedor_id: string
      nome: string
      sobrenome: string
      unidade: string
      total_paradas: number
      valor_em_risco: number
      media_dias_parados: number
      pior_caso_dias: number
    }>

    const alertasVendedor: AlertaVendedor[] = alertasVendedorRaw.map(item => ({
      vendedor: item.nome && item.sobrenome 
        ? `${item.nome} ${item.sobrenome}`
        : `Vendedor ${item.vendedor_id}`,
      nome: item.nome || `Vendedor ${item.vendedor_id}`,
      unidade: item.unidade || 'Sem unidade',
      total_paradas: item.total_paradas,
      valor_em_risco: parseFloat(item.valor_em_risco?.toString() || '0'),
      media_dias_parados: Math.round(item.media_dias_parados),
      pior_caso_dias: item.pior_caso_dias
    }))

    // 5. HEATMAP DE NEGLIGÊNCIA (vendedor x unidade)
    const heatmapRaw = await executeQuery(`
      SELECT 
        o.user as vendedor,
        (SELECT COALESCE(u2.nome, u2.name, 'Sem unidade')
         FROM vendedores v2
         LEFT JOIN unidades u2 ON v2.unidade_id = u2.id
         WHERE CONCAT(v2.name, ' ', v2.lastName) COLLATE utf8mb4_unicode_ci = o.user COLLATE utf8mb4_unicode_ci
         LIMIT 1) as unidade,
        COUNT(*) as quantidade,
        SUM(o.value) as valor,
        AVG(DATEDIFF(NOW(), o.updateDate)) as media_dias
      FROM oportunidades o
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      WHERE ${whereClause}
      GROUP BY o.user
      HAVING quantidade >= 2
      ORDER BY media_dias DESC, quantidade DESC
      LIMIT 50
    `) as Array<{
      vendedor: string
      unidade: string
      quantidade: number
      valor: number
      media_dias: number
    }>

    const heatmap: HeatmapItem[] = heatmapRaw.map(item => {
      const mediaDias = Math.round(item.media_dias)
      let nivelAlerta: 'baixo' | 'medio' | 'alto' | 'critico' = 'baixo'
      
      if (mediaDias >= 30) nivelAlerta = 'critico'
      else if (mediaDias >= 16) nivelAlerta = 'alto'
      else if (mediaDias >= 8) nivelAlerta = 'medio'
      
      return {
        vendedor: item.vendedor || 'Sem vendedor',
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor: parseFloat(item.valor?.toString() || '0'),
        media_dias: mediaDias,
        nivel_alerta: nivelAlerta
      }
    })

    // 6. ESTATÍSTICAS ADICIONAIS
    const estatisticas = {
      total_vendedores_com_paradas: alertasVendedor.length,
      total_unidades_afetadas: [...new Set(heatmap.map(h => h.unidade))].length,
      oportunidades_criticas: oportunidades.filter(o => o.dias_parada >= 30).length,
      taxa_criticidade: valorEmRisco.total_oportunidades > 0
        ? Math.round((oportunidades.filter(o => o.dias_parada >= 30).length / valorEmRisco.total_oportunidades) * 100)
        : 0
    }

    return NextResponse.json({
      success: true,
      filtros: {
        dias_minimo: diasMinimo,
        unidade_id: unidadeId,
        vendedor: vendedorNome
      },
      resumo: valorEmRisco,
      estatisticas,
      oportunidades: oportunidades.slice(0, 50), // Limitar para não sobrecarregar
      distribuicao,
      alertas_vendedor: alertasVendedor,
      heatmap
    })

  } catch (error) {
    console.error('[API] Erro ao buscar oportunidades paradas:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar oportunidades paradas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

