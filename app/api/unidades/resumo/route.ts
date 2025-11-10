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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = parseInt(searchParams.get('mes') || new Date().getMonth() + 1 as any)
    const ano = parseInt(searchParams.get('ano') || new Date().getFullYear() as any)
    const vendedorId = searchParams.get('vendedorId')
    const unidadeId = searchParams.get('unidadeId')

    // Buscar todas as unidades ativas
    let queryUnidades = `
      SELECT 
        id, 
        COALESCE(nome, name) as nome, 
        users,
        fila_leads,
        user_gestao
      FROM unidades 
      WHERE ativo = 1
    `
    const paramsUnidades: any[] = []

    // Se filtrar por unidade específica
    if (unidadeId) {
      queryUnidades += ' AND id = ?'
      paramsUnidades.push(parseInt(unidadeId))
    }

    queryUnidades += ' ORDER BY nome'

    const unidades = await executeQuery(queryUnidades, paramsUnidades) as any[]

    // Buscar todos os vendedores uma vez
    const todosVendedores = await executeQuery(`
      SELECT id, name, lastName FROM vendedores
    `) as any[]
    const vendedoresMap = new Map(todosVendedores.map(v => [v.id, v]))

    // Processar cada unidade
    const unidadesComResumo = await Promise.all(unidades.map(async (unidade) => {
      // Extrair vendedores da unidade
      const parsedUsers = parseJSON(unidade.users)
      const userIds = parsedUsers
        .map((u: any) => typeof u === 'object' ? u.id : u)
        .filter((id: any) => typeof id === 'number')

      let vendedoresUnidade = userIds
        .map((id: number) => vendedoresMap.get(id))
        .filter(v => v !== undefined)
      
      // Adicionar o gestor se não estiver na lista de vendedores
      if (unidade.user_gestao && !userIds.includes(unidade.user_gestao)) {
        const gestor = vendedoresMap.get(unidade.user_gestao)
        if (gestor) {
          vendedoresUnidade.push(gestor)
        }
      }
      
      // Buscar estatísticas de cada vendedor da unidade
      const matrizVendedores = await Promise.all(vendedoresUnidade.map(async (vendedor: any) => {
        // Oportunidades criadas
        const criadas = await executeQuery(`
          SELECT COUNT(*) as total
          FROM oportunidades
          WHERE user = ?
            AND MONTH(createDate) = ?
            AND YEAR(createDate) = ?
        `, [vendedor.id, mes, ano]) as any[]

        // Oportunidades ganhas
        const ganhas = await executeQuery(`
          SELECT 
            COUNT(*) as total,
            COALESCE(SUM(value), 0) as valor
          FROM oportunidades
          WHERE user = ?
            AND status = 'gain'
            AND MONTH(gain_date) = ?
            AND YEAR(gain_date) = ?
        `, [vendedor.id, mes, ano]) as any[]

        // Oportunidades perdidas
        const perdidas = await executeQuery(`
          SELECT COUNT(*) as total
          FROM oportunidades
          WHERE user = ?
            AND status = 'lost'
            AND MONTH(lost_date) = ?
            AND YEAR(lost_date) = ?
        `, [vendedor.id, mes, ano]) as any[]

        // Oportunidades abertas
        const abertas = await executeQuery(`
          SELECT COUNT(*) as total
          FROM oportunidades
          WHERE user = ?
            AND status IN ('open', 'aberta', 'active')
        `, [vendedor.id]) as any[]

        // Meta do vendedor
        const metaResult = await executeQuery(`
          SELECT COALESCE(meta_valor, 0) as meta
          FROM metas_mensais
          WHERE vendedor_id = ?
            AND unidade_id = ?
            AND mes = ?
            AND ano = ?
            AND status = 'ativa'
        `, [vendedor.id, unidade.id, mes, ano]) as any[]

        // Tempo médio de fechamento (Won Time) - diferença entre createDate e gain_date
        const wonTimeResult = await executeQuery(`
          SELECT AVG(DATEDIFF(gain_date, createDate)) as tempo_medio_dias
          FROM oportunidades
          WHERE user = ?
            AND status = 'gain'
            AND MONTH(gain_date) = ?
            AND YEAR(gain_date) = ?
            AND gain_date IS NOT NULL
            AND createDate IS NOT NULL
        `, [vendedor.id, mes, ano]) as any[]

        return {
          id: vendedor.id,
          nome: vendedor.name,
          criadas: criadas[0]?.total || 0,
          ganhas: ganhas[0]?.total || 0,
          perdidas: perdidas[0]?.total || 0,
          abertas: abertas[0]?.total || 0,
          valor: ganhas[0]?.valor || 0,
          meta: metaResult[0]?.meta || 0,
          won_time_dias: wonTimeResult[0]?.tempo_medio_dias ? Math.round(wonTimeResult[0].tempo_medio_dias) : null,
          isGestor: vendedor.id === unidade.user_gestao
        }
      }))

      // Construir filtro para vendedores da unidade
      let vendedorFilter = ''
      let vendedorParams: any[] = []

      if (vendedorId) {
        // Filtro por vendedor específico
        vendedorFilter = ' AND o.user = ?'
        vendedorParams = [parseInt(vendedorId)]
      } else if (userIds.length > 0) {
        // Filtro por todos os vendedores da unidade
        const placeholders = userIds.map(() => '?').join(',')
        vendedorFilter = ` AND o.user IN (${placeholders})`
        vendedorParams = userIds
      } else {
        // Se não há vendedores, não retornar oportunidades
        return {
          id: unidade.id,
          nome: unidade.nome,
          total_vendedores: 0,
          vendedores_na_fila: 0,
          oportunidades_criadas: 0,
          oportunidades_ganhas: 0,
          valor_ganho: 0,
          oportunidades_perdidas: 0,
          oportunidades_abertas: 0,
          meta_mes: 0
        }
      }

      // Vendedores na fila (contar do campo fila_leads)
      const parsedFilaLeads = parseJSON(unidade.fila_leads)
      const vendedoresNaFila = parsedFilaLeads.length

      // Nome do gestor
      let nomeGestor = null
      if (unidade.user_gestao) {
        const gestor = vendedoresMap.get(unidade.user_gestao)
        if (gestor) {
          nomeGestor = gestor.name
        }
      }

      // Oportunidades criadas no mês
      const oportunidadesCriadas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades o
        WHERE MONTH(o.createDate) = ? 
          AND YEAR(o.createDate) = ?
          ${vendedorFilter}
      `, [mes, ano, ...vendedorParams]) as any[]

      // Oportunidades ganhas no mês
      const oportunidadesGanhas = await executeQuery(`
        SELECT 
          COUNT(*) as total, 
          COALESCE(SUM(o.value), 0) as valor_total
        FROM oportunidades o
        WHERE o.status = 'gain'
          AND MONTH(o.gain_date) = ? 
          AND YEAR(o.gain_date) = ?
          ${vendedorFilter}
      `, [mes, ano, ...vendedorParams]) as any[]

      // Oportunidades perdidas no mês
      const oportunidadesPerdidas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades o
        WHERE o.status = 'lost'
          AND MONTH(o.lost_date) = ? 
          AND YEAR(o.lost_date) = ?
          ${vendedorFilter}
      `, [mes, ano, ...vendedorParams]) as any[]

      // Oportunidades abertas (sem data específica)
      const oportunidadesAbertas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades o
        WHERE o.status IN ('open', 'aberta', 'active')
          ${vendedorFilter}
      `, vendedorParams) as any[]

      // Meta da unidade para o mês
      const metaUnidade = await executeQuery(`
        SELECT COALESCE(SUM(meta_valor), 0) as meta_total
        FROM metas_mensais
        WHERE unidade_id = ? 
          AND mes = ? 
          AND ano = ? 
          AND status = 'ativa'
      `, [unidade.id, mes, ano]) as any[]

      // Comparação mockada (será implementada com dados reais depois)
      const comparacaoMesAnterior = Math.random() * 100 - 30 // Entre -30% e +70%
      const comparacaoAnoAnterior = Math.random() * 150 - 50 // Entre -50% e +100%

      return {
        id: unidade.id,
        nome: unidade.nome,
        total_vendedores: vendedoresUnidade.length,
        vendedores_na_fila: vendedoresNaFila,
        nome_gestor: nomeGestor,
        oportunidades_criadas: oportunidadesCriadas[0]?.total || 0,
        oportunidades_ganhas: oportunidadesGanhas[0]?.total || 0,
        valor_ganho: oportunidadesGanhas[0]?.valor_total || 0,
        oportunidades_perdidas: oportunidadesPerdidas[0]?.total || 0,
        oportunidades_abertas: oportunidadesAbertas[0]?.total || 0,
        meta_mes: metaUnidade[0]?.meta_total || 0,
        vendedores: matrizVendedores,
        comparacao_mes_anterior: comparacaoMesAnterior,
        comparacao_ano_anterior: comparacaoAnoAnterior
      }
    }))

    // Ordenar unidades por valor ganho (maior para menor)
    const unidadesOrdenadas = unidadesComResumo.sort((a, b) => b.valor_ganho - a.valor_ganho)

    return NextResponse.json({
      success: true,
      mes,
      ano,
      unidades: unidadesOrdenadas
    })

  } catch (error) {
    console.error('❌ Erro ao buscar resumo de unidades:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar resumo de unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

