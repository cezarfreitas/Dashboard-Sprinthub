import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Função helper para parsear campos JSON
    const parseJsonField = (value: any): any => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      return value
    }

    // Obter parâmetros
    const { searchParams } = new URL(request.url)
    const unidadeId = searchParams.get('unidade_id')
    const unidadesParam = searchParams.get('unidades')
    
    // Parsear IDs das unidades (suporta múltiplas unidades)
    const unidadesIds: number[] = []
    
    if (unidadesParam) {
      unidadesParam.split(',').forEach(id => {
        const numId = parseInt(id.trim())
        if (!isNaN(numId) && !unidadesIds.includes(numId)) {
          unidadesIds.push(numId)
        }
      })
    } else if (unidadeId && !isNaN(parseInt(unidadeId))) {
      unidadesIds.push(parseInt(unidadeId))
    }

    // Condições WHERE para oportunidades abertas
    let whereConditions = [
      "o.status = 'open'",
      "o.gain_date IS NULL",
      "o.lost_date IS NULL",
      "o.archived = 0"
    ]
    const queryParams: any[] = []

    // Se tiver unidades, buscar vendedores do campo users (JSON) das unidades
    if (unidadesIds.length > 0) {
      const placeholders = unidadesIds.map(() => '?').join(',')
      const unidadesResult = await executeQuery(`
        SELECT id, users
        FROM unidades
        WHERE id IN (${placeholders}) AND ativo = 1
      `, unidadesIds) as Array<{ id: number; users: string | null }>
      
      // Extrair todos os IDs de vendedores do campo users das unidades
      const vendedoresIds = new Set<number>()
      unidadesResult.forEach(u => {
        const users = parseJsonField(u.users)
        if (Array.isArray(users)) {
          users.forEach((userId: any) => {
            const id = typeof userId === 'number' ? userId : parseInt(userId)
            if (!isNaN(id)) {
              vendedoresIds.add(id)
            }
          })
        }
      })
      
      if (vendedoresIds.size === 0) {
        return NextResponse.json({
          success: true,
          filtros: { unidades_ids: unidadesIds },
          resumo: {
            total_oportunidades_abertas: 0,
            oportunidades_com_valor: 0,
            oportunidades_sem_valor: 0,
            valor_total: 0,
            valor_medio: 0,
            total_vendedores: 0
          },
          distribuicao_por_tempo: [],
          distribuicao_por_vendedor: []
        })
      }
      
      const vendedoresIdsArray = Array.from(vendedoresIds)
      const placeholdersVendedores = vendedoresIdsArray.map(() => '?').join(',')
      whereConditions.push(`CAST(o.user AS UNSIGNED) IN (${placeholdersVendedores})`)
      queryParams.push(...vendedoresIdsArray)
    }

    const whereClause = whereConditions.join(' AND ')

    // Contar oportunidades e valores
    const result = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN o.value > 0 THEN 1 ELSE 0 END) as com_valor,
        SUM(CASE WHEN o.value = 0 OR o.value IS NULL THEN 1 ELSE 0 END) as sem_valor,
        COALESCE(SUM(o.value), 0) as valor_total,
        COALESCE(AVG(o.value), 0) as valor_medio
      FROM oportunidades o
      WHERE ${whereClause}
    `, queryParams) as Array<{ 
      total: number
      com_valor: number
      sem_valor: number
      valor_total: number
      valor_medio: number
    }>

    // Distribuição por faixas de tempo (10 faixas - baseado na data de criação)
    const faixasDistribuicao = await executeQuery(`
      SELECT 
        faixa,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as valor_total
      FROM (
        SELECT 
          CASE 
            WHEN DATEDIFF(NOW(), o.createDate) <= 7 THEN '0-7'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 8 AND 15 THEN '8-15'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 16 AND 30 THEN '16-30'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 31 AND 45 THEN '31-45'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 46 AND 60 THEN '46-60'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 61 AND 90 THEN '61-90'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 91 AND 120 THEN '91-120'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 121 AND 180 THEN '121-180'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 181 AND 365 THEN '181-365'
            ELSE '365+'
          END as faixa,
          CASE 
            WHEN DATEDIFF(NOW(), o.createDate) <= 7 THEN 1
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 8 AND 15 THEN 2
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 16 AND 30 THEN 3
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 31 AND 45 THEN 4
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 46 AND 60 THEN 5
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 61 AND 90 THEN 6
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 91 AND 120 THEN 7
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 121 AND 180 THEN 8
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 181 AND 365 THEN 9
            ELSE 10
          END as ordem,
          o.value as valor
        FROM oportunidades o
        WHERE ${whereClause}
      ) as grouped
      GROUP BY faixa, ordem
      ORDER BY ordem
    `, queryParams) as Array<{ 
      faixa: string
      quantidade: number
      valor_total: number
    }>

    const totalOportunidadesAbertas = result[0]?.total || 0
    const comValor = result[0]?.com_valor || 0
    const semValor = result[0]?.sem_valor || 0
    const valorTotal = parseFloat(result[0]?.valor_total?.toString() || '0')
    const valorMedio = parseFloat(result[0]?.valor_medio?.toString() || '0')

    // Formatar faixas com percentual
    const distribuicaoPorFaixa = faixasDistribuicao.map(faixa => ({
      faixa: faixa.faixa,
      quantidade: faixa.quantidade,
      valor_total: parseFloat(faixa.valor_total?.toString() || '0'),
      percentual: totalOportunidadesAbertas > 0 
        ? Math.round((faixa.quantidade / totalOportunidadesAbertas) * 100) 
        : 0
    }))

    // Distribuição por vendedor (user)
    const distribuicaoPorVendedor = await executeQuery(`
      SELECT 
        o.user as vendedor_id,
        v.name,
        v.lastName,
        CONCAT(v.name, ' ', v.lastName) as vendedor_nome,
        COALESCE(u.nome, u.name) as unidade_nome,
        COUNT(*) as total_oportunidades,
        SUM(CASE WHEN o.value > 0 THEN 1 ELSE 0 END) as oportunidades_com_valor,
        SUM(CASE WHEN o.value = 0 OR o.value IS NULL THEN 1 ELSE 0 END) as oportunidades_sem_valor,
        COALESCE(SUM(o.value), 0) as valor_total,
        COALESCE(AVG(o.value), 0) as valor_medio,
        MIN(DATEDIFF(NOW(), o.createDate)) as dias_mais_recente,
        MAX(DATEDIFF(NOW(), o.createDate)) as dias_mais_antiga,
        AVG(DATEDIFF(NOW(), o.createDate)) as dias_medio
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE ${whereClause}
      GROUP BY o.user, v.name, v.lastName, u.nome, u.name
      ORDER BY total_oportunidades DESC, valor_total DESC
    `, queryParams) as Array<{
      vendedor_id: string
      name: string
      lastName: string
      vendedor_nome: string
      unidade_nome: string
      total_oportunidades: number
      oportunidades_com_valor: number
      oportunidades_sem_valor: number
      valor_total: number
      valor_medio: number
      dias_mais_recente: number
      dias_mais_antiga: number
      dias_medio: number
    }>

    // Criar mapa de vendedor_id -> unidade_nome dos vendedores que estão nas unidades filtradas
    const vendedorUnidadeMap = new Map<number, string>()
    if (unidadesIds.length > 0) {
      const placeholders = unidadesIds.map(() => '?').join(',')
      const unidadesResult = await executeQuery(`
        SELECT id, COALESCE(nome, name) as unidade_nome, users
        FROM unidades
        WHERE id IN (${placeholders}) AND ativo = 1
      `, unidadesIds) as Array<{ id: number; unidade_nome: string; users: string | null }>
      
      unidadesResult.forEach(u => {
        const users = parseJsonField(u.users)
        if (Array.isArray(users)) {
          users.forEach((userId: any) => {
            const id = typeof userId === 'number' ? userId : parseInt(userId)
            if (!isNaN(id) && !vendedorUnidadeMap.has(id)) {
              vendedorUnidadeMap.set(id, u.unidade_nome || 'Sem unidade')
            }
          })
        }
      })
    }

    // Granularidade com faixas de tempo: Vendedor → Funil → Etapa → Faixa de Tempo
    const granularidadeComFaixas = await executeQuery(`
      SELECT 
        o.user as vendedor_id,
        v.name,
        v.lastName,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(v.name, ''), ' ', COALESCE(v.lastName, ''))), ''), 'Sem nome') as vendedor_nome,
        COALESCE(f.id, 0) as funil_id,
        COALESCE(f.funil_nome, 'Sem funil') as funil_nome,
        COALESCE(cf.id, 0) as coluna_id,
        COALESCE(cf.nome_coluna, 'Sem etapa') as etapa_nome,
        cf.sequencia as etapa_sequencia,
        CASE 
          WHEN DATEDIFF(NOW(), o.createDate) <= 7 THEN '0-7'
          WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 8 AND 15 THEN '8-15'
          WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 16 AND 30 THEN '16-30'
          WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 31 AND 45 THEN '31-45'
          WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 46 AND 60 THEN '46-60'
          WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 61 AND 90 THEN '61-90'
          WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 91 AND 120 THEN '91-120'
          WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 121 AND 180 THEN '121-180'
          WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 181 AND 365 THEN '181-365'
          ELSE '365+'
        END as faixa_tempo,
        COUNT(*) as quantidade,
        SUM(CASE WHEN o.value > 0 THEN 1 ELSE 0 END) as quantidade_com_valor,
        SUM(CASE WHEN o.value = 0 OR o.value IS NULL THEN 1 ELSE 0 END) as quantidade_sem_valor,
        COALESCE(SUM(o.value), 0) as valor_total,
        COALESCE(AVG(o.value), 0) as valor_medio,
        MIN(DATEDIFF(NOW(), o.createDate)) as dias_mais_recente,
        MAX(DATEDIFF(NOW(), o.createDate)) as dias_mais_antiga,
        AVG(DATEDIFF(NOW(), o.createDate)) as dias_medio
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id
      LEFT JOIN funis f ON cf.id_funil = f.id
      WHERE ${whereClause}
      GROUP BY o.user, v.name, v.lastName, f.id, f.funil_nome, cf.id, cf.nome_coluna, cf.sequencia, faixa_tempo
      ORDER BY o.user, f.id, cf.sequencia, faixa_tempo
    `, queryParams) as Array<{
      vendedor_id: string
      name: string
      lastName: string
      vendedor_nome: string
      funil_id: number
      funil_nome: string
      coluna_id: number
      etapa_nome: string
      etapa_sequencia: number
      faixa_tempo: string
      quantidade: number
      quantidade_com_valor: number
      quantidade_sem_valor: number
      valor_total: number
      valor_medio: number
      dias_mais_recente: number
      dias_mais_antiga: number
      dias_medio: number
    }>

    // Estruturar dados: Vendedor → Funil → Etapa → Faixa de Tempo
    const vendedoresComGranularidade = new Map<number, any>()
    
    granularidadeComFaixas.forEach(item => {
      const vendedorId = parseInt(item.vendedor_id)
      
      // Criar vendedor se não existir
      if (!vendedoresComGranularidade.has(vendedorId)) {
        vendedoresComGranularidade.set(vendedorId, {
          vendedor_id: vendedorId,
          vendedor_nome: item.vendedor_nome || `Vendedor ${item.vendedor_id}`,
          unidade_nome: vendedorUnidadeMap.get(vendedorId) || 'Sem unidade',
          total_oportunidades: 0,
          oportunidades_com_valor: 0,
          oportunidades_sem_valor: 0,
          valor_total: 0,
          funis: []
        })
      }
      
      const vendedor = vendedoresComGranularidade.get(vendedorId)!
      
      // Atualizar totais do vendedor
      vendedor.total_oportunidades += item.quantidade
      vendedor.oportunidades_com_valor += item.quantidade_com_valor
      vendedor.oportunidades_sem_valor += item.quantidade_sem_valor
      vendedor.valor_total += parseFloat(item.valor_total?.toString() || '0')
      
      // Buscar ou criar funil
      let funil = vendedor.funis.find((f: any) => f.funil_id === item.funil_id)
      if (!funil) {
        funil = {
          funil_id: item.funil_id,
          funil_nome: item.funil_nome,
          total_oportunidades: 0,
          valor_total: 0,
          etapas: []
        }
        vendedor.funis.push(funil)
      }
      
      // Atualizar totais do funil
      funil.total_oportunidades += item.quantidade
      funil.valor_total += parseFloat(item.valor_total?.toString() || '0')
      
      // Buscar ou criar etapa
      let etapa = funil.etapas.find((e: any) => e.coluna_id === item.coluna_id)
      if (!etapa) {
        etapa = {
          coluna_id: item.coluna_id,
          etapa_nome: item.etapa_nome,
          sequencia: item.etapa_sequencia || 0,
          total_quantidade: 0,
          total_quantidade_com_valor: 0,
          total_quantidade_sem_valor: 0,
          total_valor: 0,
          valor_medio: 0,
          dias_mais_recente: item.dias_mais_recente || 0,
          dias_mais_antiga: item.dias_mais_antiga || 0,
          dias_medio: 0,
          distribuicao_tempo: []
        }
        funil.etapas.push(etapa)
      }
      
      // Atualizar totais da etapa
      etapa.total_quantidade += item.quantidade
      etapa.total_quantidade_com_valor += item.quantidade_com_valor
      etapa.total_quantidade_sem_valor += item.quantidade_sem_valor
      etapa.total_valor += parseFloat(item.valor_total?.toString() || '0')
      etapa.dias_mais_recente = Math.min(etapa.dias_mais_recente, item.dias_mais_recente || 0)
      etapa.dias_mais_antiga = Math.max(etapa.dias_mais_antiga, item.dias_mais_antiga || 0)
      
      // Adicionar faixa de tempo à etapa
      etapa.distribuicao_tempo.push({
        faixa: item.faixa_tempo,
        quantidade: item.quantidade,
        quantidade_com_valor: item.quantidade_com_valor,
        quantidade_sem_valor: item.quantidade_sem_valor,
        valor_total: parseFloat(item.valor_total?.toString() || '0'),
        valor_medio: parseFloat(item.valor_medio?.toString() || '0'),
        dias_medio: Math.round(item.dias_medio || 0)
      })
    })
    
    // Calcular médias das etapas
    vendedoresComGranularidade.forEach(vendedor => {
      vendedor.funis.forEach((funil: any) => {
        funil.etapas.forEach((etapa: any) => {
          etapa.valor_medio = etapa.total_quantidade > 0 
            ? etapa.total_valor / etapa.total_quantidade 
            : 0
          
          // Calcular dias_medio da etapa (média ponderada)
          const totalDias = etapa.distribuicao_tempo.reduce((sum: number, f: any) => 
            sum + (f.dias_medio * f.quantidade), 0)
          etapa.dias_medio = etapa.total_quantidade > 0 
            ? Math.round(totalDias / etapa.total_quantidade) 
            : 0
        })
      })
    })
    
    // Converter para array e calcular percentuais
    const granularidadeFormatada = Array.from(vendedoresComGranularidade.values()).map(v => ({
      ...v,
      valor_medio: v.total_oportunidades > 0 ? v.valor_total / v.total_oportunidades : 0,
      percentual_total: totalOportunidadesAbertas > 0 
        ? Math.round((v.total_oportunidades / totalOportunidadesAbertas) * 100) 
        : 0,
      funis: v.funis.map((f: any) => ({
        ...f,
        percentual_vendedor: v.total_oportunidades > 0
          ? Math.round((f.total_oportunidades / v.total_oportunidades) * 100)
          : 0,
        etapas: f.etapas.map((e: any) => ({
          ...e,
          percentual_funil: f.total_oportunidades > 0
            ? Math.round((e.quantidade / f.total_oportunidades) * 100)
            : 0
        }))
      }))
    })).sort((a, b) => b.total_oportunidades - a.total_oportunidades)

    // Buscar faixas de tempo por vendedor
    const faixasPorVendedor = await executeQuery(`
      SELECT 
        vendedor_id,
        faixa,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as valor_total
      FROM (
        SELECT 
          o.user as vendedor_id,
          CASE 
            WHEN DATEDIFF(NOW(), o.createDate) <= 7 THEN '0-7'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 8 AND 15 THEN '8-15'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 16 AND 30 THEN '16-30'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 31 AND 45 THEN '31-45'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 46 AND 60 THEN '46-60'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 61 AND 90 THEN '61-90'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 91 AND 120 THEN '91-120'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 121 AND 180 THEN '121-180'
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 181 AND 365 THEN '181-365'
            ELSE '365+'
          END as faixa,
          CASE 
            WHEN DATEDIFF(NOW(), o.createDate) <= 7 THEN 1
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 8 AND 15 THEN 2
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 16 AND 30 THEN 3
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 31 AND 45 THEN 4
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 46 AND 60 THEN 5
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 61 AND 90 THEN 6
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 91 AND 120 THEN 7
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 121 AND 180 THEN 8
            WHEN DATEDIFF(NOW(), o.createDate) BETWEEN 181 AND 365 THEN 9
            ELSE 10
          END as ordem,
          o.value as valor
        FROM oportunidades o
        WHERE ${whereClause}
      ) as grouped
      GROUP BY vendedor_id, faixa, ordem
      ORDER BY vendedor_id, ordem
    `, queryParams) as Array<{
      vendedor_id: string
      faixa: string
      quantidade: number
      valor_total: number
    }>

    // Criar mapa de faixas por vendedor
    const faixasMapPorVendedor = new Map<number, any[]>()
    faixasPorVendedor.forEach(f => {
      const vendedorId = parseInt(f.vendedor_id)
      if (!faixasMapPorVendedor.has(vendedorId)) {
        faixasMapPorVendedor.set(vendedorId, [])
      }
      faixasMapPorVendedor.get(vendedorId)!.push({
        faixa: f.faixa,
        quantidade: f.quantidade,
        valor_total: parseFloat(f.valor_total?.toString() || '0')
      })
    })

    // Sanitizar dados para evitar NaN, Infinity, etc
    const sanitizeNumber = (value: any): number => {
      const num = parseFloat(value?.toString() || '0')
      return isNaN(num) || !isFinite(num) ? 0 : num
    }

    const sanitizeObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (Array.isArray(obj)) return obj.map(sanitizeObject)
      if (typeof obj === 'object') {
        const sanitized: any = {}
        for (const key in obj) {
          const value = obj[key]
          if (typeof value === 'number') {
            sanitized[key] = sanitizeNumber(value)
          } else if (typeof value === 'object') {
            sanitized[key] = sanitizeObject(value)
          } else {
            sanitized[key] = value
          }
        }
        return sanitized
      }
      return obj
    }

    return NextResponse.json({
      success: true,
      filtros: unidadesIds.length > 0 ? { unidades_ids: unidadesIds } : {},
      resumo: {
        total_oportunidades_abertas: sanitizeNumber(totalOportunidadesAbertas),
        oportunidades_com_valor: sanitizeNumber(comValor),
        oportunidades_sem_valor: sanitizeNumber(semValor),
        valor_total: sanitizeNumber(valorTotal),
        valor_medio: sanitizeNumber(valorMedio),
        total_vendedores: granularidadeFormatada.length
      },
      distribuicao_por_tempo: sanitizeObject(distribuicaoPorFaixa),
      granularidade: sanitizeObject(granularidadeFormatada)
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades abertas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
