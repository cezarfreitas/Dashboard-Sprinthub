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
    const mes = searchParams.get('mes') ? parseInt(searchParams.get('mes')!) : null
    const ano = searchParams.get('ano') ? parseInt(searchParams.get('ano')!) : null
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const vendedorId = searchParams.get('vendedorId')
    const unidadeId = searchParams.get('unidadeId')

    // Determinar mes/ano para compatibilidade com código existente e para buscar meta
    let mesFinal = mes
    let anoFinal = ano
    if (!mesFinal || !anoFinal) {
      if (dataInicio) {
        // Se tiver dataInicio, usar o mês/ano da data de início
        const dataInicioObj = new Date(dataInicio + ' 00:00:00')
        mesFinal = dataInicioObj.getMonth() + 1
        anoFinal = dataInicioObj.getFullYear()
      } else {
        const hoje = new Date()
        mesFinal = mesFinal || hoje.getMonth() + 1
        anoFinal = anoFinal || hoje.getFullYear()
      }
    }

    // Buscar todas as unidades ativas
    let queryUnidades = `
      SELECT 
        id, 
        COALESCE(nome, name) as nome, 
        users,
        fila_leads,
        user_gestao,
        dpto_gestao
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
    
    // Debug: verificar se há gestores não encontrados
    const unidadesComGestor = unidades.filter(u => u.user_gestao)
    const gestoresNaoEncontrados = unidadesComGestor.filter(u => !vendedoresMap.has(u.user_gestao))
    if (gestoresNaoEncontrados.length > 0) {
      console.warn('⚠️ Gestores não encontrados na tabela vendedores:', gestoresNaoEncontrados.map(u => ({
        unidade_id: u.id,
        unidade_nome: u.nome,
        user_gestao: u.user_gestao
      })))
    }

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
      
      // Separar vendedores do gestor
      const vendedoresSemGestor = vendedoresUnidade.filter(v => v.id !== unidade.user_gestao)
      
      // Adicionar o gestor se não estiver na lista de vendedores (para estatísticas, mas não conta no total)
      let vendedoresComGestor = [...vendedoresSemGestor]
      if (unidade.user_gestao && !userIds.includes(unidade.user_gestao)) {
        const gestor = vendedoresMap.get(unidade.user_gestao)
        if (gestor) {
          vendedoresComGestor.push(gestor)
        }
      }
      
      // Construir filtro de data
      let dataFilter = ''
      let dataParams: any[] = []
      
      if (dataInicio && dataFim) {
        dataFilter = ' AND o.createDate >= ? AND o.createDate <= ?'
        dataParams = [dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
      } else {
        dataFilter = ' AND MONTH(o.createDate) = ? AND YEAR(o.createDate) = ?'
        dataParams = [mesFinal, anoFinal]
      }

      // Buscar estatísticas de cada vendedor da unidade (incluindo gestor para estatísticas)
      const matrizVendedores = await Promise.all(vendedoresComGestor.map(async (vendedor: any) => {
        // Oportunidades criadas
        const criadas = await executeQuery(`
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.user = ?
            ${dataFilter}
        `, [vendedor.id, ...dataParams]) as any[]

        // Oportunidades ganhas (baseado em gain_date - quando foi ganha)
        let ganhasQuery = ''
        let ganhasParams: any[] = [vendedor.id]
        if (dataInicio && dataFim) {
          ganhasQuery = `
            SELECT 
              COUNT(*) as total,
              COALESCE(SUM(value), 0) as valor
            FROM oportunidades o
            WHERE o.user = ?
              AND o.status = 'gain'
              AND o.gain_date >= ? AND o.gain_date <= ?
          `
          ganhasParams = [vendedor.id, dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
        } else {
          ganhasQuery = `
            SELECT 
              COUNT(*) as total,
              COALESCE(SUM(value), 0) as valor
            FROM oportunidades o
            WHERE o.user = ?
              AND o.status = 'gain'
              AND MONTH(o.gain_date) = ? AND YEAR(o.gain_date) = ?
          `
          ganhasParams = [vendedor.id, mesFinal, anoFinal]
        }
        const ganhas = await executeQuery(ganhasQuery, ganhasParams) as any[]

        // Oportunidades perdidas (baseado em lost_date - quando foi perdida)
        let perdidasQuery = ''
        let perdidasParams: any[] = [vendedor.id]
        if (dataInicio && dataFim) {
          perdidasQuery = `
            SELECT COUNT(*) as total
            FROM oportunidades o
            WHERE o.user = ?
              AND o.status = 'lost'
              AND o.lost_date >= ? AND o.lost_date <= ?
          `
          perdidasParams = [vendedor.id, dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
        } else {
          perdidasQuery = `
            SELECT COUNT(*) as total
            FROM oportunidades o
            WHERE o.user = ?
              AND o.status = 'lost'
              AND MONTH(o.lost_date) = ? AND YEAR(o.lost_date) = ?
          `
          perdidasParams = [vendedor.id, mesFinal, anoFinal]
        }
        const perdidas = await executeQuery(perdidasQuery, perdidasParams) as any[]

        // Oportunidades abertas (criadas no período e ainda abertas)
        let abertasQuery = ''
        let abertasParams: any[] = [vendedor.id]
        if (dataInicio && dataFim) {
          abertasQuery = `
            SELECT COUNT(*) as total
            FROM oportunidades o
            WHERE o.user = ?
              AND o.status IN ('open', 'aberta', 'active')
              AND o.createDate >= ? AND o.createDate <= ?
          `
          abertasParams = [vendedor.id, dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
        } else {
          abertasQuery = `
            SELECT COUNT(*) as total
            FROM oportunidades o
            WHERE o.user = ?
              AND o.status IN ('open', 'aberta', 'active')
              AND MONTH(o.createDate) = ? AND YEAR(o.createDate) = ?
          `
          abertasParams = [vendedor.id, mesFinal, anoFinal]
        }
        const abertas = await executeQuery(abertasQuery, abertasParams) as any[]

        // Meta do vendedor
        const metaResult = await executeQuery(`
          SELECT COALESCE(meta_valor, 0) as meta
          FROM metas_mensais
          WHERE vendedor_id = ?
            AND unidade_id = ?
            AND mes = ?
            AND ano = ?
            AND status = 'ativa'
        `, [vendedor.id, unidade.id, mesFinal, anoFinal]) as any[]

        // Tempo médio de fechamento (Won Time) - diferença entre createDate e gain_date
        // Baseado em gain_date para pegar vendas concluídas no período
        let wonTimeQuery = ''
        let wonTimeParams: any[] = [vendedor.id]
        if (dataInicio && dataFim) {
          wonTimeQuery = `
            SELECT AVG(DATEDIFF(gain_date, createDate)) as tempo_medio_dias
            FROM oportunidades o
            WHERE o.user = ?
              AND o.status = 'gain'
              AND o.gain_date >= ? AND o.gain_date <= ?
              AND o.gain_date IS NOT NULL
              AND o.createDate IS NOT NULL
          `
          wonTimeParams = [vendedor.id, dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
        } else {
          wonTimeQuery = `
            SELECT AVG(DATEDIFF(gain_date, createDate)) as tempo_medio_dias
            FROM oportunidades o
            WHERE o.user = ?
              AND o.status = 'gain'
              AND MONTH(o.gain_date) = ? AND YEAR(o.gain_date) = ?
              AND o.gain_date IS NOT NULL
              AND o.createDate IS NOT NULL
          `
          wonTimeParams = [vendedor.id, mesFinal, anoFinal]
        }
        const wonTimeResult = await executeQuery(wonTimeQuery, wonTimeParams) as any[]

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
      
      // Processar fila de leads com nomes dos vendedores
      let filaLeadsArray: any[] = []
      if (parsedFilaLeads.length > 0) {
        // Buscar distribuições por vendedor
        const distribuicoesResult = await executeQuery(`
          SELECT vendedor_id, COUNT(*) as total_distribuicoes
          FROM fila_leads_log
          WHERE unidade_id = ?
          GROUP BY vendedor_id
        `, [unidade.id]) as any[]
        
        const distribuicoesMap = new Map(
          distribuicoesResult.map(d => [d.vendedor_id, d.total_distribuicoes])
        )
        
        filaLeadsArray = parsedFilaLeads
          .map((item: any) => {
            const vendedorId = item.vendedor_id || item.id
            const vendedor = vendedoresMap.get(vendedorId)
            
            return {
              vendedor_id: vendedorId,
              sequencia: item.sequencia || item.ordem || 0,
              nome: vendedor ? `${vendedor.name} ${vendedor.lastName || ''}`.trim() : undefined,
              total_distribuicoes: distribuicoesMap.get(vendedorId) || 0
            }
          })
          .sort((a, b) => a.sequencia - b.sequencia)
      }

      // Nome do gestor (user_gestao agora é JSON array)
      let nomeGestor = null
      let userGestaoArray: number[] = []
      
      // Parsear user_gestao (pode ser JSON string ou já parseado)
      try {
        const parsed = typeof unidade.user_gestao === 'string' 
          ? JSON.parse(unidade.user_gestao) 
          : unidade.user_gestao
        if (Array.isArray(parsed)) {
          userGestaoArray = parsed
            .map((id: any) => typeof id === 'object' ? id.id : id)
            .filter((id: any) => typeof id === 'number')
        } else if (parsed && typeof parsed === 'number') {
          // Fallback: se ainda for número único, converter para array
          userGestaoArray = [parsed]
        }
      } catch (e) {
        // Ignorar erro de parsing
      }
      
      // Se não tem user_gestao mas tem dpto_gestao, buscar o user_gestao da unidade de gestão
      if (userGestaoArray.length === 0 && unidade.dpto_gestao) {
        const unidadeGestao = await executeQuery(`
          SELECT user_gestao, users FROM unidades WHERE id = ?
        `, [unidade.dpto_gestao]) as any[]
        
        if (unidadeGestao && unidadeGestao.length > 0) {
          const gestao = unidadeGestao[0]
          // Se a unidade de gestão tem user_gestao, usar ele
          if (gestao.user_gestao) {
            try {
              const parsed = typeof gestao.user_gestao === 'string' 
                ? JSON.parse(gestao.user_gestao) 
                : gestao.user_gestao
              if (Array.isArray(parsed)) {
                userGestaoArray = parsed
                  .map((id: any) => typeof id === 'object' ? id.id : id)
                  .filter((id: any) => typeof id === 'number')
              } else if (parsed && typeof parsed === 'number') {
                userGestaoArray = [parsed]
              }
            } catch (e) {
              // Ignorar erro
            }
          } else if (gestao.users) {
            // Se não tem user_gestao mas tem users, pegar todos
            try {
              const usersArray = typeof gestao.users === 'string' ? JSON.parse(gestao.users) : gestao.users
              if (Array.isArray(usersArray) && usersArray.length > 0) {
                userGestaoArray = usersArray
                  .map((u: any) => typeof u === 'object' ? u.id : u)
                  .filter((id: any) => typeof id === 'number')
              }
            } catch (e) {
              // Ignorar erro de parsing
            }
          }
        }
      }
      
      // Buscar nomes de todos os gestores
      if (userGestaoArray.length > 0) {
        const nomesGestores = userGestaoArray
          .map((userId: number) => {
            const gestor = vendedoresMap.get(userId)
            if (gestor) {
              return gestor.lastName 
                ? `${gestor.name} ${gestor.lastName}`.trim() 
                : gestor.name
            } else {
              // Se o gestor não foi encontrado no Map, tentar buscar diretamente
              return null
            }
          })
          .filter((nome: string | null) => nome !== null)
        
        if (nomesGestores.length > 0) {
          nomeGestor = nomesGestores.join(', ')
        }
      }

      // Construir filtro de data para queries agregadas
      let dataFilterAgregado = ''
      let dataParamsAgregado: any[] = []
      
      if (dataInicio && dataFim) {
        dataFilterAgregado = ' AND o.createDate >= ? AND o.createDate <= ?'
        dataParamsAgregado = [dataInicio + ' 00:00:00', dataFim + ' 23:59:59']
      } else {
        dataFilterAgregado = ' AND MONTH(o.createDate) = ? AND YEAR(o.createDate) = ?'
        dataParamsAgregado = [mesFinal, anoFinal]
      }

      // Oportunidades criadas no período
      const oportunidadesCriadas = await executeQuery(`
        SELECT COUNT(*) as total
        FROM oportunidades o
        WHERE 1=1
          ${dataFilterAgregado}
          ${vendedorFilter}
      `, [...dataParamsAgregado, ...vendedorParams]) as any[]

      // Oportunidades criadas no mesmo período do mês anterior (para comparação)
      let oportunidadesCriadasMesAnteriorQuery = ''
      let oportunidadesCriadasMesAnteriorParams: any[] = []
      if (dataInicio && dataFim) {
        // Calcular período anterior (mesmo número de dias)
        const dataInicioObj = new Date(dataInicio + ' 00:00:00')
        const dataFimObj = new Date(dataFim + ' 23:59:59')
        const diasDiferenca = Math.ceil((dataFimObj.getTime() - dataInicioObj.getTime()) / (1000 * 60 * 60 * 24))
        
        const dataInicioAnterior = new Date(dataInicioObj)
        dataInicioAnterior.setMonth(dataInicioAnterior.getMonth() - 1)
        const dataFimAnterior = new Date(dataInicioAnterior)
        dataFimAnterior.setDate(dataFimAnterior.getDate() + diasDiferenca)
        
        const formatarData = (data: Date) => {
          const ano = data.getFullYear()
          const mes = String(data.getMonth() + 1).padStart(2, '0')
          const dia = String(data.getDate()).padStart(2, '0')
          return `${ano}-${mes}-${dia}`
        }
        
        oportunidadesCriadasMesAnteriorQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.createDate >= ? AND o.createDate <= ?
            ${vendedorFilter}
        `
        oportunidadesCriadasMesAnteriorParams = [formatarData(dataInicioAnterior) + ' 00:00:00', formatarData(dataFimAnterior) + ' 23:59:59', ...vendedorParams]
      } else {
        // Para mês/ano, buscar mês anterior
        const mesAnterior = mesFinal === 1 ? 12 : mesFinal - 1
        const anoAnterior = mesFinal === 1 ? anoFinal - 1 : anoFinal
        
        oportunidadesCriadasMesAnteriorQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE MONTH(o.createDate) = ? AND YEAR(o.createDate) = ?
            ${vendedorFilter}
        `
        oportunidadesCriadasMesAnteriorParams = [mesAnterior, anoAnterior, ...vendedorParams]
      }
      const oportunidadesCriadasMesAnterior = await executeQuery(oportunidadesCriadasMesAnteriorQuery, oportunidadesCriadasMesAnteriorParams) as any[]
      
      // Calcular percentual de crescimento
      const totalCriadas = Number(oportunidadesCriadas[0]?.total) || 0
      const totalCriadasAnterior = Number(oportunidadesCriadasMesAnterior[0]?.total) || 0
      let crescimentoPercentual = 0
      if (totalCriadasAnterior > 0) {
        crescimentoPercentual = ((totalCriadas - totalCriadasAnterior) / totalCriadasAnterior) * 100
      } else if (totalCriadas > 0) {
        crescimentoPercentual = 100
      }
      if (isNaN(crescimentoPercentual)) crescimentoPercentual = 0

      // Oportunidades ganhas no período atual (baseado em gain_date)
      let ganhasNoPeriodoQuery = ''
      let ganhasNoPeriodoParams: any[] = []
      if (dataInicio && dataFim) {
        ganhasNoPeriodoQuery = `
          SELECT 
            COUNT(*) as total, 
            COALESCE(SUM(o.value), 0) as valor_total,
            COALESCE(MAX(o.value), 0) as maior_valor,
            COALESCE(MIN(o.value), 0) as menor_valor
          FROM oportunidades o
          WHERE o.status = 'gain'
            AND o.gain_date >= ? AND o.gain_date <= ?
            ${vendedorFilter}
        `
        ganhasNoPeriodoParams = [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...vendedorParams]
      } else {
        ganhasNoPeriodoQuery = `
          SELECT 
            COUNT(*) as total, 
            COALESCE(SUM(o.value), 0) as valor_total,
            COALESCE(MAX(o.value), 0) as maior_valor,
            COALESCE(MIN(o.value), 0) as menor_valor
          FROM oportunidades o
          WHERE o.status = 'gain'
            AND MONTH(o.gain_date) = ? AND YEAR(o.gain_date) = ?
            ${vendedorFilter}
        `
        ganhasNoPeriodoParams = [mesFinal, anoFinal, ...vendedorParams]
      }
      const ganhasNoPeriodo = await executeQuery(ganhasNoPeriodoQuery, ganhasNoPeriodoParams) as any[]

      // Oportunidades ganhas no período anterior (para comparação)
      let ganhasPeriodoAnteriorQuery = ''
      let ganhasPeriodoAnteriorParams: any[] = []
      if (dataInicio && dataFim) {
        const dataInicioObj = new Date(dataInicio + ' 00:00:00')
        const dataFimObj = new Date(dataFim + ' 23:59:59')
        const diasDiferenca = Math.ceil((dataFimObj.getTime() - dataInicioObj.getTime()) / (1000 * 60 * 60 * 24))
        
        const dataInicioAnterior = new Date(dataInicioObj)
        dataInicioAnterior.setMonth(dataInicioAnterior.getMonth() - 1)
        const dataFimAnterior = new Date(dataInicioAnterior)
        dataFimAnterior.setDate(dataFimAnterior.getDate() + diasDiferenca)
        
        const formatarData = (data: Date) => {
          const ano = data.getFullYear()
          const mes = String(data.getMonth() + 1).padStart(2, '0')
          const dia = String(data.getDate()).padStart(2, '0')
          return `${ano}-${mes}-${dia}`
        }
        
        ganhasPeriodoAnteriorQuery = `
          SELECT 
            COUNT(*) as total,
            COALESCE(SUM(o.value), 0) as valor_total
          FROM oportunidades o
          WHERE o.status = 'gain'
            AND o.gain_date >= ? AND o.gain_date <= ?
            ${vendedorFilter}
        `
        ganhasPeriodoAnteriorParams = [formatarData(dataInicioAnterior) + ' 00:00:00', formatarData(dataFimAnterior) + ' 23:59:59', ...vendedorParams]
      } else {
        const mesAnterior = mesFinal === 1 ? 12 : mesFinal - 1
        const anoAnterior = mesFinal === 1 ? anoFinal - 1 : anoFinal
        
        ganhasPeriodoAnteriorQuery = `
          SELECT 
            COUNT(*) as total,
            COALESCE(SUM(o.value), 0) as valor_total
          FROM oportunidades o
          WHERE o.status = 'gain'
            AND MONTH(o.gain_date) = ? AND YEAR(o.gain_date) = ?
            ${vendedorFilter}
        `
        ganhasPeriodoAnteriorParams = [mesAnterior, anoAnterior, ...vendedorParams]
      }
      const ganhasPeriodoAnterior = await executeQuery(ganhasPeriodoAnteriorQuery, ganhasPeriodoAnteriorParams) as any[]

      // Total de ganhas (baseado em gain_date)
      const totalGanhas = Number(ganhasNoPeriodo[0]?.total || 0)
      const valorTotalGanhas = Number(ganhasNoPeriodo[0]?.valor_total || 0)
      const totalGanhasAnterior = Number(ganhasPeriodoAnterior[0]?.total || 0)
      
      // Calcular percentual de crescimento de ganhas
      let crescimentoGanhasPercentual = 0
      if (totalGanhasAnterior > 0) {
        crescimentoGanhasPercentual = ((totalGanhas - totalGanhasAnterior) / totalGanhasAnterior) * 100
      } else if (totalGanhas > 0) {
        crescimentoGanhasPercentual = 100
      }
      if (isNaN(crescimentoGanhasPercentual)) crescimentoGanhasPercentual = 0
      
      const oportunidadesGanhas = [{
        total: totalGanhas,
        valor_total: isNaN(valorTotalGanhas) ? 0 : valorTotalGanhas,
        maior_valor: Number(ganhasNoPeriodo[0]?.maior_valor) || 0,
        menor_valor: Number(ganhasNoPeriodo[0]?.menor_valor) || 0
      }]

      // Oportunidades perdidas no período atual (baseado em lost_date)
      let perdidasNoPeriodoQuery = ''
      let perdidasNoPeriodoParams: any[] = []
      if (dataInicio && dataFim) {
        perdidasNoPeriodoQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.status = 'lost'
            AND o.lost_date >= ? AND o.lost_date <= ?
            ${vendedorFilter}
        `
        perdidasNoPeriodoParams = [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...vendedorParams]
      } else {
        perdidasNoPeriodoQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.status = 'lost'
            AND MONTH(o.lost_date) = ? AND YEAR(o.lost_date) = ?
            ${vendedorFilter}
        `
        perdidasNoPeriodoParams = [mesFinal, anoFinal, ...vendedorParams]
      }
      const perdidasNoPeriodo = await executeQuery(perdidasNoPeriodoQuery, perdidasNoPeriodoParams) as any[]

      // Oportunidades perdidas no período anterior (para comparação)
      let perdidasPeriodoAnteriorQuery = ''
      let perdidasPeriodoAnteriorParams: any[] = []
      if (dataInicio && dataFim) {
        const dataInicioObj = new Date(dataInicio + ' 00:00:00')
        const dataFimObj = new Date(dataFim + ' 23:59:59')
        const diasDiferenca = Math.ceil((dataFimObj.getTime() - dataInicioObj.getTime()) / (1000 * 60 * 60 * 24))
        
        const dataInicioAnterior = new Date(dataInicioObj)
        dataInicioAnterior.setMonth(dataInicioAnterior.getMonth() - 1)
        const dataFimAnterior = new Date(dataInicioAnterior)
        dataFimAnterior.setDate(dataFimAnterior.getDate() + diasDiferenca)
        
        const formatarData = (data: Date) => {
          const ano = data.getFullYear()
          const mes = String(data.getMonth() + 1).padStart(2, '0')
          const dia = String(data.getDate()).padStart(2, '0')
          return `${ano}-${mes}-${dia}`
        }
        
        perdidasPeriodoAnteriorQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.status = 'lost'
            AND o.lost_date >= ? AND o.lost_date <= ?
            ${vendedorFilter}
        `
        perdidasPeriodoAnteriorParams = [formatarData(dataInicioAnterior) + ' 00:00:00', formatarData(dataFimAnterior) + ' 23:59:59', ...vendedorParams]
      } else {
        const mesAnterior = mesFinal === 1 ? 12 : mesFinal - 1
        const anoAnterior = mesFinal === 1 ? anoFinal - 1 : anoFinal
        
        perdidasPeriodoAnteriorQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.status = 'lost'
            AND MONTH(o.lost_date) = ? AND YEAR(o.lost_date) = ?
            ${vendedorFilter}
        `
        perdidasPeriodoAnteriorParams = [mesAnterior, anoAnterior, ...vendedorParams]
      }
      const perdidasPeriodoAnterior = await executeQuery(perdidasPeriodoAnteriorQuery, perdidasPeriodoAnteriorParams) as any[]

      // Total de perdidas (baseado em lost_date)
      const totalPerdidas = Number(perdidasNoPeriodo[0]?.total || 0)
      const totalPerdidasAnterior = Number(perdidasPeriodoAnterior[0]?.total || 0)
      
      // Calcular percentual de crescimento de perdidas
      let crescimentoPerdidasPercentual = 0
      if (totalPerdidasAnterior > 0) {
        crescimentoPerdidasPercentual = ((totalPerdidas - totalPerdidasAnterior) / totalPerdidasAnterior) * 100
      } else if (totalPerdidas > 0) {
        crescimentoPerdidasPercentual = 100
      }
      if (isNaN(crescimentoPerdidasPercentual)) crescimentoPerdidasPercentual = 0
      
      const oportunidadesPerdidas = [{
        total: totalPerdidas
      }]

      // Oportunidades abertas criadas no período atual
      let abertasCriadasNoPeriodoQuery = ''
      let abertasCriadasNoPeriodoParams: any[] = []
      if (dataInicio && dataFim) {
        abertasCriadasNoPeriodoQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.status IN ('open', 'aberta', 'active')
            AND o.createDate >= ? AND o.createDate <= ?
            ${vendedorFilter}
        `
        abertasCriadasNoPeriodoParams = [dataInicio + ' 00:00:00', dataFim + ' 23:59:59', ...vendedorParams]
      } else {
        abertasCriadasNoPeriodoQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.status IN ('open', 'aberta', 'active')
            AND MONTH(o.createDate) = ? AND YEAR(o.createDate) = ?
            ${vendedorFilter}
        `
        abertasCriadasNoPeriodoParams = [mesFinal, anoFinal, ...vendedorParams]
      }
      const abertasCriadasNoPeriodo = await executeQuery(abertasCriadasNoPeriodoQuery, abertasCriadasNoPeriodoParams) as any[]

      // Oportunidades abertas criadas em período anterior (ainda abertas)
      let abertasCriadasPeriodoAnteriorQuery = ''
      let abertasCriadasPeriodoAnteriorParams: any[] = []
      if (dataInicio && dataFim) {
        abertasCriadasPeriodoAnteriorQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.status IN ('open', 'aberta', 'active')
            AND o.createDate < ?
            ${vendedorFilter}
        `
        abertasCriadasPeriodoAnteriorParams = [dataInicio + ' 00:00:00', ...vendedorParams]
      } else {
        const primeiroDiaMes = new Date(anoFinal, mesFinal - 1, 1)
        abertasCriadasPeriodoAnteriorQuery = `
          SELECT COUNT(*) as total
          FROM oportunidades o
          WHERE o.status IN ('open', 'aberta', 'active')
            AND o.createDate < ?
            ${vendedorFilter}
        `
        abertasCriadasPeriodoAnteriorParams = [primeiroDiaMes.toISOString().split('T')[0] + ' 00:00:00', ...vendedorParams]
      }
      const abertasCriadasPeriodoAnterior = await executeQuery(abertasCriadasPeriodoAnteriorQuery, abertasCriadasPeriodoAnteriorParams) as any[]

      // Total de abertas (para compatibilidade)
      const oportunidadesAbertas = [{
        total: (abertasCriadasNoPeriodo[0]?.total || 0) + (abertasCriadasPeriodoAnterior[0]?.total || 0)
      }]

      // Meta da unidade para o mês
      const metaUnidade = await executeQuery(`
        SELECT COALESCE(SUM(meta_valor), 0) as meta_total
        FROM metas_mensais
        WHERE unidade_id = ? 
          AND mes = ? 
          AND ano = ? 
          AND status = 'ativa'
      `, [unidade.id, mesFinal, anoFinal]) as any[]

      // Comparação mockada (será implementada com dados reais depois)
      const comparacaoMesAnterior = Math.random() * 100 - 30 // Entre -30% e +70%
      const comparacaoAnoAnterior = Math.random() * 150 - 50 // Entre -50% e +100%

      return {
        id: unidade.id,
        nome: unidade.nome,
        total_vendedores: vendedoresSemGestor.length,
        vendedores_na_fila: vendedoresNaFila,
        nome_gestor: nomeGestor,
        oportunidades_criadas: oportunidadesCriadas[0]?.total || 0,
        oportunidades_criadas_mes_anterior: oportunidadesCriadasMesAnterior[0]?.total || 0,
        crescimento_criadas_percentual: Number(crescimentoPercentual) || 0,
        oportunidades_ganhas: Number(oportunidadesGanhas[0]?.total) || 0,
        valor_ganho: Number(oportunidadesGanhas[0]?.valor_total) || 0,
        maior_valor_ganho: Number(oportunidadesGanhas[0]?.maior_valor) || 0,
        menor_valor_ganho: Number(oportunidadesGanhas[0]?.menor_valor) || 0,
        ganhas_criadas_no_periodo: totalGanhas, // Atual
        ganhas_criadas_periodo_anterior: totalGanhasAnterior, // Anterior
        crescimento_ganhas_percentual: Number(crescimentoGanhasPercentual) || 0,
        oportunidades_perdidas: oportunidadesPerdidas[0]?.total || 0,
        perdidas_criadas_no_periodo: totalPerdidas, // Atual
        perdidas_criadas_periodo_anterior: totalPerdidasAnterior, // Anterior
        crescimento_perdidas_percentual: Number(crescimentoPerdidasPercentual) || 0,
        oportunidades_abertas: oportunidadesAbertas[0]?.total || 0,
        abertas_criadas_no_periodo: abertasCriadasNoPeriodo[0]?.total || 0,
        abertas_criadas_periodo_anterior: abertasCriadasPeriodoAnterior[0]?.total || 0,
        meta_mes: Number(metaUnidade[0]?.meta_total) || 0,
        vendedores: matrizVendedores,
        comparacao_mes_anterior: comparacaoMesAnterior,
        comparacao_ano_anterior: comparacaoAnoAnterior,
        fila_leads: filaLeadsArray
      }
    }))

    // Ordenar unidades por valor ganho (maior para menor)
    const unidadesOrdenadas = unidadesComResumo.sort((a, b) => b.valor_ganho - a.valor_ganho)

    return NextResponse.json({
      success: true,
      mes: mesFinal,
      ano: anoFinal,
      dataInicio: dataInicio || null,
      dataFim: dataFim || null,
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

